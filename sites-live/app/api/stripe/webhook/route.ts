import type Stripe from "stripe";
import { requireDatabase, runtimeEnv } from "@/lib/runtime";
import { getStripe } from "@/lib/stripe";
import { ensureDatabaseSchema } from "@/lib/database";
import { expirePaidProBySubscription, unlockPaidPro } from "@/lib/profiles";

type WebhookCartItem = { id: string; quantity: number };

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = runtimeEnv.STRIPE_WEBHOOK_SECRET?.trim();
  if (!signature || !webhookSecret?.startsWith("whsec_")) return new Response("Webhook unavailable", { status: 503 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
      300,
      (await import("stripe")).default.createSubtleCryptoProvider(),
    );
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object;
    if (session.payment_status === "paid" || event.type === "checkout.session.async_payment_succeeded") {
      if (session.metadata?.source === "taplex-pro") {
        await recordPaidProSubscription(session);
      } else {
        await recordPaidOrder(session);
      }
    }
  }
  if (event.type === "customer.subscription.updated") {
    await syncSubscription(event.data.object);
  }
  if (event.type === "customer.subscription.deleted") {
    await cancelSubscription(event.data.object);
  }

  return Response.json({ received: true });
}

async function recordPaidProSubscription(session: Stripe.Checkout.Session) {
  const ownerEmail = session.metadata?.ownerEmail?.trim().toLowerCase();
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  if (!ownerEmail || !subscriptionId) return;

  let subscription: Stripe.Subscription | null = null;
  try {
    subscription = await getStripe().subscriptions.retrieve(subscriptionId);
  } catch {
    subscription = null;
  }

  await unlockPaidPro({
    ownerEmail,
    stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
    stripeSubscriptionId: subscriptionId,
    expiresAt: subscriptionPeriodEnd(subscription) ?? fallbackProExpiry(session.metadata?.proPlan),
  });
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const subscriptionId = subscription.id;
  const ownerEmail = subscription.metadata?.ownerEmail?.trim().toLowerCase();
  if (!subscriptionId) return;

  if (["active", "trialing", "past_due"].includes(subscription.status)) {
    if (!ownerEmail) return;
    await unlockPaidPro({
      ownerEmail,
      stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id ?? null,
      stripeSubscriptionId: subscriptionId,
      expiresAt: subscriptionPeriodEnd(subscription) ?? fallbackProExpiry(subscription.metadata?.proPlan),
    });
    return;
  }

  if (["canceled", "unpaid", "incomplete_expired"].includes(subscription.status)) {
    await expirePaidProBySubscription(subscriptionId);
  }
}

async function cancelSubscription(subscription: Stripe.Subscription) {
  if (subscription.id) await expirePaidProBySubscription(subscription.id);
}

function subscriptionPeriodEnd(subscription: Stripe.Subscription | null) {
  const currentPeriodEnd = (subscription as unknown as { current_period_end?: number } | null)?.current_period_end;
  return typeof currentPeriodEnd === "number" ? new Date(currentPeriodEnd * 1000).toISOString() : null;
}

function fallbackProExpiry(plan: unknown) {
  const days = plan === "yearly" ? 366 : 31;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function recordPaidOrder(session: Stripe.Checkout.Session) {
  await ensureDatabaseSchema();
  const cartJson = session.metadata?.cart ?? "[]";
  let cart: WebhookCartItem[];
  try {
    const parsed = JSON.parse(cartJson) as unknown;
    if (!Array.isArray(parsed)) return;
    cart = parsed.filter((item): item is WebhookCartItem => {
      if (!item || typeof item !== "object") return false;
      const value = item as Partial<WebhookCartItem>;
      return typeof value.id === "string" && /^[0-9a-f-]{36}$/.test(value.id) && Number.isInteger(value.quantity) && Number(value.quantity) > 0;
    });
  } catch {
    return;
  }

  const db = requireDatabase();
  const inserted = await db.prepare(`
    INSERT OR IGNORE INTO orders
      (id, checkout_session_id, status, amount_total, currency, customer_email, cart_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    crypto.randomUUID(),
    session.id,
    session.payment_status,
    session.amount_total ?? 0,
    session.currency ?? "usd",
    session.customer_details?.email ?? null,
    cartJson,
  ).run();

  if ((inserted.meta.changes ?? 0) < 1 || cart.length < 1) return;

  await db.batch(cart.map((item) => db.prepare(`
    UPDATE products
    SET inventory = CASE WHEN track_inventory = 1 THEN MAX(0, inventory - ?) ELSE inventory END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).bind(item.quantity, item.id)));
}

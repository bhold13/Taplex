import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { getStripe, paymentsConfigured } from "@/lib/stripe";
import { ensureDatabaseSchema } from "@/lib/database";

type CartItemInput = { productId?: unknown; quantity?: unknown };

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ownOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if ((origin && origin !== ownOrigin) || request.headers.get("sec-fetch-site") === "cross-site") {
    return Response.json({ error: "Cross-site checkout request rejected." }, { status: 403 });
  }

  if (!paymentsConfigured()) {
    return Response.json({ error: "Secure card checkout is being connected. Please use the Instagram order option for now." }, { status: 503 });
  }

  try {
    await ensureDatabaseSchema();
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("application/json")) return Response.json({ error: "Invalid checkout request." }, { status: 415 });

    const payload = await request.json() as { items?: CartItemInput[] };
    if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 8) {
      return Response.json({ error: "Choose between 1 and 8 products." }, { status: 400 });
    }

    const merged = new Map<string, number>();
    for (const item of payload.items) {
      const productId = typeof item.productId === "string" ? item.productId : "";
      const quantity = Number(item.quantity);
      if (!/^[0-9a-f-]{36}$/.test(productId) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        return Response.json({ error: "Invalid cart item." }, { status: 400 });
      }
      merged.set(productId, (merged.get(productId) ?? 0) + quantity);
    }

    const ids = [...merged.keys()];
    const rows = await getDb().select().from(products).where(inArray(products.id, ids));
    const catalog = new Map(rows.map((product) => [product.id, product]));
    if (catalog.size !== ids.length) return Response.json({ error: "A selected product is no longer available." }, { status: 409 });

    const cart = ids.map((id) => {
      const product = catalog.get(id)!;
      const quantity = merged.get(id)!;
      if (!product.active || (product.trackInventory && product.inventory < quantity)) {
        throw new Error(`${product.name} does not have enough inventory.`);
      }
      return { id, quantity, product };
    });

    const metadataCart = JSON.stringify(cart.map(({ id, quantity }) => ({ id, quantity })));
    if (metadataCart.length > 500) return Response.json({ error: "Cart is too large." }, { status: 400 });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "pay",
      customer_creation: "always",
      billing_address_collection: "auto",
      shipping_address_collection: { allowed_countries: ["US"] },
      phone_number_collection: { enabled: true },
      allow_promotion_codes: true,
      success_url: `${ownOrigin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${ownOrigin}/order`,
      metadata: { cart: metadataCart, source: "taplex-store" },
      payment_intent_data: { metadata: { cart: metadataCart, source: "taplex-store" } },
      line_items: cart.map(({ product, quantity }) => ({
        quantity,
        price_data: {
          currency: product.currency,
          unit_amount: product.priceCents,
          product_data: {
            name: product.name,
            description: product.description.slice(0, 200) || undefined,
            images: product.imageKey ? [`${ownOrigin}/api/media/${encodeURIComponent(product.imageKey)}`] : undefined,
          },
        },
      })),
    });

    if (!session.url) throw new Error("Stripe did not return a checkout page.");
    return Response.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Checkout could not be started.";
    const safeMessage = message.includes("inventory") || message.includes("available") ? message : "Secure checkout could not be started. Please try again.";
    return Response.json({ error: safeMessage }, { status: 400 });
  }
}

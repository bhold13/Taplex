import { authorizeProfileApi } from "@/lib/profile-auth";
import { getStripe, paymentsConfigured } from "@/lib/stripe";

type ProPlan = "monthly" | "yearly";

const PRO_PRICES: Record<ProPlan, { label: string; amount: number; interval: "month" | "year" }> = {
  monthly: { label: "TapLex Pro Monthly", amount: 299, interval: "month" },
  yearly: { label: "TapLex Pro Yearly", amount: 3588, interval: "year" },
};

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;

  if (!paymentsConfigured()) {
    return Response.json({ error: "TapLex Pro checkout is being connected." }, { status: 503 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.startsWith("application/json")) {
      return Response.json({ error: "Invalid Pro checkout request." }, { status: 415 });
    }

    const body = await request.json() as { plan?: unknown };
    const plan = body.plan === "yearly" ? "yearly" : "monthly";
    const price = PRO_PRICES[plan];
    const origin = new URL(request.url).origin;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: auth.user.email,
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?pro=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard?pro=cancel`,
      metadata: {
        source: "taplex-pro",
        ownerEmail: auth.user.email,
        proPlan: plan,
      },
      subscription_data: {
        metadata: {
          source: "taplex-pro",
          ownerEmail: auth.user.email,
          proPlan: plan,
        },
      },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: price.amount,
          recurring: { interval: price.interval },
          product_data: {
            name: price.label,
            description: "Unlock unlimited TapLex links, socials, booking services, location tools, and Pro profile features.",
          },
        },
      }],
    });

    if (!session.url) throw new Error("Stripe did not return a checkout page.");
    return Response.json({ url: session.url });
  } catch {
    return Response.json({ error: "TapLex Pro checkout could not be started. Please try again." }, { status: 400 });
  }
}

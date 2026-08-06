import Stripe from "stripe";
import { runtimeEnv } from "@/lib/runtime";

export const STRIPE_API_VERSION = "2026-02-25.clover" as const;

export function paymentsConfigured() {
  return Boolean(runtimeEnv.STRIPE_SECRET_KEY?.startsWith("sk_"));
}

export function getStripe() {
  const secretKey = runtimeEnv.STRIPE_SECRET_KEY?.trim();
  if (!secretKey || !secretKey.startsWith("sk_")) {
    throw new Error("Stripe payments are not connected yet.");
  }

  return new Stripe(secretKey, {
    // Keep the production API contract pinned. Stripe types only its newest
    // API version even though the client accepts older explicit versions.
    apiVersion: STRIPE_API_VERSION as Stripe.LatestApiVersion,
    httpClient: Stripe.createFetchHttpClient(),
  });
}

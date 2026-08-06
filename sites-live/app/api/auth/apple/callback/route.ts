import { appleDisplayName, exchangeAppleCode, verifyAppleIdentityToken } from "@/lib/apple-auth";
import { safeReturnPath } from "@/lib/return-path";
import { cookieValue, sessionCookie, upsertAppleUser } from "@/lib/taplex-auth";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const form = await request.formData();
  const state = String(form.get("state") ?? "");
  const code = String(form.get("code") ?? "");
  const cookies = request.headers.get("cookie");
  const expectedState = cookieValue(cookies, "taplex_apple_state");
  const nonce = cookieValue(cookies, "taplex_apple_nonce");
  const returnTo = safeReturnPath(cookieValue(cookies, "taplex_apple_return"));
  if (!state || !expectedState || state !== expectedState || !nonce || !code) return fail(request, "Apple sign-in could not be verified.");
  try {
    const redirectUri = new URL("/api/auth/apple/callback", request.url).toString();
    const idToken = await exchangeAppleCode(code, redirectUri);
    const identity = await verifyAppleIdentityToken(idToken, nonce);
    const name = appleDisplayName(typeof form.get("user") === "string" ? String(form.get("user")) : null, identity.email);
    const token = await upsertAppleUser({ ...identity, name });
    const headers = new Headers({ Location: returnTo, "Cache-Control": "no-store" });
    headers.append("Set-Cookie", sessionCookie(token, url.protocol === "https:"));
    for (const cookie of ["taplex_apple_state", "taplex_apple_nonce", "taplex_apple_return"]) headers.append("Set-Cookie", clearAppleCookie(cookie));
    return new Response(null, { status: 303, headers });
  } catch (error) {
    return fail(request, error instanceof Error ? error.message : "Apple sign-in failed.");
  }
}

function fail(request: Request, message: string) {
  return Response.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.url), 303);
}

function clearAppleCookie(name: string) {
  return `${name}=; Path=/api/auth/apple; HttpOnly; Secure; SameSite=None; Max-Age=0`;
}

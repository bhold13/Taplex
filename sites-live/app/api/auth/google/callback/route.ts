import { cookieValue, sessionCookie, upsertGoogleUser } from "@/lib/taplex-auth";
import { runtimeEnv } from "@/lib/runtime";
import { profileSkinFromReturnPath } from "@/lib/profile-model";
import { getOrCreateProfile, redeemFounderCode } from "@/lib/profiles";
import { safeReturnPath } from "@/lib/return-path";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const cookies = request.headers.get("cookie");
  const expectedState = cookieValue(cookies, "taplex_google_state");
  const verifier = cookieValue(cookies, "taplex_google_verifier");
  const promoCode = cookieValue(cookies, "taplex_google_promo");
  const returnTo = safeReturnPath(cookieValue(cookies, "taplex_google_return"));
  const clientId = runtimeEnv.GOOGLE_CLIENT_ID;
  const clientSecret = runtimeEnv.GOOGLE_CLIENT_SECRET;
  if (!state || !expectedState || state !== expectedState || !code || !verifier || !clientId || !clientSecret) return fail(request, "Google sign-in could not be verified.");
  try {
    const redirectUri = new URL("/api/auth/google/callback", request.url).toString();
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: verifier }),
    });
    const tokens = await tokenResponse.json() as { access_token?: string };
    if (!tokenResponse.ok || !tokens.access_token) throw new Error("Google token exchange failed.");
    const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
    const googleUser = await userResponse.json() as { sub?: string; email?: string; email_verified?: boolean; name?: string };
    if (!userResponse.ok || !googleUser.sub || !googleUser.email || googleUser.email_verified !== true) throw new Error("Google account email is not verified.");
    const name = googleUser.name ?? googleUser.email.split("@")[0];
    const token = await upsertGoogleUser({ sub: googleUser.sub, email: googleUser.email, name });
    if (promoCode) {
      await getOrCreateProfile({ email: googleUser.email, displayName: name, fullName: name, authSource: "google" }, profileSkinFromReturnPath(returnTo) ?? undefined);
      await redeemFounderCode(googleUser.email, promoCode);
    }
    const secure = url.protocol === "https:";
    const headers = new Headers({ Location: returnTo, "Cache-Control": "no-store" });
    headers.append("Set-Cookie", sessionCookie(token, secure));
    headers.append("Set-Cookie", clearOauthCookie("taplex_google_state", secure));
    headers.append("Set-Cookie", clearOauthCookie("taplex_google_verifier", secure));
    headers.append("Set-Cookie", clearOauthCookie("taplex_google_promo", secure));
    headers.append("Set-Cookie", clearOauthCookie("taplex_google_return", secure));
    return new Response(null, { status: 303, headers });
  } catch (error) {
    return fail(request, error instanceof Error ? error.message : "Google sign-in failed.");
  }
}

function fail(request: Request, message: string) {
  return Response.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.url), 303);
}

function clearOauthCookie(name: string, secure: boolean) {
  return `${name}=; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

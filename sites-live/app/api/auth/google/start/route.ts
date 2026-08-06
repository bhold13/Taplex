import { runtimeEnv } from "@/lib/runtime";
import { assertFounderCodeAvailable } from "@/lib/profiles";
import { safeReturnPath } from "@/lib/return-path";

export async function GET(request: Request) {
  const clientId = runtimeEnv.GOOGLE_CLIENT_ID;
  if (!clientId) return Response.redirect(new URL("/login?error=Google+sign-in+needs+the+TapLex+Google+client+ID+added+to+hosting.", request.url), 303);
  const requestedPromo = new URL(request.url).searchParams.get("promo")?.trim() ?? "";
  const returnTo = safeReturnPath(new URL(request.url).searchParams.get("return_to"));
  let promoCode = "";
  if (requestedPromo) {
    try { promoCode = await assertFounderCodeAvailable(requestedPromo); }
    catch (error) {
      const target = new URL("/signup", request.url);
      target.searchParams.set("error", error instanceof Error ? error.message : "That access code is not valid.");
      target.searchParams.set("return_to", returnTo);
      return Response.redirect(target, 303);
    }
  }
  const state = randomValue(24);
  const verifier = randomValue(48);
  const challenge = await sha256Url(verifier);
  const callback = new URL("/api/auth/google/callback", request.url).toString();
  const target = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  target.search = new URLSearchParams({ client_id: clientId, redirect_uri: callback, response_type: "code", scope: "openid email profile", state, code_challenge: challenge, code_challenge_method: "S256", prompt: "select_account" }).toString();
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  const headers = new Headers({ Location: target.toString(), "Cache-Control": "no-store" });
  headers.append("Set-Cookie", `taplex_google_state=${state}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=600${secure}`);
  headers.append("Set-Cookie", `taplex_google_verifier=${verifier}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=600${secure}`);
  headers.append("Set-Cookie", `taplex_google_return=${encodeURIComponent(returnTo)}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=600${secure}`);
  if (promoCode) headers.append("Set-Cookie", `taplex_google_promo=${encodeURIComponent(promoCode)}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=600${secure}`);
  return new Response(null, { status: 302, headers });
}

function randomValue(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Url(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

import { appleAuthConfigured } from "@/lib/apple-auth";
import { safeReturnPath } from "@/lib/return-path";
import { runtimeEnv } from "@/lib/runtime";
import { secureRandomToken } from "@/lib/security";

export async function GET(request: Request) {
  if (!appleAuthConfigured()) return Response.redirect(new URL("/login?error=Apple+sign-in+is+being+connected.+Use+Google+or+email+for+now.", request.url), 303);
  if (new URL(request.url).protocol !== "https:") return Response.redirect(new URL("/login?error=Apple+sign-in+requires+the+secure+TapLex+domain.", request.url), 303);
  const state = secureRandomToken(24);
  const nonce = secureRandomToken(24);
  const returnTo = safeReturnPath(new URL(request.url).searchParams.get("return_to"));
  const redirectUri = new URL("/api/auth/apple/callback", request.url).toString();
  const target = new URL("https://appleid.apple.com/auth/authorize");
  target.search = new URLSearchParams({ client_id: runtimeEnv.APPLE_CLIENT_ID!, redirect_uri: redirectUri, response_type: "code", response_mode: "form_post", scope: "name email", state, nonce }).toString();
  const headers = new Headers({ Location: target.toString(), "Cache-Control": "no-store" });
  headers.append("Set-Cookie", appleCookie("taplex_apple_state", state));
  headers.append("Set-Cookie", appleCookie("taplex_apple_nonce", nonce));
  headers.append("Set-Cookie", appleCookie("taplex_apple_return", encodeURIComponent(returnTo)));
  return new Response(null, { status: 302, headers });
}

function appleCookie(name: string, value: string) {
  return `${name}=${value}; Path=/api/auth/apple; HttpOnly; Secure; SameSite=None; Max-Age=600`;
}

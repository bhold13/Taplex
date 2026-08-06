import { runtimeEnv } from "@/lib/runtime";
import { base64UrlToBytes, bytesToBase64Url, cleanSingleLine } from "@/lib/security";

type AppleClaims = {
  iss?: string;
  aud?: string | string[];
  exp?: number;
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  nonce?: string;
};

export function appleAuthConfigured() {
  return Boolean(runtimeEnv.APPLE_CLIENT_ID && runtimeEnv.APPLE_TEAM_ID && runtimeEnv.APPLE_KEY_ID && runtimeEnv.APPLE_PRIVATE_KEY);
}

export async function exchangeAppleCode(code: string, redirectUri: string) {
  if (!appleAuthConfigured()) throw new Error("Apple sign-in is not configured yet.");
  const clientSecret = await createAppleClientSecret();
  const response = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: runtimeEnv.APPLE_CLIENT_ID!,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const body = await response.json() as { id_token?: string; error?: string };
  if (!response.ok || !body.id_token) throw new Error(body.error === "invalid_grant" ? "This Apple sign-in request expired. Please try again." : "Apple sign-in could not be completed.");
  return body.id_token;
}

export async function verifyAppleIdentityToken(token: string, expectedNonce: string): Promise<Required<Pick<AppleClaims, "sub" | "email">>> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Apple returned an invalid identity token.");
  const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0]))) as { alg?: string; kid?: string };
  const claims = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1]))) as AppleClaims;
  if (header.alg !== "RS256" || !header.kid) throw new Error("Apple returned an unsupported identity token.");
  const audience = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  const verifiedEmail = claims.email_verified === true || claims.email_verified === "true";
  if (claims.iss !== "https://appleid.apple.com" || !audience.includes(runtimeEnv.APPLE_CLIENT_ID) || !claims.exp || claims.exp * 1000 <= Date.now() || !claims.sub || !claims.email || !verifiedEmail || claims.nonce !== expectedNonce) {
    throw new Error("Apple sign-in could not be verified.");
  }
  const jwksResponse = await fetch("https://appleid.apple.com/auth/keys", { headers: { Accept: "application/json" } });
  const jwks = await jwksResponse.json() as { keys?: Array<JsonWebKey & { kid?: string; alg?: string }> };
  const jwk = jwks.keys?.find((candidate) => candidate.kid === header.kid && candidate.alg === "RS256");
  if (!jwksResponse.ok || !jwk) throw new Error("Apple's signing key could not be loaded.");
  const publicKey = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, base64UrlToBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!valid) throw new Error("Apple's identity signature is invalid.");
  return { sub: claims.sub, email: claims.email.toLowerCase() };
}

export function appleDisplayName(rawUser: string | null, fallbackEmail: string) {
  if (rawUser) {
    try {
      const value = JSON.parse(rawUser) as { name?: { firstName?: string; lastName?: string } };
      const combined = `${value.name?.firstName ?? ""} ${value.name?.lastName ?? ""}`.trim();
      if (combined) return cleanSingleLine(combined, 80);
    } catch { /* Apple only sends this optional JSON once. */ }
  }
  return cleanSingleLine(fallbackEmail.split("@")[0], 80);
}

async function createAppleClientSecret() {
  const now = Math.floor(Date.now() / 1000);
  const header = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ alg: "ES256", kid: runtimeEnv.APPLE_KEY_ID, typ: "JWT" })));
  const payload = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ iss: runtimeEnv.APPLE_TEAM_ID, iat: now, exp: now + 300, aud: "https://appleid.apple.com", sub: runtimeEnv.APPLE_CLIENT_ID })));
  const pem = runtimeEnv.APPLE_PRIVATE_KEY!.replace(/\\n/g, "\n");
  const der = Uint8Array.from(atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "")), (character) => character.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${header}.${payload}`)));
  return `${header}.${payload}.${bytesToBase64Url(signature)}`;
}

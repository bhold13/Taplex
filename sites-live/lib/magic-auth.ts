import { ensureDatabaseSchema } from "@/lib/database";
import { safeReturnPath } from "@/lib/return-path";
import { requireDatabase, runtimeEnv } from "@/lib/runtime";
import { normalizeEmail, secureRandomToken, sha256Base64Url } from "@/lib/security";
import { enforceRateLimit, requestFingerprint, upsertMagicUser } from "@/lib/taplex-auth";

const MAGIC_LINK_SECONDS = 15 * 60;

export async function requestMagicLink(rawEmail: unknown, rawReturnTo: unknown, request: Request) {
  await ensureDatabaseSchema();
  if (!runtimeEnv.RESEND_API_KEY) throw new Error("Email sign-in is temporarily unavailable. Please use Google sign-in or contact TapLex support.");
  const email = normalizeEmail(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  const fingerprint = await requestFingerprint(request);
  await enforceRateLimit(`magic-email:${email}`, 4);
  await enforceRateLimit(`magic-request:${fingerprint}`, 12);

  const token = secureRandomToken(32);
  const tokenHash = await sha256Base64Url(token);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_SECONDS * 1000).toISOString();
  const returnTo = safeReturnPath(rawReturnTo);
  const db = requireDatabase();
  await db.batch([
    db.prepare("DELETE FROM magic_link_tokens WHERE expires_at <= ? OR used_at IS NOT NULL").bind(now),
    db.prepare("UPDATE magic_link_tokens SET used_at = ? WHERE email = ? AND used_at IS NULL").bind(now, email),
    db.prepare("INSERT INTO magic_link_tokens (id,email,token_hash,return_to,expires_at) VALUES (?,?,?,?,?)")
      .bind(crypto.randomUUID(), email, tokenHash, returnTo, expiresAt),
  ]);

  const link = new URL("/api/auth/magic/verify", request.url);
  link.searchParams.set("token", token);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtimeEnv.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `taplex-magic-${tokenHash}`,
    },
    body: JSON.stringify({
      from: runtimeEnv.PASSWORD_RESET_FROM_EMAIL || "TapLex <accounts@taplex.co>",
      to: [email],
      subject: "Your secure TapLex sign-in link",
      text: `Sign in to TapLex: ${link}\n\nThis secure link expires in 15 minutes and can be used once.`,
      html: `<div style="background:#080808;color:#f4eee3;padding:36px;font-family:Arial,sans-serif"><div style="max-width:560px;margin:auto;border:1px solid #d6a84e;border-radius:18px;padding:32px"><p style="color:#d6a84e;letter-spacing:.16em;font-weight:800">TAPLEX</p><h1 style="font-family:Georgia,serif;font-weight:400">Finish your secure sign-in</h1><p style="color:#c7c0b6;line-height:1.6">Tap the button to continue. This one-time link expires in 15 minutes.</p><p style="margin:28px 0"><a href="${escapeHtml(link.toString())}" style="display:inline-block;background:#d6a84e;color:#080808;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:800">Continue to TapLex</a></p><p style="color:#8e877d;font-size:12px">If you did not request this email, ignore it.</p></div></div>`,
    }),
  });
  if (!response.ok) {
    await db.prepare("DELETE FROM magic_link_tokens WHERE token_hash = ?").bind(tokenHash).run();
    throw new Error("Your sign-in email could not be sent. Please try again shortly.");
  }
}

export async function verifyMagicLink(rawToken: unknown) {
  await ensureDatabaseSchema();
  const token = String(rawToken ?? "").trim();
  if (!/^[A-Za-z0-9_-]{40,180}$/.test(token)) throw new Error("This sign-in link is invalid or expired.");
  const tokenHash = await sha256Base64Url(token);
  await enforceRateLimit(`magic-token:${tokenHash}`, 8);
  const db = requireDatabase();
  const now = new Date().toISOString();
  const row = await db.prepare(`SELECT id,email,return_to FROM magic_link_tokens
    WHERE token_hash = ? AND used_at IS NULL AND expires_at > ? LIMIT 1`)
    .bind(tokenHash, now).first<{ id: string; email: string; return_to: string }>();
  if (!row) throw new Error("This sign-in link is invalid or expired.");
  const result = await db.prepare("UPDATE magic_link_tokens SET used_at = ? WHERE id = ? AND used_at IS NULL AND expires_at > ?")
    .bind(now, row.id, now).run();
  if (!result.meta?.changes) throw new Error("This sign-in link was already used.");
  const session = await upsertMagicUser(row.email);
  return { session, returnTo: safeReturnPath(row.return_to) };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

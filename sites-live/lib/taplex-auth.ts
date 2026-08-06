import { ensureDatabaseSchema } from "@/lib/database";
import { requireDatabase, runtimeEnv } from "@/lib/runtime";
import { cleanSingleLine, normalizeEmail, sha256Base64Url } from "@/lib/security";

export const SESSION_COOKIE = "taplex_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const PASSWORD_ITERATIONS = 100_000;
const RESET_TOKEN_SECONDS = 30 * 60;

export type TapLexUser = {
  displayName: string;
  email: string;
  fullName: string | null;
  authSource: "email" | "google" | "apple" | "magic" | "chatgpt";
};

type UserRow = { email: string; display_name: string; google_sub: string | null; apple_sub: string | null };

export async function registerEmailUser(rawName: unknown, rawEmail: unknown, rawPassword: unknown) {
  await ensureDatabaseSchema();
  const displayName = cleanName(rawName);
  const email = cleanEmail(rawEmail);
  const password = String(rawPassword ?? "");
  validateCredentials(displayName, email, password);
  await enforceRateLimit(`signup:${email}`, 5);

  const existing = await requireDatabase().prepare("SELECT id FROM taplex_users WHERE email = ? LIMIT 1").bind(email).first<{ id: string }>();
  if (existing) throw new Error("An account with that email already exists. Log in instead.");
  const salt = randomToken(16);
  const passwordHash = await passwordDigest(password, salt);
  await requireDatabase().prepare(`INSERT INTO taplex_users (id,email,display_name,password_hash,password_salt)
    VALUES (?,?,?,?,?)`).bind(crypto.randomUUID(), email, displayName, passwordHash, salt).run();
  return createSession(email);
}

export async function loginEmailUser(rawEmail: unknown, rawPassword: unknown) {
  await ensureDatabaseSchema();
  const email = cleanEmail(rawEmail);
  const password = String(rawPassword ?? "");
  await enforceRateLimit(`login:${email}`, 8);
  const row = await requireDatabase().prepare(`SELECT email,password_hash,password_salt FROM taplex_users WHERE email = ? LIMIT 1`)
    .bind(email).first<{ email: string; password_hash: string | null; password_salt: string | null }>();
  const expected = row?.password_hash ?? "";
  const actual = await passwordDigest(password, row?.password_salt ?? "invalid-salt");
  if (!row || !expected || !constantTimeEqual(expected, actual)) throw new Error("Email or password is incorrect.");
  return createSession(row.email);
}

export async function requestPasswordReset(rawEmail: unknown, origin: string) {
  await ensureDatabaseSchema();
  if (!runtimeEnv.RESEND_API_KEY) throw new Error("Password reset email is not configured yet. Contact TapLex support.");
  const email = cleanEmail(rawEmail);
  await enforceRateLimit(`password-reset:${email}`, 4);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;

  const db = requireDatabase();
  let user = await db.prepare("SELECT id,email FROM taplex_users WHERE email = ? LIMIT 1")
    .bind(email).first<{ id: string; email: string }>();
  if (!user) {
    const legacyProfile = await db.prepare("SELECT display_name FROM profiles WHERE owner_email = ? LIMIT 1")
      .bind(email).first<{ display_name: string }>();
    if (legacyProfile) {
      await db.prepare("INSERT OR IGNORE INTO taplex_users (id,email,display_name) VALUES (?,?,?)")
        .bind(crypto.randomUUID(), email, legacyProfile.display_name).run();
      user = await db.prepare("SELECT id,email FROM taplex_users WHERE email = ? LIMIT 1")
        .bind(email).first<{ id: string; email: string }>();
    }
  }
  if (!user) return;

  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_SECONDS * 1000).toISOString();
  await db.batch([
    db.prepare("DELETE FROM password_reset_tokens WHERE expires_at <= ? OR used_at IS NOT NULL").bind(now),
    db.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL").bind(now, user.id),
    db.prepare("INSERT INTO password_reset_tokens (id,user_id,token_hash,expires_at) VALUES (?,?,?,?)")
      .bind(crypto.randomUUID(), user.id, tokenHash, expiresAt),
  ]);

  const resetUrl = new URL("/reset-password", origin);
  resetUrl.searchParams.set("token", token);
  try {
    await sendPasswordResetEmail(user.email, resetUrl.toString(), tokenHash);
  } catch (error) {
    await db.prepare("DELETE FROM password_reset_tokens WHERE token_hash = ?").bind(tokenHash).run();
    console.error("TapLex password reset delivery failed", error instanceof Error ? error.message : "Unknown email error");
    throw new Error("Password reset email could not be sent. Please try again shortly.");
  }
}

export async function resetEmailPassword(rawToken: unknown, rawPassword: unknown) {
  await ensureDatabaseSchema();
  const token = String(rawToken ?? "").trim();
  const password = String(rawPassword ?? "");
  if (token.length < 32 || token.length > 180) throw new Error("This password reset link is invalid or expired.");
  validatePassword(password);
  await enforceRateLimit(`password-reset-token:${await sha256(token)}`, 6);

  const db = requireDatabase();
  const now = new Date().toISOString();
  const tokenHash = await sha256(token);
  const row = await db.prepare(`SELECT t.id,t.user_id,u.email FROM password_reset_tokens t
    JOIN taplex_users u ON u.id = t.user_id
    WHERE t.token_hash = ? AND t.used_at IS NULL AND t.expires_at > ? LIMIT 1`)
    .bind(tokenHash, now).first<{ id: string; user_id: string; email: string }>();
  if (!row) throw new Error("This password reset link is invalid or expired.");

  const salt = randomToken(16);
  const passwordHash = await passwordDigest(password, salt);
  await db.batch([
    db.prepare("UPDATE taplex_users SET password_hash = ?,password_salt = ?,updated_at = ? WHERE id = ?")
      .bind(passwordHash, salt, now, row.user_id),
    db.prepare("UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL").bind(now, row.user_id),
    db.prepare("DELETE FROM taplex_sessions WHERE user_id = ?").bind(row.user_id),
  ]);
  return createSession(row.email);
}

export async function upsertGoogleUser(input: { email: string; name: string; sub: string }) {
  await ensureDatabaseSchema();
  const email = cleanEmail(input.email);
  const name = cleanName(input.name || email.split("@")[0]);
  if (!email || !input.sub) throw new Error("Google did not return a usable account.");
  const db = requireDatabase();
  const existing = await db.prepare("SELECT id,google_sub FROM taplex_users WHERE email = ? LIMIT 1").bind(email).first<{ id: string; google_sub: string | null }>();
  if (existing?.google_sub && existing.google_sub !== input.sub) throw new Error("That email is already connected to another Google account.");
  if (existing) {
    await db.prepare("UPDATE taplex_users SET google_sub = ?,display_name = ?,updated_at = ? WHERE id = ?")
      .bind(input.sub, name, new Date().toISOString(), existing.id).run();
  } else {
    await db.prepare("INSERT INTO taplex_users (id,email,display_name,google_sub) VALUES (?,?,?,?)")
      .bind(crypto.randomUUID(), email, name, input.sub).run();
  }
  return createSession(email);
}

export async function upsertAppleUser(input: { email: string; name: string; sub: string }) {
  await ensureDatabaseSchema();
  const email = normalizeEmail(input.email);
  const name = cleanSingleLine(input.name || email.split("@")[0], 80);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !input.sub) throw new Error("Apple did not return a usable account.");
  const db = requireDatabase();
  const bySubject = await db.prepare("SELECT id,email FROM taplex_users WHERE apple_sub = ? LIMIT 1")
    .bind(input.sub).first<{ id: string; email: string }>();
  if (bySubject && bySubject.email !== email) throw new Error("That Apple account is already connected to another TapLex email.");
  const existing = await db.prepare("SELECT id,apple_sub FROM taplex_users WHERE email = ? LIMIT 1")
    .bind(email).first<{ id: string; apple_sub: string | null }>();
  if (existing?.apple_sub && existing.apple_sub !== input.sub) throw new Error("That email is already connected to another Apple account.");
  if (existing) {
    await db.prepare("UPDATE taplex_users SET apple_sub = ?,display_name = CASE WHEN display_name = '' THEN ? ELSE display_name END,updated_at = ? WHERE id = ?")
      .bind(input.sub, name, new Date().toISOString(), existing.id).run();
  } else {
    await db.prepare("INSERT INTO taplex_users (id,email,display_name,apple_sub) VALUES (?,?,?,?)")
      .bind(crypto.randomUUID(), email, name, input.sub).run();
  }
  return createSession(email);
}

export async function upsertMagicUser(rawEmail: unknown) {
  await ensureDatabaseSchema();
  const email = normalizeEmail(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
  const db = requireDatabase();
  const existing = await db.prepare("SELECT id FROM taplex_users WHERE email = ? LIMIT 1").bind(email).first<{ id: string }>();
  if (!existing) {
    const profile = await db.prepare("SELECT display_name FROM profiles WHERE owner_email = ? LIMIT 1")
      .bind(email).first<{ display_name: string }>();
    const name = cleanSingleLine(profile?.display_name || email.split("@")[0] || "TapLex member", 80);
    await db.prepare("INSERT OR IGNORE INTO taplex_users (id,email,display_name) VALUES (?,?,?)")
      .bind(crypto.randomUUID(), email, name).run();
  }
  return createSession(email);
}

export async function createSessionForEmail(rawEmail: unknown) {
  return createSession(normalizeEmail(rawEmail));
}

export async function getSessionUser(token: string | null): Promise<TapLexUser | null> {
  if (!token) return null;
  await ensureDatabaseSchema();
  const tokenHash = await sha256(token);
  const row = await requireDatabase().prepare(`SELECT u.email,u.display_name,u.google_sub,u.apple_sub
    FROM taplex_sessions s JOIN taplex_users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? LIMIT 1`).bind(tokenHash, new Date().toISOString()).first<UserRow>();
  return row ? { email: row.email, displayName: row.display_name, fullName: row.display_name, authSource: row.apple_sub ? "apple" : row.google_sub ? "google" : "email" } : null;
}

export async function deleteSession(token: string | null) {
  if (!token) return;
  await ensureDatabaseSchema();
  await requireDatabase().prepare("DELETE FROM taplex_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

export function sessionCookie(token: string, secure: boolean) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_SECONDS}${secure ? "; Secure" : ""}`;
}

export function clearSessionCookie(secure: boolean) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function cookieValue(header: string | null, name: string) {
  const item = header?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

export function assertSameOrigin(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if ((origin && origin !== requestOrigin) || fetchSite === "cross-site") throw new Error("Cross-site request rejected.");
}

async function createSession(email: string) {
  const db = requireDatabase();
  const user = await db.prepare("SELECT id FROM taplex_users WHERE email = ? LIMIT 1").bind(email).first<{ id: string }>();
  if (!user) throw new Error("Account could not be loaded.");
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  await db.batch([
    db.prepare("DELETE FROM taplex_sessions WHERE expires_at <= ?").bind(new Date().toISOString()),
    db.prepare("INSERT INTO taplex_sessions (token_hash,user_id,expires_at) VALUES (?,?,?)").bind(await sha256(token), user.id, expiresAt),
  ]);
  return token;
}

export async function enforceRateLimit(key: string, limit: number) {
  await ensureDatabaseSchema();
  const db = requireDatabase();
  const now = Date.now();
  const hashedKey = await sha256(key);
  const row = await db.prepare("SELECT attempt_count,window_started_at FROM auth_attempts WHERE key = ? LIMIT 1")
    .bind(hashedKey).first<{ attempt_count: number; window_started_at: string }>();
  const started = row ? Date.parse(row.window_started_at) : 0;
  if (!row || !Number.isFinite(started) || now - started > 15 * 60 * 1000) {
    await db.prepare(`INSERT INTO auth_attempts (key,attempt_count,window_started_at) VALUES (?,1,?)
      ON CONFLICT(key) DO UPDATE SET attempt_count=1,window_started_at=excluded.window_started_at`).bind(hashedKey, new Date(now).toISOString()).run();
    return;
  }
  if (row.attempt_count >= limit) throw new Error("Too many attempts. Wait 15 minutes and try again.");
  await db.prepare("UPDATE auth_attempts SET attempt_count = attempt_count + 1 WHERE key = ?").bind(hashedKey).run();
}

export async function requestFingerprint(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const agent = request.headers.get("user-agent")?.slice(0, 180) || "unknown";
  return sha256Base64Url(`${ip}|${agent}|taplex-request`);
}

function validateCredentials(name: string, email: string, password: string) {
  if (name.length < 2) throw new Error("Add your name.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Add a valid email address.");
  validatePassword(password);
}

function validatePassword(password: string) {
  if (password.length < 10) throw new Error("Use at least 10 characters for your password.");
  if (password.length > 128) throw new Error("Password is too long.");
}

function cleanEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 254);
}

function cleanName(value: unknown) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

async function passwordDigest(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: new TextEncoder().encode(salt), iterations: PASSWORD_ITERATIONS }, key, 256);
  return bytesToBase64Url(new Uint8Array(bits));
}

async function sha256(value: string) {
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

function randomToken(length: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return bytesToBase64Url(bytes);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function constantTimeEqual(left: string, right: string) {
  const length = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < length; index += 1) mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  return mismatch === 0;
}

async function sendPasswordResetEmail(email: string, resetUrl: string, idempotencyKey: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtimeEnv.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `taplex-reset-${idempotencyKey}`,
    },
    body: JSON.stringify({
      from: runtimeEnv.PASSWORD_RESET_FROM_EMAIL || "TapLex <accounts@taplex.co>",
      to: [email],
      subject: "Reset your TapLex password",
      text: `Reset your TapLex password: ${resetUrl}\n\nThis secure link expires in 30 minutes and can be used once. If you did not request it, you can ignore this email.`,
      html: `<div style="background:#080808;color:#f4eee3;padding:36px;font-family:Arial,sans-serif"><div style="max-width:560px;margin:auto;border:1px solid #d6a84e;border-radius:18px;padding:32px"><p style="color:#d6a84e;letter-spacing:.16em;font-weight:800">TAPLEX</p><h1 style="font-family:Georgia,serif;font-weight:400">Reset your password</h1><p style="color:#c7c0b6;line-height:1.6">Use the button below to choose a new TapLex password. This secure link expires in 30 minutes and can be used once.</p><p style="margin:28px 0"><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#d6a84e;color:#080808;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:800">Reset my password</a></p><p style="color:#8e877d;font-size:12px;line-height:1.5">If you did not request this, you can safely ignore this email.</p></div></div>`,
    }),
  });
  if (!response.ok) throw new Error(`Email provider returned ${response.status}.`);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

import { ensureDatabaseSchema } from "@/lib/database";
import { authorizeProfileApi } from "@/lib/profile-auth";
import { requireDatabase, runtimeEnv } from "@/lib/runtime";
import { cleanSingleLine, sha256Base64Url } from "@/lib/security";
import { enforceRateLimit } from "@/lib/taplex-auth";

export const dynamic = "force-dynamic";

function messagingConfigured() {
  return Boolean(
    runtimeEnv.FIREBASE_API_KEY &&
    runtimeEnv.FIREBASE_AUTH_DOMAIN &&
    runtimeEnv.FIREBASE_PROJECT_ID &&
    runtimeEnv.FIREBASE_STORAGE_BUCKET &&
    runtimeEnv.FIREBASE_MESSAGING_SENDER_ID &&
    runtimeEnv.FIREBASE_APP_ID &&
    runtimeEnv.FIREBASE_VAPID_KEY
  );
}

export async function POST(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;
  if (!messagingConfigured()) return Response.json({ error: "TapLex notifications are not active yet." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  try {
    const body = await request.json() as Record<string, unknown>;
    const token = String(body.token ?? "").trim();
    const platform = cleanSingleLine(body.platform, 240);
    if (token.length < 40 || token.length > 4096 || !/^[A-Za-z0-9_:\-.]+$/.test(token)) {
      return Response.json({ error: "The notification registration was invalid." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    await ensureDatabaseSchema();
    await enforceRateLimit(`push-register:${auth.user.email}`, 12);
    const tokenHash = await sha256Base64Url(token);
    const now = new Date().toISOString();
    await requireDatabase().prepare(`INSERT INTO push_subscriptions
      (id,owner_email,token,token_hash,platform,created_at,updated_at,revoked_at)
      VALUES (?,?,?,?,?,?,?,NULL)
      ON CONFLICT(token_hash) DO UPDATE SET
        owner_email=excluded.owner_email,
        token=excluded.token,
        platform=excluded.platform,
        updated_at=excluded.updated_at,
        revoked_at=NULL`)
      .bind(crypto.randomUUID(), auth.user.email.toLowerCase(), token, tokenHash, platform, now, now).run();
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "This device could not be registered." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json() as Record<string, unknown>;
    const token = String(body.token ?? "").trim();
    if (token.length < 40 || token.length > 4096) return Response.json({ error: "The notification registration was invalid." }, { status: 400 });
    await ensureDatabaseSchema();
    await requireDatabase().prepare("UPDATE push_subscriptions SET revoked_at=?,updated_at=? WHERE token_hash=? AND owner_email=?")
      .bind(new Date().toISOString(), new Date().toISOString(), await sha256Base64Url(token), auth.user.email.toLowerCase()).run();
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Notifications could not be disabled." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}

import { ensureDatabaseSchema } from "@/lib/database";
import { profileImageUrl } from "@/lib/profile-model";
import { requireDatabase } from "@/lib/runtime";

type ConnectionRow = {
  id: string;
  connected_profile_id: string;
  handle: string;
  display_name: string;
  headline: string;
  avatar_key: string | null;
  note: string;
  met_at: string;
};

export type TapLexConnection = {
  id: string;
  profileId: string;
  handle: string;
  displayName: string;
  headline: string;
  avatarUrl: string | null;
  note: string;
  metAt: string;
};

export async function listConnections(ownerEmail: string) {
  await ensureDatabaseSchema();
  const owner = await ownerUser(ownerEmail);
  if (!owner) return [];
  const result = await requireDatabase().prepare(`SELECT c.id,c.connected_profile_id,p.handle,p.display_name,p.headline,p.avatar_key,c.note,c.met_at
    FROM connections c JOIN profiles p ON p.id=c.connected_profile_id
    WHERE c.owner_user_id=? AND p.published=1
    ORDER BY c.met_at DESC,c.created_at DESC`).bind(owner.id).all<ConnectionRow>();
  return (result.results ?? []).map(mapConnection);
}

export async function saveConnection(ownerEmail: string, profileHandle: unknown) {
  await ensureDatabaseSchema();
  const email = normalizeEmail(ownerEmail);
  const handle = String(profileHandle ?? "").trim().toLowerCase();
  const db = requireDatabase();
  const profile = await db.prepare("SELECT id,owner_email FROM profiles WHERE handle=? AND published=1 LIMIT 1")
    .bind(handle).first<{ id: string; owner_email: string }>();
  if (!profile) throw new Error("That TapLex profile is not available.");
  if (normalizeEmail(profile.owner_email) === email) throw new Error("Your own profile is already easy to find from your dashboard.");

  let owner = await ownerUser(email);
  if (!owner) {
    await db.prepare("INSERT OR IGNORE INTO taplex_users (id,email,display_name) VALUES (?,?,?)")
      .bind(crypto.randomUUID(), email, email.split("@")[0] || "TapLex member").run();
    owner = await ownerUser(email);
  }
  if (!owner) throw new Error("Your TapLex account could not be prepared.");

  const existing = await db.prepare("SELECT id FROM connections WHERE owner_user_id=? AND connected_profile_id=? LIMIT 1")
    .bind(owner.id, profile.id).first<{ id: string }>();
  if (existing) return { id: existing.id, created: false };

  const id = crypto.randomUUID();
  await db.prepare(`INSERT INTO connections (id,owner_user_id,connected_profile_id,note,met_at)
    VALUES (?,?,?,'',?)`).bind(id, owner.id, profile.id, new Date().toISOString()).run();
  return { id, created: true };
}

export async function updateConnectionNote(ownerEmail: string, connectionId: unknown, rawNote: unknown) {
  await ensureDatabaseSchema();
  const owner = await ownerUser(ownerEmail);
  if (!owner) throw new Error("Connection not found.");
  const id = String(connectionId ?? "");
  const note = String(rawNote ?? "").trim().slice(0, 280);
  const result = await requireDatabase().prepare("UPDATE connections SET note=?,updated_at=? WHERE id=? AND owner_user_id=?")
    .bind(note, new Date().toISOString(), id, owner.id).run();
  if (!result.meta.changes) throw new Error("Connection not found.");
  return note;
}

export async function removeConnection(ownerEmail: string, connectionId: unknown) {
  await ensureDatabaseSchema();
  const owner = await ownerUser(ownerEmail);
  if (!owner) throw new Error("Connection not found.");
  const result = await requireDatabase().prepare("DELETE FROM connections WHERE id=? AND owner_user_id=?")
    .bind(String(connectionId ?? ""), owner.id).run();
  if (!result.meta.changes) throw new Error("Connection not found.");
}

async function ownerUser(ownerEmail: string) {
  return requireDatabase().prepare("SELECT id FROM taplex_users WHERE email=? LIMIT 1")
    .bind(normalizeEmail(ownerEmail)).first<{ id: string }>();
}

function mapConnection(row: ConnectionRow): TapLexConnection {
  return {
    id: row.id,
    profileId: row.connected_profile_id,
    handle: row.handle,
    displayName: row.display_name,
    headline: row.headline,
    avatarUrl: profileImageUrl(row.avatar_key),
    note: row.note,
    metAt: row.met_at,
  };
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

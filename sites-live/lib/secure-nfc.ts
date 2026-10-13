import { ensureDatabaseSchema } from "@/lib/database";
import { recordNfcTap, type PublicNfcTag } from "@/lib/nfc";
import { requireDatabase, runtimeEnv } from "@/lib/runtime";
import { cleanSingleLine, normalizeEmail } from "@/lib/security";
import { verifyNtag424Sdm } from "@/lib/ntag424-sdm";

type SecureTagRow = {
  unit_id: string;
  public_id: string;
  uid_hex: string;
  chip_type: string;
  security_mode: string;
  key_mode: string;
  destination_path: string | null;
  secure_status: string;
  highest_counter: number;
  verified_tap_count: number;
  replay_count: number;
  invalid_count: number;
  last_verified_at: string | null;
  serial_number: string;
  unit_status: string;
  purchaser_email: string | null;
  product_type: string;
  color: string;
  profile_handle: string | null;
};

function cleanPublicId(value: unknown) {
  const publicId = cleanSingleLine(value, 40).toUpperCase();
  if (!/^[A-Z0-9_-]{4,40}$/.test(publicId)) throw new Error("Secure public ID must use 4-40 letters, numbers, dashes, or underscores.");
  return publicId;
}

function cleanUid(value: unknown) {
  const uid = cleanSingleLine(value, 32).replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  if (!/^[0-9A-F]{14}$/.test(uid)) throw new Error("NTAG 424 UID must be exactly 7 bytes / 14 hexadecimal characters.");
  return uid;
}

function cleanDestination(value: unknown) {
  const path = cleanSingleLine(value, 500);
  if (!path) return null;
  if (!path.startsWith("/") || path.startsWith("//")) throw new Error("Destination must be a same-origin path beginning with /.");
  return path;
}

function developmentKeys() {
  const metaReadKeyHex = runtimeEnv.NTAG424_DEV_META_KEY?.trim() ?? "";
  const fileReadKeyHex = runtimeEnv.NTAG424_DEV_FILE_KEY?.trim() ?? "";
  if (!/^[0-9A-Fa-f]{32}$/.test(metaReadKeyHex) || !/^[0-9A-Fa-f]{32}$/.test(fileReadKeyHex)) {
    throw new Error("NTAG 424 development verification keys are not configured.");
  }
  return { metaReadKeyHex, fileReadKeyHex };
}

export async function listSecureNfcTags() {
  await ensureDatabaseSchema();
  const result = await requireDatabase().prepare(`SELECT s.*,u.serial_number,u.status unit_status,b.product_type,b.color,p.handle profile_handle
    FROM nfc_secure_tags s
    JOIN nfc_units u ON u.id=s.unit_id
    JOIN nfc_batches b ON b.id=u.batch_id
    LEFT JOIN profiles p ON p.id=u.profile_id
    ORDER BY s.updated_at DESC LIMIT 500`).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function configureSecureNfcTag(input: {
  unitId: unknown;
  publicId: unknown;
  uidHex: unknown;
  destinationPath?: unknown;
  actorEmail: string;
  request: Request;
}) {
  await ensureDatabaseSchema();
  const unitId = cleanSingleLine(input.unitId, 80);
  const publicId = cleanPublicId(input.publicId);
  const uidHex = cleanUid(input.uidHex);
  const destinationPath = cleanDestination(input.destinationPath);
  const db = requireDatabase();
  const unit = await db.prepare("SELECT id FROM nfc_units WHERE id=? LIMIT 1").bind(unitId).first<{ id: string }>();
  if (!unit) throw new Error("NFC inventory unit not found.");

  const now = new Date().toISOString();
  await db.prepare(`INSERT INTO nfc_secure_tags
    (unit_id,public_id,chip_type,uid_hex,security_mode,key_mode,destination_path,status,created_at,updated_at)
    VALUES (?,?, 'NTAG424DNA', ?, 'sdm', 'development', ?, 'active', ?, ?)
    ON CONFLICT(unit_id) DO UPDATE SET
      public_id=excluded.public_id,
      uid_hex=excluded.uid_hex,
      destination_path=excluded.destination_path,
      status='active',
      updated_at=excluded.updated_at`)
    .bind(unitId, publicId, uidHex, destinationPath, now, now).run();

  await db.prepare("INSERT INTO nfc_audit_logs (id,unit_id,actor_email,action,metadata_json,request_hash) VALUES (?,?,?,?,?,?)")
    .bind(
      crypto.randomUUID(),
      unitId,
      normalizeEmail(input.actorEmail),
      "unit.secure_configured",
      JSON.stringify({ publicId, uidHex, destinationPath, chipType: "NTAG424DNA", securityMode: "sdm" }),
      "server",
    ).run();

  return { unitId, publicId, uidHex, destinationPath, securityMode: "sdm", keyMode: "development" };
}

export async function removeSecureNfcTag(unitIdRaw: unknown, actorEmail: string) {
  await ensureDatabaseSchema();
  const unitId = cleanSingleLine(unitIdRaw, 80);
  const db = requireDatabase();
  const current = await db.prepare("SELECT public_id,uid_hex FROM nfc_secure_tags WHERE unit_id=? LIMIT 1")
    .bind(unitId).first<{ public_id: string; uid_hex: string }>();
  if (!current) throw new Error("Secure NFC configuration not found.");
  await db.prepare("DELETE FROM nfc_secure_tags WHERE unit_id=?").bind(unitId).run();
  await db.prepare("INSERT INTO nfc_audit_logs (id,unit_id,actor_email,action,metadata_json,request_hash) VALUES (?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), unitId, normalizeEmail(actorEmail), "unit.secure_removed", JSON.stringify(current), "server").run();
  return { unitId, removed: true };
}

export async function verifySecureTap(publicIdRaw: string, encryptedPiccHex: string, receivedMacHex: string, request: Request) {
  await ensureDatabaseSchema();
  const publicId = cleanPublicId(publicIdRaw);
  const db = requireDatabase();
  const row = await db.prepare(`SELECT
      s.unit_id,s.public_id,s.uid_hex,s.chip_type,s.security_mode,s.key_mode,s.destination_path,s.status secure_status,
      s.highest_counter,s.verified_tap_count,s.replay_count,s.invalid_count,s.last_verified_at,
      u.serial_number,u.status unit_status,u.purchaser_email,b.product_type,b.color,p.handle profile_handle
    FROM nfc_secure_tags s
    JOIN nfc_units u ON u.id=s.unit_id
    JOIN nfc_batches b ON b.id=u.batch_id
    LEFT JOIN profiles p ON p.id=u.profile_id
    WHERE s.public_id=? LIMIT 1`).bind(publicId).first<SecureTagRow>();

  if (!row) throw new Error("Unknown TapLex Secure tag.");
  if (row.secure_status !== "active") throw new Error("This TapLex Secure tag is disabled.");
  if (row.key_mode !== "development") throw new Error("This secure-tag key mode is not supported by this verifier yet.");

  const keys = developmentKeys();
  let verification;
  try {
    verification = verifyNtag424Sdm({ encryptedPiccHex, receivedMacHex, ...keys });
  } catch (error) {
    await db.prepare("UPDATE nfc_secure_tags SET invalid_count=invalid_count+1,updated_at=? WHERE unit_id=?")
      .bind(new Date().toISOString(), row.unit_id).run();
    throw error;
  }

  if (!verification.verified || verification.uidHex !== row.uid_hex.toUpperCase()) {
    await db.prepare("UPDATE nfc_secure_tags SET invalid_count=invalid_count+1,updated_at=? WHERE unit_id=?")
      .bind(new Date().toISOString(), row.unit_id).run();
    throw new Error("TapLex Secure authentication failed.");
  }

  const now = new Date().toISOString();
  const freshTap = verification.counter > Number(row.highest_counter ?? 0);
  if (freshTap) {
    await db.prepare(`UPDATE nfc_secure_tags SET
      highest_counter=?,
      verified_tap_count=verified_tap_count+1,
      last_verified_at=?,
      updated_at=?
      WHERE unit_id=? AND highest_counter < ?`)
      .bind(verification.counter, now, now, row.unit_id, verification.counter).run();
  } else {
    await db.prepare("UPDATE nfc_secure_tags SET replay_count=replay_count+1,last_verified_at=?,updated_at=? WHERE unit_id=?")
      .bind(now, now, row.unit_id).run();
  }

  if (row.unit_status === "active") {
    const tag: PublicNfcTag = {
      id: row.unit_id,
      serial_number: row.serial_number,
      status: "active",
      product_type: row.product_type,
      color: row.color,
      profile_handle: row.profile_handle,
      purchaser_email: row.purchaser_email,
    };
    await recordNfcTap(tag, request);
  }

  const destination = row.destination_path || (row.profile_handle ? `/p/${row.profile_handle}` : null);
  return {
    publicId,
    unitId: row.unit_id,
    uidHex: verification.uidHex,
    counter: verification.counter,
    freshTap,
    destination,
  };
}


export async function resolveDevelopmentSecureTap(encryptedPiccHex: string, receivedMacHex: string) {
  await ensureDatabaseSchema();
  const keys = developmentKeys();
  const verification = verifyNtag424Sdm({ encryptedPiccHex, receivedMacHex, ...keys });
  if (!verification.verified) throw new Error("TapLex Secure authentication failed.");

  const row = await requireDatabase().prepare(
    "SELECT public_id FROM nfc_secure_tags WHERE UPPER(uid_hex)=? AND status='active' AND key_mode='development' LIMIT 1"
  ).bind(verification.uidHex).first<{ public_id: string }>();

  if (!row) throw new Error("This verified development tag has not been registered in TapLex Secure yet.");
  return { publicId: row.public_id, uidHex: verification.uidHex, counter: verification.counter };
}

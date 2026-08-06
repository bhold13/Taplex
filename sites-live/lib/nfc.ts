import type { TapLexUser } from "@/lib/taplex-auth";
import { ensureDatabaseSchema } from "@/lib/database";
import { getOrCreateProfile } from "@/lib/profiles";
import { deleteStoredImage } from "@/lib/media";
import { requireDatabase, runtimeEnv } from "@/lib/runtime";
import { cleanSingleLine, isLikelyBot, maskedEmail, normalizeEmail, secureRandomToken, sha256Base64Url } from "@/lib/security";
import { enforceRateLimit, requestFingerprint } from "@/lib/taplex-auth";

export const nfcStatuses = ["inventory", "unclaimed", "active", "frozen", "transfer_pending"] as const;
export type NfcStatus = typeof nfcStatuses[number];

type NfcRow = {
  id: string;
  batch_id: string;
  serial_number: string;
  status: NfcStatus;
  status_before_freeze: NfcStatus | null;
  owner_user_id: string | null;
  profile_id: string | null;
  order_id: string | null;
  purchaser_email: string | null;
  replacement_for_id: string | null;
  replaced_by_id: string | null;
  claimed_at: string | null;
  activated_at: string | null;
  last_tapped_at: string | null;
  tap_count: number;
  created_at: string;
  updated_at: string;
  batch_number: string;
  product_type: string;
  color: string;
  sku: string;
  owner_email: string | null;
  owner_name: string | null;
  profile_handle: string | null;
};

export type PublicNfcTag = Pick<NfcRow, "id" | "serial_number" | "status" | "product_type" | "color" | "profile_handle" | "purchaser_email">;

export async function createNfcBatch(actorEmail: string, raw: Record<string, unknown>, request: Request) {
  await ensureDatabaseSchema();
  const productType = cleanSingleLine(raw.productType, 60);
  const color = cleanSingleLine(raw.color, 40);
  const sku = cleanCode(raw.sku, 24);
  const batchNumber = cleanCode(raw.batchNumber, 32);
  const quantity = Number(raw.quantity);
  const initialStatus: NfcStatus = raw.status === "unclaimed" ? "unclaimed" : "inventory";
  const purchaserEmail = normalizeOptionalEmail(raw.purchaserEmail);
  const orderId = cleanSingleLine(raw.orderId, 80) || null;
  if (!productType || !sku || !batchNumber) throw new Error("Product type, SKU, and batch number are required.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 500) throw new Error("Batch quantity must be between 1 and 500.");

  const db = requireDatabase();
  const existing = await db.prepare("SELECT id FROM nfc_batches WHERE batch_number = ? LIMIT 1").bind(batchNumber).first<{ id: string }>();
  if (existing) throw new Error("That batch number already exists.");
  const batchId = crypto.randomUUID();
  const baseUrl = canonicalOrigin(request);
  const units: Array<{ id: string; serialNumber: string; url: string; qrFilename: string }> = [];
  const statements: D1PreparedStatement[] = [
    db.prepare("INSERT INTO nfc_batches (id,batch_number,product_type,color,sku,quantity,created_by_email) VALUES (?,?,?,?,?,?,?)")
      .bind(batchId, batchNumber, productType, color, sku, quantity, normalizeEmail(actorEmail)),
  ];
  for (let index = 1; index <= quantity; index += 1) {
    const secret = secureRandomToken(24);
    const serialNumber = `${sku}-${batchNumber}-${String(index).padStart(Math.max(4, String(quantity).length), "0")}`;
    const id = crypto.randomUUID();
    statements.push(db.prepare(`INSERT INTO nfc_units
      (id,batch_id,serial_number,slug_hash,status,order_id,purchaser_email) VALUES (?,?,?,?,?,?,?)`)
      .bind(id, batchId, serialNumber, await sha256Base64Url(secret), initialStatus, orderId, purchaserEmail));
    units.push({ id, serialNumber, url: `${baseUrl}/t/${secret}`, qrFilename: `${safeFilename(serialNumber)}.png` });
  }
  statements.push(db.prepare("INSERT INTO nfc_audit_logs (id,batch_id,actor_email,action,metadata_json,request_hash) VALUES (?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), batchId, normalizeEmail(actorEmail), "batch.created", JSON.stringify({ batchNumber, productType, color, sku, quantity, initialStatus }), await requestFingerprint(request)));
  await db.batch(statements);
  return { batch: { id: batchId, batchNumber, productType, color, sku, quantity, status: initialStatus }, units };
}

export async function listNfcInventory(filters: { search?: string; status?: string } = {}) {
  await ensureDatabaseSchema();
  const clauses: string[] = [];
  const values: unknown[] = [];
  const search = cleanSingleLine(filters.search, 100).toLowerCase();
  if (search) {
    clauses.push(`(LOWER(u.serial_number) LIKE ? OR LOWER(COALESCE(o.email,'')) LIKE ? OR LOWER(COALESCE(o.display_name,'')) LIKE ? OR LOWER(COALESCE(u.order_id,'')) LIKE ? OR LOWER(b.batch_number) LIKE ? OR LOWER(b.color) LIKE ? OR LOWER(u.status) LIKE ? OR LOWER(b.sku) LIKE ?)`);
    for (let index = 0; index < 8; index += 1) values.push(`%${search}%`);
  }
  if (nfcStatuses.includes(filters.status as NfcStatus)) {
    clauses.push("u.status = ?");
    values.push(filters.status);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await requireDatabase().prepare(`SELECT u.id,u.batch_id,u.serial_number,u.status,u.status_before_freeze,u.owner_user_id,u.profile_id,u.order_id,u.purchaser_email,u.replacement_for_id,u.replaced_by_id,u.claimed_at,u.activated_at,u.last_tapped_at,u.tap_count,u.created_at,u.updated_at,b.batch_number,b.product_type,b.color,b.sku,o.email owner_email,o.display_name owner_name,p.handle profile_handle
    FROM nfc_units u JOIN nfc_batches b ON b.id=u.batch_id
    LEFT JOIN taplex_users o ON o.id=u.owner_user_id LEFT JOIN profiles p ON p.id=u.profile_id
    ${where} ORDER BY u.created_at DESC,u.serial_number ASC LIMIT 500`).bind(...values).all<NfcRow>();
  return (result.results ?? []).map(adminUnit);
}

export async function listNfcAuditLogs() {
  await ensureDatabaseSchema();
  const result = await requireDatabase().prepare(`SELECT a.id,a.unit_id,a.batch_id,a.actor_email,a.action,a.metadata_json,a.created_at,u.serial_number,b.batch_number
    FROM nfc_audit_logs a LEFT JOIN nfc_units u ON u.id=a.unit_id LEFT JOIN nfc_batches b ON b.id=a.batch_id
    ORDER BY a.created_at DESC LIMIT 100`).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function findNfcTagBySlug(slug: string): Promise<PublicNfcTag | null> {
  if (!/^[A-Za-z0-9_-]{32}$/.test(slug)) return null;
  await ensureDatabaseSchema();
  const row = await requireDatabase().prepare(`SELECT u.id,u.serial_number,u.status,u.purchaser_email,b.product_type,b.color,p.handle profile_handle
    FROM nfc_units u JOIN nfc_batches b ON b.id=u.batch_id LEFT JOIN profiles p ON p.id=u.profile_id
    WHERE u.slug_hash = ? LIMIT 1`).bind(await sha256Base64Url(slug)).first<PublicNfcTag>();
  return row ?? null;
}

export async function claimNfcTag(slug: string, user: TapLexUser, request: Request, requestedProfileId?: unknown) {
  if (!/^[A-Za-z0-9_-]{32}$/.test(slug)) throw new Error("This TapLex activation link is invalid.");
  await ensureDatabaseSchema();
  const slugHash = await sha256Base64Url(slug);
  const fingerprint = await requestFingerprint(request);
  await enforceRateLimit(`tag-claim:${slugHash}:${fingerprint}`, 10);
  const db = requireDatabase();
  const unit = await db.prepare("SELECT id,status,owner_user_id,purchaser_email FROM nfc_units WHERE slug_hash = ? LIMIT 1")
    .bind(slugHash).first<{ id: string; status: NfcStatus; owner_user_id: string | null; purchaser_email: string | null }>();
  if (!unit) throw new Error("This TapLex product could not be found.");
  const account = await db.prepare("SELECT id,email FROM taplex_users WHERE email = ? LIMIT 1")
    .bind(normalizeEmail(user.email)).first<{ id: string; email: string }>();
  if (!account) throw new Error("Your TapLex account could not be loaded.");
  if (unit.purchaser_email && normalizeEmail(unit.purchaser_email) !== account.email) {
    throw new Error(`This product is reserved for ${maskedEmail(unit.purchaser_email)}. Sign in with the purchaser email or contact TapLex support.`);
  }
  if (unit.status === "active" && unit.owner_user_id === account.id) {
    const current = await ownedUnit(unit.id, account.id);
    return { alreadyOwned: true, unitId: unit.id, profileId: current?.profile_id, handle: current?.profile_handle, setupUrl: `/claim/setup?unit=${encodeURIComponent(unit.id)}` };
  }
  if (unit.status !== "unclaimed" || unit.owner_user_id) throw new Error(statusMessage(unit.status));
  const defaultProfile = await getOrCreateProfile(user);
  const profileId = await ownedProfileId(account.email, requestedProfileId, defaultProfile.id);
  const now = new Date().toISOString();
  const result = await db.prepare(`UPDATE nfc_units SET status='active',owner_user_id=?,profile_id=?,claimed_at=?,activated_at=?,updated_at=?
    WHERE id=? AND status='unclaimed' AND owner_user_id IS NULL`).bind(account.id, profileId, now, now, now, unit.id).run();
  if (!result.meta?.changes) throw new Error("This product was just claimed by another account. Contact TapLex support if you believe this is yours.");
  await writeAudit({ unitId: unit.id, actorEmail: account.email, action: "unit.claimed", metadata: { profileId }, request });
  const connected = await ownedUnit(unit.id, account.id);
  return { alreadyOwned: false, unitId: unit.id, profileId, handle: connected?.profile_handle, setupUrl: `/claim/setup?unit=${encodeURIComponent(unit.id)}` };
}

export async function recordNfcTap(tag: PublicNfcTag, request: Request) {
  if (tag.status !== "active" || !runtimeEnv.TAP_ANALYTICS_SALT || isLikelyBot(request.headers.get("user-agent"))) return;
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const agent = request.headers.get("user-agent")?.slice(0, 220) || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const visitorHash = await sha256Base64Url(`${runtimeEnv.TAP_ANALYTICS_SALT}|${day}|${ip}|${agent}`);
  const eventMinute = new Date().toISOString().slice(0, 16);
  const referrerHost = safeHost(request.headers.get("referer"));
  const deviceClass = /mobile|android|iphone/i.test(agent) ? "mobile" : /ipad|tablet/i.test(agent) ? "tablet" : "desktop";
  const db = requireDatabase();
  const insert = await db.prepare("INSERT OR IGNORE INTO nfc_tap_events (id,unit_id,event_minute,visitor_hash,referrer_host,device_class) VALUES (?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), tag.id, eventMinute, visitorHash, referrerHost, deviceClass).run();
  if (insert.meta?.changes) await db.prepare("UPDATE nfc_units SET tap_count=tap_count+1,last_tapped_at=?,updated_at=? WHERE id=?")
    .bind(new Date().toISOString(), new Date().toISOString(), tag.id).run();
}

export async function adminNfcAction(actorEmail: string, raw: Record<string, unknown>, request: Request) {
  await ensureDatabaseSchema();
  const unitId = String(raw.unitId ?? "");
  const action = String(raw.action ?? "");
  const db = requireDatabase();
  const unit = await db.prepare(`SELECT u.*,b.batch_number,b.product_type,b.color,b.sku,o.email owner_email,o.display_name owner_name,p.handle profile_handle
    FROM nfc_units u JOIN nfc_batches b ON b.id=u.batch_id LEFT JOIN taplex_users o ON o.id=u.owner_user_id LEFT JOIN profiles p ON p.id=u.profile_id WHERE u.id=? LIMIT 1`)
    .bind(unitId).first<NfcRow>();
  if (!unit) throw new Error("NFC product not found.");
  const now = new Date().toISOString();
  if (action === "reset") {
    const reason = cleanSingleLine(raw.reason, 240) || null;
    if (unit.status === "frozen" && raw.confirmFrozen !== true) {
      throw new Error("This product is frozen. Confirm the extra frozen-tag warning before resetting it.");
    }
    const actorUserId = await actorIdentifier(actorEmail, "admin");
    await enforceRateLimit(`admin-tag-reset:${actorUserId}:${await requestFingerprint(request)}`, 30);
    const auditMetadata = {
      productId: unit.id,
      serialNumber: unit.serial_number,
      previousOwnerUserId: unit.owner_user_id,
      previousProfileId: unit.profile_id,
      previousStatus: unit.status,
      adminUserId: actorUserId,
      reason,
    };
    await db.batch([
      db.prepare("UPDATE nfc_transfers SET status='cancelled' WHERE unit_id=? AND status='pending'").bind(unit.id),
      db.prepare(`UPDATE nfc_units SET owner_user_id=NULL,profile_id=NULL,claimed_at=NULL,status='unclaimed',status_before_freeze=NULL,updated_at=? WHERE id=?`)
        .bind(now, unit.id),
      await auditStatement({ unitId: unit.id, actorEmail, actorUserId, action: "unit.admin_reset", metadata: auditMetadata, request }),
    ]);
  } else if (action === "freeze") {
    if (unit.status === "frozen") return { unit: adminUnit(unit) };
    await db.prepare("UPDATE nfc_units SET status_before_freeze=status,status='frozen',updated_at=? WHERE id=?").bind(now, unitId).run();
    await writeAudit({ unitId, actorEmail, action: "unit.frozen", metadata: { previousStatus: unit.status }, request });
  } else if (action === "release") {
    if (unit.status !== "frozen") throw new Error("Only a frozen product can be released.");
    const status = unit.status_before_freeze && nfcStatuses.includes(unit.status_before_freeze) && unit.status_before_freeze !== "frozen" ? unit.status_before_freeze : unit.owner_user_id ? "active" : "unclaimed";
    await db.prepare("UPDATE nfc_units SET status=?,status_before_freeze=NULL,updated_at=? WHERE id=? AND status='frozen'").bind(status, now, unitId).run();
    await writeAudit({ unitId, actorEmail, action: "unit.released", metadata: { status }, request });
  } else if (action === "set_status") {
    const status = raw.status === "inventory" ? "inventory" : raw.status === "unclaimed" ? "unclaimed" : null;
    if (!status || unit.owner_user_id || !["inventory", "unclaimed"].includes(unit.status)) throw new Error("Only ownerless inventory can switch between inventory and unclaimed.");
    await db.prepare("UPDATE nfc_units SET status=?,updated_at=? WHERE id=? AND owner_user_id IS NULL").bind(status, now, unitId).run();
    await writeAudit({ unitId, actorEmail, action: "unit.status_changed", metadata: { from: unit.status, to: status }, request });
  } else if (action === "replace") {
    const secret = secureRandomToken(24);
    const replacementId = crypto.randomUUID();
    const suffix = Date.now().toString(36).toUpperCase().slice(-6);
    const serialNumber = `${unit.serial_number}-R${suffix}`;
    const nextStatus: NfcStatus = unit.owner_user_id ? "active" : unit.status === "inventory" ? "inventory" : "unclaimed";
    await db.batch([
      db.prepare(`INSERT INTO nfc_units (id,batch_id,serial_number,slug_hash,status,owner_user_id,profile_id,order_id,purchaser_email,replacement_for_id,claimed_at,activated_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(replacementId, unit.batch_id, serialNumber, await sha256Base64Url(secret), nextStatus, unit.owner_user_id, unit.profile_id, unit.order_id, unit.purchaser_email, unit.id, unit.claimed_at, unit.activated_at),
      db.prepare("UPDATE nfc_units SET status_before_freeze=status,status='frozen',replaced_by_id=?,updated_at=? WHERE id=?").bind(replacementId, now, unit.id),
    ]);
    await writeAudit({ unitId, actorEmail, action: "unit.replaced", metadata: { replacementId, serialNumber }, request });
    return { replacement: { id: replacementId, serialNumber, url: `${canonicalOrigin(request)}/t/${secret}`, qrFilename: `${safeFilename(serialNumber)}.png` } };
  } else if (action === "transfer") {
    return beginNfcTransfer(unit, actorEmail, raw.recipientEmail, request);
  } else {
    throw new Error("Unknown NFC inventory action.");
  }
  const updated = await getNfcAdminUnit(unitId);
  return { unit: updated };
}

export async function beginOwnerNfcTransfer(unitId: unknown, ownerEmail: string, recipientEmail: unknown, request: Request) {
  await ensureDatabaseSchema();
  const db = requireDatabase();
  const unit = await db.prepare(`SELECT u.*,b.batch_number,b.product_type,b.color,b.sku,o.email owner_email,o.display_name owner_name,p.handle profile_handle
    FROM nfc_units u JOIN nfc_batches b ON b.id=u.batch_id LEFT JOIN taplex_users o ON o.id=u.owner_user_id LEFT JOIN profiles p ON p.id=u.profile_id
    WHERE u.id=? AND LOWER(o.email)=? LIMIT 1`).bind(String(unitId ?? ""), normalizeEmail(ownerEmail)).first<NfcRow>();
  if (!unit) throw new Error("You do not own that TapLex product.");
  return beginNfcTransfer(unit, ownerEmail, recipientEmail, request);
}

async function beginNfcTransfer(unit: NfcRow, actorEmail: string, rawRecipientEmail: unknown, request: Request) {
  if (!unit.owner_user_id || unit.status !== "active") throw new Error("Only an active claimed product can be transferred.");
  const recipientEmail = normalizeOptionalEmail(rawRecipientEmail);
  if (!recipientEmail) throw new Error("Enter the recipient's valid email address.");
  if (recipientEmail === normalizeEmail(unit.owner_email)) throw new Error("The recipient must use a different email address.");
  if (!runtimeEnv.RESEND_API_KEY) throw new Error("Transfer email is not configured yet.");
  const token = secureRandomToken(32);
  const tokenHash = await sha256Base64Url(token);
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const transferId = crypto.randomUUID();
  const db = requireDatabase();
  await db.batch([
    db.prepare("UPDATE nfc_transfers SET status='cancelled' WHERE unit_id=? AND status='pending'").bind(unit.id),
    db.prepare("INSERT INTO nfc_transfers (id,unit_id,initiated_by_email,recipient_email,token_hash,expires_at) VALUES (?,?,?,?,?,?)")
      .bind(transferId, unit.id, normalizeEmail(actorEmail), recipientEmail, tokenHash, expiresAt),
    db.prepare("UPDATE nfc_units SET status='transfer_pending',updated_at=? WHERE id=? AND status='active'").bind(now, unit.id),
  ]);
  const link = new URL("/transfer", canonicalOrigin(request));
  link.searchParams.set("token", token);
  try {
    await sendTransferEmail(recipientEmail, link.toString(), unit.serial_number, tokenHash);
  } catch (error) {
    await db.batch([
      db.prepare("UPDATE nfc_transfers SET status='cancelled' WHERE id=?").bind(transferId),
      db.prepare("UPDATE nfc_units SET status='active',updated_at=? WHERE id=? AND status='transfer_pending'").bind(new Date().toISOString(), unit.id),
    ]);
    throw error;
  }
  await writeAudit({ unitId: unit.id, actorEmail, action: "transfer.started", metadata: { recipientEmail, transferId }, request });
  return { message: `Transfer invitation sent to ${recipientEmail}.` };
}

export async function acceptNfcTransfer(rawToken: unknown, user: TapLexUser, request: Request) {
  await ensureDatabaseSchema();
  const token = String(rawToken ?? "").trim();
  if (!/^[A-Za-z0-9_-]{40,180}$/.test(token)) throw new Error("This transfer link is invalid or expired.");
  const tokenHash = await sha256Base64Url(token);
  await enforceRateLimit(`transfer:${tokenHash}:${await requestFingerprint(request)}`, 8);
  const db = requireDatabase();
  const now = new Date().toISOString();
  const transfer = await db.prepare(`SELECT id,unit_id,recipient_email FROM nfc_transfers
    WHERE token_hash=? AND status='pending' AND expires_at>? LIMIT 1`).bind(tokenHash, now).first<{ id: string; unit_id: string; recipient_email: string }>();
  if (!transfer) throw new Error("This transfer link is invalid, expired, or already used.");
  if (normalizeEmail(user.email) !== normalizeEmail(transfer.recipient_email)) throw new Error(`Sign in as ${maskedEmail(transfer.recipient_email)} to accept this transfer.`);
  const account = await db.prepare("SELECT id FROM taplex_users WHERE email=? LIMIT 1").bind(normalizeEmail(user.email)).first<{ id: string }>();
  if (!account) throw new Error("Your TapLex account could not be loaded.");
  const profile = await getOrCreateProfile(user);
  const moved = await db.prepare(`UPDATE nfc_units SET owner_user_id=?,profile_id=?,status='active',purchaser_email=NULL,updated_at=?
    WHERE id=? AND status='transfer_pending' AND EXISTS (SELECT 1 FROM nfc_transfers WHERE id=? AND status='pending' AND expires_at>?)`)
    .bind(account.id, profile.id, now, transfer.unit_id, transfer.id, now).run();
  if (!moved.meta?.changes) throw new Error("This product is not available for transfer.");
  const accepted = await db.prepare("UPDATE nfc_transfers SET status='accepted',accepted_at=? WHERE id=? AND status='pending' AND expires_at>?")
    .bind(now, transfer.id, now).run();
  if (!accepted.meta?.changes) throw new Error("This transfer was already completed.");
  await writeAudit({ unitId: transfer.unit_id, actorEmail: user.email, action: "transfer.accepted", metadata: { transferId: transfer.id, profileId: profile.id }, request });
  return { handle: profile.handle };
}

export async function getOwnedNfcProducts(ownerEmail: string) {
  await ensureDatabaseSchema();
  const result = await requireDatabase().prepare(`SELECT u.id,u.serial_number,u.status,u.tap_count,u.last_tapped_at,b.product_type,b.color,b.sku,p.handle profile_handle
    FROM nfc_units u JOIN taplex_users o ON o.id=u.owner_user_id JOIN nfc_batches b ON b.id=u.batch_id LEFT JOIN profiles p ON p.id=u.profile_id
    WHERE LOWER(o.email)=? ORDER BY u.created_at DESC`).bind(normalizeEmail(ownerEmail)).all<Record<string, unknown>>();
  return result.results ?? [];
}

export async function disconnectOwnedNfcProduct(unitId: unknown, user: TapLexUser, confirmation: unknown, request: Request) {
  if (String(confirmation ?? "").trim() !== "DISCONNECT") throw new Error("Type DISCONNECT to confirm.");
  await ensureDatabaseSchema();
  const email = normalizeEmail(user.email);
  const db = requireDatabase();
  const account = await db.prepare("SELECT id FROM taplex_users WHERE email=? LIMIT 1").bind(email).first<{ id: string }>();
  if (!account) throw new Error("Your TapLex account could not be loaded.");
  const actorUserId = account.id;
  const unit = await db.prepare(`SELECT u.id,u.serial_number,u.status,u.profile_id FROM nfc_units u
    WHERE u.id=? AND u.owner_user_id=? LIMIT 1`).bind(String(unitId ?? ""), actorUserId)
    .first<{ id: string; serial_number: string; status: NfcStatus; profile_id: string | null }>();
  if (!unit) throw new Error("You do not own that TapLex tag.");
  await enforceRateLimit(`tag-disconnect:${actorUserId}:${await requestFingerprint(request)}`, 10);
  const now = new Date().toISOString();
  await db.batch([
    db.prepare("UPDATE nfc_transfers SET status='cancelled' WHERE unit_id=? AND status='pending'").bind(unit.id),
    db.prepare(`UPDATE nfc_units SET owner_user_id=NULL,profile_id=NULL,claimed_at=NULL,status='unclaimed',status_before_freeze=NULL,updated_at=?
      WHERE id=? AND owner_user_id=?`).bind(now, unit.id, actorUserId),
    await auditStatement({
      unitId: unit.id,
      actorEmail: email,
      actorUserId,
      action: "unit.owner_disconnected",
      metadata: { actionType: "disconnect_tag", userId: actorUserId, profileId: unit.profile_id, affectedProductIds: [unit.id], serialNumber: unit.serial_number, previousStatus: unit.status },
      request,
    }),
  ]);
  return { unitId: unit.id, status: "unclaimed" as const };
}

export async function deleteOwnedProfileAndReleaseTags(user: TapLexUser, confirmation: unknown, request: Request) {
  if (String(confirmation ?? "").trim() !== "DELETE") throw new Error("Type DELETE to confirm.");
  await ensureDatabaseSchema();
  const email = normalizeEmail(user.email);
  const db = requireDatabase();
  const account = await db.prepare("SELECT id FROM taplex_users WHERE email=? LIMIT 1").bind(email).first<{ id: string }>();
  const actorUserId = account?.id ?? `user:${email}`;
  const profile = await db.prepare("SELECT id,avatar_key FROM profiles WHERE owner_email=? LIMIT 1").bind(email)
    .first<{ id: string; avatar_key: string | null }>();
  if (!profile) throw new Error("Profile not found.");
  await enforceRateLimit(`profile-delete:${actorUserId}:${await requestFingerprint(request)}`, 4);
  const [tagResult, galleryResult] = await Promise.all([
    db.prepare("SELECT id,serial_number,status FROM nfc_units WHERE profile_id=? ORDER BY created_at ASC").bind(profile.id)
      .all<{ id: string; serial_number: string; status: NfcStatus }>(),
    db.prepare("SELECT image_key FROM profile_gallery_items WHERE profile_id=?").bind(profile.id).all<{ image_key: string }>(),
  ]);
  const tags = tagResult.results ?? [];
  const galleryKeys = (galleryResult.results ?? []).map((item) => item.image_key);
  const now = new Date().toISOString();
  const statements: D1PreparedStatement[] = [
    db.prepare("UPDATE nfc_transfers SET status='cancelled' WHERE status='pending' AND unit_id IN (SELECT id FROM nfc_units WHERE profile_id=?)").bind(profile.id),
    db.prepare(`UPDATE nfc_units SET owner_user_id=NULL,profile_id=NULL,claimed_at=NULL,status='unclaimed',status_before_freeze=NULL,updated_at=? WHERE profile_id=?`)
      .bind(now, profile.id),
  ];
  for (const tag of tags) {
    statements.push(await auditStatement({
      unitId: tag.id,
      actorEmail: email,
      actorUserId,
      action: "unit.released_by_profile_delete",
      metadata: { actionType: "delete_profile", userId: actorUserId, profileId: profile.id, affectedProductIds: [tag.id], serialNumber: tag.serial_number, previousStatus: tag.status },
      request,
    }));
  }
  statements.push(
    await auditStatement({
      actorEmail: email,
      actorUserId,
      action: "profile.deleted",
      metadata: { actionType: "delete_profile", userId: actorUserId, profileId: profile.id, affectedProductIds: tags.slice(0, 25).map((tag) => tag.id), affectedProductCount: tags.length, affectedProductIdsTruncated: tags.length > 25 },
      request,
    }),
    db.prepare("DELETE FROM profile_links WHERE profile_id=?").bind(profile.id),
    db.prepare("DELETE FROM profile_gallery_items WHERE profile_id=?").bind(profile.id),
    db.prepare(`UPDATE profiles SET headline='',bio='',avatar_key=NULL,contact_email='',contact_phone='',location_city='',location_region='',location_country='',location_postal_code='',location_latitude=NULL,location_longitude=NULL,location_visibility='hidden',nearby_discovery=0,published=0,updated_at=? WHERE id=? AND owner_email=?`)
      .bind(now, profile.id, email),
  );
  await db.batch(statements);
  await Promise.all([profile.avatar_key, ...galleryKeys].map((key) => deleteStoredImage(key).catch(() => undefined)));
  return { profileId: profile.id, affectedProductIds: tags.map((tag) => tag.id) };
}

export async function reconnectOwnedNfcProduct(unitId: unknown, ownerEmail: string, profileId: unknown, request: Request) {
  await ensureDatabaseSchema();
  const email = normalizeEmail(ownerEmail);
  const db = requireDatabase();
  const profile = await db.prepare("SELECT id,handle FROM profiles WHERE id=? AND owner_email=? LIMIT 1")
    .bind(String(profileId ?? ""), email).first<{ id: string; handle: string }>();
  if (!profile) throw new Error("That profile does not belong to your account.");
  const result = await db.prepare(`UPDATE nfc_units SET profile_id=?,updated_at=? WHERE id=? AND status='active'
    AND owner_user_id=(SELECT id FROM taplex_users WHERE email=? LIMIT 1)`).bind(profile.id, new Date().toISOString(), String(unitId ?? ""), email).run();
  if (!result.meta?.changes) throw new Error("That active TapLex product could not be updated.");
  await writeAudit({ unitId: String(unitId), actorEmail: email, action: "unit.profile_connected", metadata: { profileId: profile.id }, request });
  return { handle: profile.handle };
}

export async function getOwnedNfcSetup(unitId: string, user: TapLexUser) {
  await ensureDatabaseSchema();
  const row = await requireDatabase().prepare(`SELECT u.id,u.serial_number,u.status,b.product_type,b.color,p.id profile_id,p.handle profile_handle
    FROM nfc_units u JOIN taplex_users o ON o.id=u.owner_user_id JOIN nfc_batches b ON b.id=u.batch_id LEFT JOIN profiles p ON p.id=u.profile_id
    WHERE u.id=? AND LOWER(o.email)=? LIMIT 1`).bind(unitId, normalizeEmail(user.email)).first<Record<string, unknown>>();
  if (!row) throw new Error("This product is not connected to your account.");
  return row;
}

async function ownedProfileId(email: string, requestedProfileId: unknown, fallbackId: string) {
  const id = String(requestedProfileId ?? "");
  if (!id) return fallbackId;
  const row = await requireDatabase().prepare("SELECT id FROM profiles WHERE id=? AND owner_email=? LIMIT 1").bind(id, email).first<{ id: string }>();
  if (!row) throw new Error("That profile does not belong to your account.");
  return row.id;
}

async function ownedUnit(unitId: string, userId: string) {
  return requireDatabase().prepare(`SELECT u.profile_id,p.handle profile_handle FROM nfc_units u LEFT JOIN profiles p ON p.id=u.profile_id
    WHERE u.id=? AND u.owner_user_id=? LIMIT 1`).bind(unitId, userId).first<{ profile_id: string | null; profile_handle: string | null }>();
}

async function getNfcAdminUnit(id: string) {
  const row = await requireDatabase().prepare(`SELECT u.*,b.batch_number,b.product_type,b.color,b.sku,o.email owner_email,o.display_name owner_name,p.handle profile_handle
    FROM nfc_units u JOIN nfc_batches b ON b.id=u.batch_id LEFT JOIN taplex_users o ON o.id=u.owner_user_id LEFT JOIN profiles p ON p.id=u.profile_id WHERE u.id=? LIMIT 1`)
    .bind(id).first<NfcRow>();
  return row ? adminUnit(row) : null;
}

function adminUnit(row: NfcRow) {
  return {
    id: row.id, serialNumber: row.serial_number, status: row.status, previousStatus: row.status_before_freeze,
    batchId: row.batch_id, batchNumber: row.batch_number, productType: row.product_type, color: row.color, sku: row.sku,
    ownerEmail: row.owner_email, ownerName: row.owner_name, profileHandle: row.profile_handle, orderId: row.order_id,
    purchaserEmail: row.purchaser_email, replacementForId: row.replacement_for_id, replacedById: row.replaced_by_id,
    claimedAt: row.claimed_at, activatedAt: row.activated_at, lastTappedAt: row.last_tapped_at, tapCount: row.tap_count,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function writeAudit(input: { unitId?: string; batchId?: string; actorEmail: string; actorUserId?: string; actorRole?: "admin" | "user"; action: string; metadata: Record<string, unknown>; request: Request }) {
  await (await auditStatement(input)).run();
}

async function auditStatement(input: { unitId?: string; batchId?: string; actorEmail: string; actorUserId?: string; actorRole?: "admin" | "user"; action: string; metadata: Record<string, unknown>; request: Request }) {
  const actorEmail = normalizeEmail(input.actorEmail);
  return requireDatabase().prepare("INSERT INTO nfc_audit_logs (id,unit_id,batch_id,actor_email,action,metadata_json,request_hash) VALUES (?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(), input.unitId ?? null, input.batchId ?? null, actorEmail, input.action, JSON.stringify(input.metadata).slice(0, 2000), await requestFingerprint(input.request));
}

async function actorIdentifier(actorEmail: string, role: "admin" | "user") {
  const email = normalizeEmail(actorEmail);
  const account = await requireDatabase().prepare("SELECT id FROM taplex_users WHERE email=? LIMIT 1").bind(email).first<{ id: string }>();
  return account?.id ?? `${role}:${email}`;
}

function statusMessage(status: NfcStatus) {
  if (status === "inventory") return "This product has not been released for activation yet.";
  if (status === "frozen") return "This TapLex product is frozen. Contact TapLex support.";
  if (status === "transfer_pending") return "This TapLex product has a transfer in progress.";
  return "This TapLex product has already been claimed.";
}

function normalizeOptionalEmail(value: unknown) {
  const email = normalizeEmail(value);
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid purchaser or recipient email.");
  return email;
}

function cleanCode(value: unknown, maxLength: number) {
  return cleanSingleLine(value, maxLength).toUpperCase().replace(/[^A-Z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^[-_]+|[-_]+$/g, "");
}

function canonicalOrigin(request: Request) {
  const url = new URL(request.url);
  return url.hostname === "taplex.co" || url.hostname === "www.taplex.co" ? "https://taplex.co" : url.origin;
}

function safeFilename(value: string) {
  return value.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100);
}

function safeHost(value: string | null) {
  if (!value) return "";
  try { return new URL(value).hostname.slice(0, 120); } catch { return ""; }
}

async function sendTransferEmail(email: string, url: string, serial: string, idempotencyKey: string) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${runtimeEnv.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": `taplex-transfer-${idempotencyKey}` },
    body: JSON.stringify({
      from: runtimeEnv.PASSWORD_RESET_FROM_EMAIL || "TapLex <accounts@taplex.co>", to: [email], subject: "A TapLex product is ready for you",
      text: `Accept the secure transfer for ${serial}: ${url}\n\nThis one-time link expires in 7 days.`,
      html: `<div style="background:#080808;color:#f4eee3;padding:36px;font-family:Arial,sans-serif"><div style="max-width:560px;margin:auto;border:1px solid #d6a84e;border-radius:18px;padding:32px"><p style="color:#d6a84e;letter-spacing:.16em;font-weight:800">TAPLEX</p><h1 style="font-family:Georgia,serif;font-weight:400">A TapLex product is ready for you</h1><p style="color:#c7c0b6">Sign in with this email to accept the secure transfer for <b>${serial.replace(/[&<>"']/g, "")}</b>.</p><p style="margin:28px 0"><a href="${url.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" style="display:inline-block;background:#d6a84e;color:#080808;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:800">Accept transfer</a></p><p style="color:#8e877d;font-size:12px">The link expires in 7 days. Ownership changes only after you authenticate and accept.</p></div></div>`,
    }),
  });
  if (!response.ok) throw new Error("The transfer invitation could not be emailed. No ownership change was made.");
}

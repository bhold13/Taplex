import { ensureDatabaseSchema } from "@/lib/database";
import { requireDatabase } from "@/lib/runtime";

export type PromoCodeRecord = {
  code: string;
  description: string;
  maxRedemptions: number;
  redemptionCount: number;
  active: boolean;
  duration: "lifetime" | "one_year";
  createdAt: string;
};

type PromoCodeRow = {
  code: string;
  description: string;
  max_redemptions: number;
  redemption_count: number;
  active: number;
  duration_days: number | null;
  created_at: string;
};

export async function listPromoCodes(): Promise<PromoCodeRecord[]> {
  await ensureDatabaseSchema();
  const result = await requireDatabase().prepare(`SELECT code,description,max_redemptions,redemption_count,active,duration_days,created_at
    FROM promo_codes ORDER BY created_at ASC, code ASC`).all<PromoCodeRow>();
  return (result.results ?? []).map(toPromoCode);
}

export async function createPromoCode(raw: unknown): Promise<PromoCodeRecord> {
  await ensureDatabaseSchema();
  const input = parsePromoInput(raw, true);
  const now = new Date().toISOString();
  try {
    await requireDatabase().prepare(`INSERT INTO promo_codes
      (code,description,max_redemptions,redemption_count,active,duration_days,created_at,updated_at)
      VALUES (?,?,?,0,?,?,?,?)`)
      .bind(input.code, input.description, input.maxRedemptions, input.active ? 1 : 0, input.durationDays, now, now).run();
  } catch {
    throw new Error("That Pro code already exists. Edit the existing code or choose a new name.");
  }
  return getPromoCode(input.code);
}

export async function updatePromoCode(raw: unknown): Promise<PromoCodeRecord> {
  await ensureDatabaseSchema();
  const input = parsePromoInput(raw, false);
  const existing = await requireDatabase().prepare("SELECT code,redemption_count FROM promo_codes WHERE code = ? LIMIT 1")
    .bind(input.code).first<{ code: string; redemption_count: number }>();
  if (!existing) throw new Error("That Pro code was not found.");
  if (input.maxRedemptions < existing.redemption_count) {
    throw new Error(`The usage limit cannot be lower than the ${existing.redemption_count} redemptions already used.`);
  }
  await requireDatabase().prepare(`UPDATE promo_codes
    SET description = ?,max_redemptions = ?,active = ?,duration_days = ?,updated_at = ? WHERE code = ?`)
    .bind(input.description, input.maxRedemptions, input.active ? 1 : 0, input.durationDays, new Date().toISOString(), input.code).run();
  return getPromoCode(input.code);
}

async function getPromoCode(code: string) {
  const row = await requireDatabase().prepare(`SELECT code,description,max_redemptions,redemption_count,active,duration_days,created_at
    FROM promo_codes WHERE code = ? LIMIT 1`).bind(code).first<PromoCodeRow>();
  if (!row) throw new Error("That Pro code could not be loaded.");
  return toPromoCode(row);
}

function parsePromoInput(raw: unknown, creating: boolean) {
  if (!raw || typeof raw !== "object") throw new Error("Pro code details are required.");
  const input = raw as Record<string, unknown>;
  const code = String(input.code ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{4,32}$/.test(code)) throw new Error("Use 4–32 letters, numbers, hyphens, or underscores for the code.");
  const description = String(input.description ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
  if (!description) throw new Error("Add a short description for the Pro code.");
  const maxRedemptions = Number(input.maxRedemptions);
  if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1 || maxRedemptions > 100_000) {
    throw new Error("Set a usage limit from 1 to 100,000.");
  }
  const duration = input.duration === "one_year" ? "one_year" : "lifetime";
  return {
    code,
    description,
    maxRedemptions,
    active: creating ? input.active !== false : Boolean(input.active),
    durationDays: duration === "one_year" ? 365 : null,
  };
}

function toPromoCode(row: PromoCodeRow): PromoCodeRecord {
  return {
    code: row.code,
    description: row.description,
    maxRedemptions: row.max_redemptions,
    redemptionCount: row.redemption_count,
    active: Boolean(row.active),
    duration: row.duration_days === 365 ? "one_year" : "lifetime",
    createdAt: row.created_at,
  };
}

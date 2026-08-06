import { ensureDatabaseSchema } from "@/lib/database";
import type { TapLexBooking, TapLexBookingStatus } from "@/lib/profile-model";
import { requireDatabase } from "@/lib/runtime";

type BookingRow = {
  id: string;
  service_title: string;
  requested_date: string;
  requested_time: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  notes: string;
  status: string;
  created_at: string;
};

const BOOKING_STATUSES = new Set<TapLexBookingStatus>(["pending", "confirmed", "declined", "completed"]);

export async function createNativeBooking(handleValue: unknown, raw: unknown) {
  await ensureDatabaseSchema();
  if (!raw || typeof raw !== "object") throw new Error("Booking details are required.");
  const input = raw as Record<string, unknown>;
  if (String(input.website ?? "")) throw new Error("Booking could not be submitted.");

  const handle = String(handleValue ?? "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
  const serviceId = cleanText(input.serviceId, 64);
  const customerName = cleanText(input.customerName, 80);
  const customerEmail = cleanText(input.customerEmail, 120).toLowerCase();
  const customerPhone = cleanText(input.customerPhone, 32);
  const requestedDate = cleanText(input.requestedDate, 10);
  const requestedTime = cleanText(input.requestedTime, 5);
  const notes = cleanText(input.notes, 400);

  if (!customerName) throw new Error("Add your name.");
  if (!customerEmail && !customerPhone) throw new Error("Add an email or phone number so the creator can confirm your booking.");
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) throw new Error("Add a valid email address.");
  if (customerPhone && !/^[0-9+().\-\s]{7,32}$/.test(customerPhone)) throw new Error("Add a valid phone number.");
  validateRequestedDate(requestedDate);
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(requestedTime)) throw new Error("Choose a valid appointment time.");

  const db = requireDatabase();
  const service = await db.prepare(`SELECT p.id AS profile_id,l.id AS service_id,l.title AS service_title
    FROM profiles p JOIN profile_links l ON l.profile_id = p.id
    WHERE p.handle = ? AND p.published = 1 AND p.plan = 'pro'
      AND l.id = ? AND l.kind = 'booking' AND l.platform = 'taplex' AND l.active = 1 LIMIT 1`)
    .bind(handle, serviceId).first<{ profile_id: string; service_id: string; service_title: string }>();
  if (!service) throw new Error("That TapLex service is not available for direct booking.");

  const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recent = await db.prepare(`SELECT COUNT(*) AS request_count FROM profile_bookings
    WHERE profile_id = ? AND created_at >= ? AND ((customer_email <> '' AND customer_email = ?) OR (customer_phone <> '' AND customer_phone = ?))`)
    .bind(service.profile_id, recentCutoff, customerEmail, customerPhone).first<{ request_count: number }>();
  if ((recent?.request_count ?? 0) >= 5) throw new Error("Too many booking requests were sent. Try again tomorrow.");

  const conflict = await db.prepare(`SELECT id FROM profile_bookings
    WHERE profile_id = ? AND requested_date = ? AND requested_time = ? AND status IN ('pending','confirmed') LIMIT 1`)
    .bind(service.profile_id, requestedDate, requestedTime).first<{ id: string }>();
  if (conflict) throw new Error("That time was just requested. Please choose another time.");

  const id = crypto.randomUUID();
  await db.prepare(`INSERT INTO profile_bookings
    (id,profile_id,service_link_id,service_title,requested_date,requested_time,customer_name,customer_email,customer_phone,notes,status)
    VALUES (?,?,?,?,?,?,?,?,?,?,'pending')`)
    .bind(id, service.profile_id, service.service_id, service.service_title, requestedDate, requestedTime, customerName, customerEmail, customerPhone, notes)
    .run();
  return { id, status: "pending" as const, serviceTitle: service.service_title, requestedDate, requestedTime };
}

export async function getOwnerBookings(ownerEmail: string): Promise<TapLexBooking[]> {
  await ensureDatabaseSchema();
  const result = await requireDatabase().prepare(`SELECT b.id,b.service_title,b.requested_date,b.requested_time,b.customer_name,b.customer_email,b.customer_phone,b.notes,b.status,b.created_at
    FROM profile_bookings b JOIN profiles p ON p.id = b.profile_id
    WHERE p.owner_email = ? ORDER BY b.requested_date DESC,b.requested_time DESC,b.created_at DESC LIMIT 100`)
    .bind(ownerEmail.trim().toLowerCase()).all<BookingRow>();
  return (result.results ?? []).map(hydrateBooking);
}

export async function updateOwnerBookingStatus(ownerEmail: string, bookingIdValue: unknown, statusValue: unknown) {
  await ensureDatabaseSchema();
  const bookingId = cleanText(bookingIdValue, 64);
  const status = cleanText(statusValue, 16) as TapLexBookingStatus;
  if (!BOOKING_STATUSES.has(status)) throw new Error("Choose a valid booking status.");
  const result = await requireDatabase().prepare(`UPDATE profile_bookings SET status = ?,updated_at = ?
    WHERE id = ? AND profile_id IN (SELECT id FROM profiles WHERE owner_email = ?)`)
    .bind(status, new Date().toISOString(), bookingId, ownerEmail.trim().toLowerCase()).run();
  if ((result.meta?.changes ?? 0) !== 1) throw new Error("Booking not found.");
  return getOwnerBookings(ownerEmail);
}

function hydrateBooking(row: BookingRow): TapLexBooking {
  return {
    id: row.id,
    serviceTitle: row.service_title,
    requestedDate: row.requested_date,
    requestedTime: row.requested_time,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    notes: row.notes,
    status: BOOKING_STATUSES.has(row.status as TapLexBookingStatus) ? row.status as TapLexBookingStatus : "pending",
    createdAt: row.created_at,
  };
}

function validateRequestedDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Choose a valid appointment date.");
  const requested = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(requested.getTime()) || requested.toISOString().slice(0, 10) !== value) throw new Error("Choose a valid appointment date.");
  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const requestedUtc = new Date(`${value}T00:00:00Z`);
  if (requestedUtc < todayUtc) throw new Error("Choose today or a future date.");
  if (requestedUtc.getTime() > todayUtc.getTime() + 366 * 24 * 60 * 60 * 1000) throw new Error("Bookings can be requested up to one year ahead.");
}

function cleanText(value: unknown, max: number) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

import type { TapLexUser } from "@/lib/taplex-auth";
import { ensureDatabaseSchema } from "@/lib/database";
import {
  bookingProviders,
  profileSkins,
  resolveSocialProfileUrl,
  resolveSupportDestination,
  socialPlatforms,
  supportPlatforms,
  videoEmbedUrl,
  videoPlatforms,
  type ProfileSkin,
  type LocationVisibility,
  type TapLexLink,
  type TapLexGalleryItem,
  type TapLexProfile,
} from "@/lib/profile-model";
import { requireDatabase } from "@/lib/runtime";

type ProfileRow = {
  id: string;
  owner_email: string;
  handle: string;
  display_name: string;
  headline: string;
  bio: string;
  skin: string;
  social_icon_style: string;
  avatar_key: string | null;
  contact_email: string;
  contact_phone: string;
  location_city: string;
  location_region: string;
  location_country: string;
  location_postal_code: string;
  location_latitude: number | null;
  location_longitude: number | null;
  location_visibility: string;
  nearby_discovery: number;
  published: number;
  plan: string;
  pro_unlocked_at: string | null;
  pro_expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  pro_source: string | null;
};

type LinkRow = {
  id: string;
  kind: string;
  platform: string;
  title: string;
  url: string;
  description: string;
  price_label: string;
  duration_minutes: number | null;
  active: number;
  sort_order: number;
};

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{1,28}[a-z0-9])?$/;
const RESERVED_HANDLES = new Set([
  "admin", "api", "connections", "dashboard", "login", "order", "p", "profile", "signup", "launch",
  "signin-with-chatgpt", "signout-with-chatgpt", "callback", "taplex", "www", "support",
]);
const VALID_SKINS = new Set(profileSkins.map((skin) => skin.id));
const VALID_KINDS = new Set(["link", "social", "video", "support", "booking"]);
const VALID_SOCIAL_PLATFORMS = new Set(socialPlatforms.map((platform) => platform.id));
const VALID_VIDEO_PLATFORMS = new Set(videoPlatforms.map((platform) => platform.id));
const VALID_SUPPORT_PLATFORMS = new Set(supportPlatforms.map((platform) => platform.id));
const VALID_BOOKING_PROVIDERS = new Set(bookingProviders.map((provider) => provider.id));
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getOrCreateProfile(user: TapLexUser, preferredSkin: ProfileSkin = "obsidian"): Promise<TapLexProfile> {
  await ensureDatabaseSchema();
  const email = normalizeEmail(user.email);
  const existing = await profileByOwner(email);
  if (existing) return hydrateProfile(existing);

  const id = crypto.randomUUID();
  const handle = await availableHandle(email.split("@")[0] ?? "taplex");
  const displayName = cleanText(user.fullName ?? "My TapLex", 60) || "My TapLex";
  const skin = VALID_SKINS.has(preferredSkin) ? preferredSkin : "obsidian";
  const db = requireDatabase();
  await db.prepare(`INSERT INTO profiles
    (id,owner_email,handle,display_name,headline,bio,skin,contact_email,contact_phone,published)
    VALUES (?,?,?,?,?,?,?,?,?,0)`)
    .bind(id, email, handle, displayName, "Creator · Entrepreneur", "Welcome to my TapLex.", skin, "", "")
    .run();

  const created = await profileByOwner(email);
  if (!created) throw new Error("Your TapLex profile could not be created.");
  return hydrateProfile(created);
}

export async function getPublicProfile(handle: string): Promise<TapLexProfile | null> {
  await ensureDatabaseSchema();
  const normalized = normalizeHandle(handle);
  if (!HANDLE_PATTERN.test(normalized)) return null;

  const row = await requireDatabase().prepare(`SELECT id,owner_email,handle,display_name,headline,bio,skin,social_icon_style,avatar_key,contact_email,contact_phone,location_city,location_region,location_country,location_postal_code,location_latitude,location_longitude,location_visibility,nearby_discovery,published,plan,pro_unlocked_at,pro_expires_at,stripe_customer_id,stripe_subscription_id,pro_source
    FROM profiles WHERE handle = ? AND published = 1 LIMIT 1`).bind(normalized).first<ProfileRow>();
  return row ? hydrateProfile(row, true) : null;
}

export async function isProfileOwner(handle: string, ownerEmail: string) {
  await ensureDatabaseSchema();
  const row = await requireDatabase().prepare("SELECT id FROM profiles WHERE handle=? AND owner_email=? LIMIT 1")
    .bind(normalizeHandle(handle), normalizeEmail(ownerEmail)).first<{ id: string }>();
  return Boolean(row);
}

export async function listOwnerProfiles(ownerEmail: string) {
  await ensureDatabaseSchema();
  const result = await requireDatabase().prepare("SELECT id,handle,display_name,published FROM profiles WHERE owner_email=? ORDER BY updated_at DESC")
    .bind(normalizeEmail(ownerEmail)).all<{ id: string; handle: string; display_name: string; published: number }>();
  return (result.results ?? []).map((profile) => ({ id: profile.id, handle: profile.handle, displayName: profile.display_name, published: Boolean(profile.published) }));
}

export async function saveProfile(ownerEmail: string, raw: unknown): Promise<TapLexProfile> {
  await ensureDatabaseSchema();
  const email = normalizeEmail(ownerEmail);
  const existing = await profileByOwner(email);
  if (!existing) throw new Error("Profile not found.");
  const proActive = hasActivePro(existing);
  const input = parseProfileInput(raw, proActive, existing);
  const socialCount = input.links.filter((link) => link.kind === "social").length;
  if (socialCount > 4 && !proActive) throw new Error("Free TapLex profiles can show up to 4 social icons. Unlock Pro to add more.");
  const mainLinkCount = input.links.filter((link) => link.kind === "link").length;
  if (mainLinkCount > 1 && !proActive) throw new Error("Free TapLex profiles can show 1 main link. Unlock Pro to add unlimited links.");
  if (input.links.some((link) => link.kind === "booking") && !proActive) {
    const grandfathered = await requireDatabase().prepare("SELECT id FROM profile_links WHERE profile_id = ? AND kind = 'booking' LIMIT 1")
      .bind(existing.id).first<{ id: string }>();
    if (!grandfathered) throw new Error("TapLex Pro is required to publish booking services. Redeem your founder code first.");
  }

  const handleOwner = await requireDatabase().prepare("SELECT id FROM profiles WHERE handle = ? AND id <> ? LIMIT 1")
    .bind(input.handle, existing.id).first<{ id: string }>();
  if (handleOwner) throw new Error("That TapLex handle is already taken.");

  const db = requireDatabase();
  const now = new Date().toISOString();
  const statements = [
    db.prepare(`UPDATE profiles SET handle=?,display_name=?,headline=?,bio=?,skin=?,social_icon_style=?,contact_email=?,contact_phone=?,location_city=?,location_region=?,location_country=?,location_postal_code=?,location_latitude=?,location_longitude=?,location_visibility=?,nearby_discovery=?,published=?,updated_at=? WHERE id=?`)
      .bind(input.handle, input.displayName, input.headline, input.bio, input.skin, input.socialIconStyle, input.contactEmail, input.contactPhone, input.locationCity, input.locationRegion, input.locationCountry, input.locationPostalCode, input.locationLatitude, input.locationLongitude, input.locationVisibility, input.nearbyDiscovery ? 1 : 0, input.published ? 1 : 0, now, existing.id),
    db.prepare("DELETE FROM profile_links WHERE profile_id = ?").bind(existing.id),
  ];

  for (const [index, link] of input.links.entries()) {
    statements.push(db.prepare(`INSERT INTO profile_links
      (id,profile_id,kind,platform,title,url,description,price_label,duration_minutes,active,sort_order,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
        UUID_PATTERN.test(link.id) ? link.id : crypto.randomUUID(),
        existing.id,
        link.kind,
        link.platform,
        link.title,
        link.url,
        link.description,
        link.priceLabel,
        link.durationMinutes,
        link.active ? 1 : 0,
        index,
        now,
      ));
  }
  await db.batch(statements);

  const updated = await profileByOwner(email);
  if (!updated) throw new Error("Profile could not be reloaded.");
  return hydrateProfile(updated);
}

export async function updateProfileAvatar(ownerEmail: string, avatarKey: string | null) {
  await ensureDatabaseSchema();
  const email = normalizeEmail(ownerEmail);
  const profile = await profileByOwner(email);
  if (!profile) throw new Error("Profile not found.");
  await requireDatabase().prepare("UPDATE profiles SET avatar_key = ?, updated_at = ? WHERE id = ?")
    .bind(avatarKey, new Date().toISOString(), profile.id).run();
  return profile.avatar_key;
}

export async function redeemFounderCode(ownerEmail: string, rawCode: unknown): Promise<TapLexProfile> {
  await ensureDatabaseSchema();
  const email = normalizeEmail(ownerEmail);
  const profile = await profileByOwner(email);
  if (!profile) throw new Error("Profile not found.");
  if (hasActivePro(profile)) return hydrateProfile(profile);

  const code = normalizePromoCode(rawCode);
  if (!code) throw new Error("Enter your TapLex access code.");
  const db = requireDatabase();
  const offer = await db.prepare("SELECT code,max_redemptions,redemption_count,active,duration_days FROM promo_codes WHERE code = ? LIMIT 1")
    .bind(code).first<{ code: string; max_redemptions: number; redemption_count: number; active: number; duration_days: number | null }>();
  if (!offer || !offer.active) throw new Error("That access code is not valid.");
  if (offer.redemption_count >= offer.max_redemptions) throw new Error("That founder offer has reached its redemption limit.");

  const redemptionId = crypto.randomUUID();
  const now = new Date().toISOString();
  const expiresAt = offer.duration_days
    ? new Date(Date.now() + offer.duration_days * 24 * 60 * 60 * 1000).toISOString()
    : null;
  await db.batch([
    db.prepare("DELETE FROM promo_redemptions WHERE profile_id = ?").bind(profile.id),
    db.prepare(`INSERT INTO promo_redemptions (id,code,profile_id,redeemed_at)
      SELECT ?,code,?,? FROM promo_codes
      WHERE code = ? AND active = 1 AND redemption_count < max_redemptions`)
      .bind(redemptionId, profile.id, now, code),
    db.prepare(`UPDATE promo_codes SET redemption_count = redemption_count + 1, updated_at = ?
      WHERE code = ? AND EXISTS (SELECT 1 FROM promo_redemptions WHERE id = ?)`)
      .bind(now, code, redemptionId),
    db.prepare(`UPDATE profiles SET plan = 'pro', pro_unlocked_at = ?, pro_expires_at = ?, updated_at = ?
      WHERE id = ? AND EXISTS (SELECT 1 FROM promo_redemptions WHERE id = ?)`)
      .bind(now, expiresAt, now, profile.id, redemptionId),
  ]);

  const updated = await profileByOwner(email);
  if (!updated || !hasActivePro(updated)) throw new Error("That code could not be redeemed. Please try again.");
  return hydrateProfile(updated);
}

export async function assertFounderCodeAvailable(rawCode: unknown) {
  await ensureDatabaseSchema();
  const code = normalizePromoCode(rawCode);
  if (!code) throw new Error("Enter your TapLex access code.");
  const offer = await requireDatabase().prepare("SELECT code,max_redemptions,redemption_count,active FROM promo_codes WHERE code = ? LIMIT 1")
    .bind(code).first<{ code: string; max_redemptions: number; redemption_count: number; active: number }>();
  if (!offer || !offer.active) throw new Error("That access code is not valid.");
  if (offer.redemption_count >= offer.max_redemptions) throw new Error("That founder offer has reached its redemption limit.");
  return code;
}

export async function unlockPaidPro(input: { ownerEmail: string; stripeCustomerId: string | null; stripeSubscriptionId: string; expiresAt: string | null }) {
  await ensureDatabaseSchema();
  const email = normalizeEmail(input.ownerEmail);
  const profile = await profileByOwner(email);
  if (!profile) throw new Error("Profile not found.");
  await requireDatabase().prepare(`UPDATE profiles
    SET plan = 'pro',
        pro_unlocked_at = COALESCE(pro_unlocked_at, ?),
        pro_expires_at = ?,
        stripe_customer_id = ?,
        stripe_subscription_id = ?,
        pro_source = 'stripe',
        updated_at = ?
    WHERE id = ?`)
    .bind(new Date().toISOString(), input.expiresAt, input.stripeCustomerId, input.stripeSubscriptionId, new Date().toISOString(), profile.id)
    .run();
}

export async function expirePaidProBySubscription(stripeSubscriptionId: string) {
  await ensureDatabaseSchema();
  if (!stripeSubscriptionId) return;
  await requireDatabase().prepare(`UPDATE profiles
    SET plan = 'free',
        pro_expires_at = ?,
        updated_at = ?
    WHERE stripe_subscription_id = ? AND pro_source = 'stripe'`)
    .bind(new Date().toISOString(), new Date().toISOString(), stripeSubscriptionId)
    .run();
}

async function profileByOwner(email: string) {
  return requireDatabase().prepare(`SELECT id,owner_email,handle,display_name,headline,bio,skin,social_icon_style,avatar_key,contact_email,contact_phone,location_city,location_region,location_country,location_postal_code,location_latitude,location_longitude,location_visibility,nearby_discovery,published,plan,pro_unlocked_at,pro_expires_at,stripe_customer_id,stripe_subscription_id,pro_source
    FROM profiles WHERE owner_email = ? LIMIT 1`).bind(email).first<ProfileRow>();
}

async function hydrateProfile(row: ProfileRow, publicOnly = false): Promise<TapLexProfile> {
  const query = publicOnly
    ? "SELECT id,kind,platform,title,url,description,price_label,duration_minutes,active,sort_order FROM profile_links WHERE profile_id = ? AND active = 1 ORDER BY kind DESC, sort_order ASC"
    : "SELECT id,kind,platform,title,url,description,price_label,duration_minutes,active,sort_order FROM profile_links WHERE profile_id = ? ORDER BY kind DESC, sort_order ASC";
  const result = await requireDatabase().prepare(query).bind(row.id).all<LinkRow>();
  const links: TapLexLink[] = (result.results ?? []).map((link) => ({
    id: link.id,
    kind: VALID_KINDS.has(link.kind) ? link.kind as TapLexLink["kind"] : "link",
    platform: link.platform,
    title: link.title,
    url: link.url,
    description: link.description ?? "",
    priceLabel: link.price_label ?? "",
    durationMinutes: link.duration_minutes ?? null,
    active: Boolean(link.active),
    sortOrder: link.sort_order,
  }));
  const galleryResult = await requireDatabase().prepare("SELECT id,image_key,caption,alt_text,sort_order FROM profile_gallery_items WHERE profile_id = ? ORDER BY sort_order ASC, created_at ASC").bind(row.id).all<{ id: string; image_key: string; caption: string; alt_text: string; sort_order: number }>();
  const gallery: TapLexGalleryItem[] = (galleryResult.results ?? []).map((item) => ({ id: item.id, imageKey: item.image_key, caption: item.caption, altText: item.alt_text, sortOrder: item.sort_order }));
  const proActive = hasActivePro(row);
  return {
    id: row.id,
    handle: row.handle,
    displayName: row.display_name,
    headline: row.headline,
    bio: row.bio,
    skin: VALID_SKINS.has(row.skin as ProfileSkin) ? row.skin as ProfileSkin : "obsidian",
    socialIconStyle: row.social_icon_style === "skin" ? "skin" : "brand",
    avatarKey: row.avatar_key,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    locationCity: row.location_city ?? "",
    locationRegion: row.location_region ?? "",
    locationCountry: row.location_country ?? "",
    locationPostalCode: row.location_postal_code ?? "",
    locationLatitude: publicOnly ? null : row.location_latitude ?? null,
    locationLongitude: publicOnly ? null : row.location_longitude ?? null,
    locationVisibility: ["hidden", "city_state", "city_state_postal"].includes(row.location_visibility) ? row.location_visibility as LocationVisibility : "city_state",
    nearbyDiscovery: publicOnly ? false : Boolean(row.nearby_discovery),
    published: Boolean(row.published),
    plan: proActive ? "pro" : "free",
    proUnlockedAt: row.pro_unlocked_at ?? null,
    proExpiresAt: row.pro_expires_at ?? null,
    isPro: proActive,
    links,
    gallery,
  };
}

function hasActivePro(row: Pick<ProfileRow, "plan" | "pro_expires_at">) {
  if (row.plan !== "pro") return false;
  if (!row.pro_expires_at) return true;
  const expiresAt = Date.parse(row.pro_expires_at);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

function parseProfileInput(raw: unknown, proActive: boolean, existing: ProfileRow) {
  if (!raw || typeof raw !== "object") throw new Error("Profile details are required.");
  const input = raw as Record<string, unknown>;
  const handle = normalizeHandle(String(input.handle ?? ""));
  if (!HANDLE_PATTERN.test(handle) || RESERVED_HANDLES.has(handle)) {
    throw new Error("Use a 3–30 character handle with letters, numbers, hyphens, or underscores.");
  }
  const skin = String(input.skin ?? "obsidian") as ProfileSkin;
  if (!VALID_SKINS.has(skin)) throw new Error("Choose a valid TapLex skin.");
  const socialIconStyle = input.socialIconStyle === "skin" ? "skin" : "brand";

  const displayName = cleanText(input.displayName, 60);
  if (!displayName) throw new Error("Add a display name.");
  const contactEmail = cleanText(input.contactEmail, 120).toLowerCase();
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw new Error("Add a valid contact email.");
  const contactPhone = cleanText(input.contactPhone, 32);
  if (contactPhone && !/^[0-9+().\-\s]{7,32}$/.test(contactPhone)) throw new Error("Add a valid contact phone number.");

  const locationCity = cleanText(input.locationCity, 80);
  const locationRegion = cleanText(input.locationRegion, 80);
  const locationCountry = cleanText(input.locationCountry, 80);
  const locationPostalCode = cleanText(input.locationPostalCode, 16).toUpperCase();
  if (locationPostalCode && !/^[A-Z0-9][A-Z0-9 -]{1,14}[A-Z0-9]$/.test(locationPostalCode)) throw new Error("Add a valid ZIP or postal code.");
  const requestedVisibility = String(input.locationVisibility ?? "city_state");
  const locationVisibility: LocationVisibility = requestedVisibility === "hidden" || requestedVisibility === "city_state_postal" ? requestedVisibility : "city_state";
  const hasLatitude = input.locationLatitude !== null && input.locationLatitude !== undefined && input.locationLatitude !== "";
  const hasLongitude = input.locationLongitude !== null && input.locationLongitude !== undefined && input.locationLongitude !== "";
  const locationLatitude = hasLatitude ? Number(input.locationLatitude) : null;
  const locationLongitude = hasLongitude ? Number(input.locationLongitude) : null;
  if (hasLatitude !== hasLongitude || (locationLatitude !== null && (!Number.isFinite(locationLatitude) || locationLatitude < -90 || locationLatitude > 90)) || (locationLongitude !== null && (!Number.isFinite(locationLongitude) || locationLongitude < -180 || locationLongitude > 180))) {
    throw new Error("Your precise location could not be verified. Try your device location again.");
  }
  const existingLatitude = existing.location_latitude ?? null;
  const existingLongitude = existing.location_longitude ?? null;
  const addsPostal = Boolean(locationPostalCode) && locationPostalCode !== (existing.location_postal_code ?? "");
  const changesPrecise = locationLatitude !== null && locationLongitude !== null && (locationLatitude !== existingLatitude || locationLongitude !== existingLongitude);
  const addsPostalVisibility = locationVisibility === "city_state_postal" && existing.location_visibility !== "city_state_postal";
  if (!proActive && (addsPostal || changesPrecise || addsPostalVisibility)) {
    throw new Error("ZIP code and precise-location tools are TapLex Pro features. City and state remain free.");
  }

  if (!Array.isArray(input.links) || input.links.length > 60) throw new Error("A TapLex profile can contain up to 60 content cards.");
  const links = input.links.map((value, index) => parseLink(value, index));
  return {
    handle,
    displayName,
    headline: cleanText(input.headline, 80),
    bio: cleanText(input.bio, 220),
    skin,
    socialIconStyle,
    contactEmail,
    contactPhone,
    locationCity,
    locationRegion,
    locationCountry,
    locationPostalCode,
    locationLatitude: locationLatitude === null ? null : Number(locationLatitude.toFixed(5)),
    locationLongitude: locationLongitude === null ? null : Number(locationLongitude.toFixed(5)),
    locationVisibility,
    nearbyDiscovery: Boolean(input.nearbyDiscovery),
    published: Boolean(input.published),
    links,
  };
}

function parseLink(raw: unknown, index: number): TapLexLink {
  if (!raw || typeof raw !== "object") throw new Error(`Link ${index + 1} is invalid.`);
  const input = raw as Record<string, unknown>;
  const kind = String(input.kind ?? "link");
  if (!VALID_KINDS.has(kind)) throw new Error(`Link ${index + 1} has an invalid type.`);
  const title = cleanText(input.title, 70);
  if (!title) throw new Error(`Link ${index + 1} needs a title.`);
  const platform = cleanText(input.platform, 32).toLowerCase() || "website";
  if (kind === "social" && !VALID_SOCIAL_PLATFORMS.has(platform as typeof socialPlatforms[number]["id"])) {
    throw new Error(`Link ${index + 1} uses an unsupported social platform.`);
  }
  if (kind === "video" && !VALID_VIDEO_PLATFORMS.has(platform as typeof videoPlatforms[number]["id"])) {
    throw new Error(`Video ${index + 1} uses an unsupported platform.`);
  }
  if (kind === "support" && !VALID_SUPPORT_PLATFORMS.has(platform as typeof supportPlatforms[number]["id"])) {
    throw new Error(`Support option ${index + 1} uses an unsupported payment app.`);
  }
  if (kind === "booking" && !VALID_BOOKING_PROVIDERS.has(platform as typeof bookingProviders[number]["id"])) {
    throw new Error(`Service ${index + 1} uses an unsupported booking provider.`);
  }

  let description = cleanText(input.description, kind === "booking" ? 180 : 120);
  let rawUrl = kind === "social" ? resolveSocialProfileUrl(platform, String(input.url ?? "")) : String(input.url ?? "");
  if (kind === "booking" && platform === "taplex") rawUrl = "https://taplex.co/booking";
  if (kind === "support") {
    const support = resolveSupportDestination(platform, description || String(input.url ?? ""));
    description = support.recipient;
    rawUrl = support.url;
  }
  const url = safePublicUrl(rawUrl);
  if (kind === "video") validateVideoHost(platform, url);
  const priceLabel = kind === "booking" ? cleanText(input.priceLabel, 32) : "";
  const durationValue = Number(input.durationMinutes);
  const durationMinutes = kind === "booking" && Number.isInteger(durationValue) && durationValue >= 0 && durationValue <= 1440
    ? durationValue || null
    : null;
  return {
    id: String(input.id ?? ""),
    kind: kind as TapLexLink["kind"],
    platform,
    title,
    url,
    description,
    priceLabel,
    durationMinutes,
    active: input.active !== false,
    sortOrder: index,
  };
}

function validateVideoHost(platform: string, value: string) {
  const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
  const allowed: Record<string, string[]> = {
    youtube: ["youtube.com", "youtu.be", "m.youtube.com"],
    vimeo: ["vimeo.com", "player.vimeo.com"],
    tiktok: ["tiktok.com", "vm.tiktok.com"],
  };
  if (!(allowed[platform] ?? []).some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
    throw new Error(`Paste a valid ${videoPlatforms.find((item) => item.id === platform)?.name ?? "video"} link.`);
  }
  if (!videoEmbedUrl(platform, value)) {
    throw new Error(`Paste the full URL for one playable ${videoPlatforms.find((item) => item.id === platform)?.name ?? "video"} video.`);
  }
}

function safePublicUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error("Every link needs a complete https:// or http:// address.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Links must use https:// or http://.");
  if (url.username || url.password) throw new Error("Links cannot include embedded usernames or passwords.");
  return url.toString().slice(0, 2048);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePromoCode(value: unknown) {
  return String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 32);
}

function normalizeHandle(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
}

function cleanText(value: unknown, max: number) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

async function availableHandle(seed: string) {
  const base = normalizeHandle(seed).replace(/^[_-]+|[_-]+$/g, "").slice(0, 24) || "taplex";
  const safeBase = base.length >= 3 && !RESERVED_HANDLES.has(base) ? base : `taplex-${base}`.slice(0, 24);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = attempt === 0 ? safeBase : `${safeBase}-${String(attempt + 1).padStart(2, "0")}`.slice(0, 30);
    const taken = await requireDatabase().prepare("SELECT id FROM profiles WHERE handle = ? LIMIT 1").bind(candidate).first();
    if (!taken) return candidate;
  }
  return `taplex-${crypto.randomUUID().slice(0, 8)}`;
}

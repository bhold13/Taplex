import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  inventory: integer("inventory").notNull().default(0),
  trackInventory: integer("track_inventory", { mode: "boolean" }).notNull().default(false),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  imageKey: text("image_key"),
  imageAlt: text("image_alt").notNull().default(""),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("products_slug_unique").on(table.slug),
  index("products_active_idx").on(table.active, table.createdAt),
]);

export const orders = sqliteTable("orders", {
  id: text("id").primaryKey(),
  checkoutSessionId: text("checkout_session_id").notNull(),
  status: text("status").notNull(),
  amountTotal: integer("amount_total").notNull().default(0),
  currency: text("currency").notNull().default("usd"),
  customerEmail: text("customer_email"),
  cartJson: text("cart_json").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("orders_checkout_session_unique").on(table.checkoutSessionId),
  index("orders_created_at_idx").on(table.createdAt),
]);

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  ownerEmail: text("owner_email").notNull(),
  handle: text("handle").notNull(),
  displayName: text("display_name").notNull(),
  headline: text("headline").notNull().default(""),
  bio: text("bio").notNull().default(""),
  skin: text("skin").notNull().default("obsidian"),
  socialIconStyle: text("social_icon_style").notNull().default("brand"),
  avatarKey: text("avatar_key"),
  contactEmail: text("contact_email").notNull().default(""),
  contactPhone: text("contact_phone").notNull().default(""),
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  plan: text("plan").notNull().default("free"),
  proUnlockedAt: text("pro_unlocked_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("profiles_owner_email_unique").on(table.ownerEmail),
  uniqueIndex("profiles_handle_unique").on(table.handle),
  index("profiles_published_idx").on(table.published, table.handle),
]);

export const profileLinks = sqliteTable("profile_links", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  kind: text("kind").notNull().default("link"),
  platform: text("platform").notNull().default("website"),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description").notNull().default(""),
  priceLabel: text("price_label").notNull().default(""),
  durationMinutes: integer("duration_minutes"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("profile_links_profile_order_idx").on(table.profileId, table.kind, table.sortOrder),
]);

export const profileGalleryItems = sqliteTable("profile_gallery_items", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  imageKey: text("image_key").notNull(),
  caption: text("caption").notNull().default(""),
  altText: text("alt_text").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("profile_gallery_profile_order_idx").on(table.profileId, table.sortOrder)]);

export const promoCodes = sqliteTable("promo_codes", {
  code: text("code").primaryKey(),
  description: text("description").notNull().default(""),
  maxRedemptions: integer("max_redemptions").notNull(),
  redemptionCount: integer("redemption_count").notNull().default(0),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const promoRedemptions = sqliteTable("promo_redemptions", {
  id: text("id").primaryKey(),
  code: text("code").notNull().references(() => promoCodes.code),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  redeemedAt: text("redeemed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("promo_redemptions_profile_unique").on(table.profileId),
  index("promo_redemptions_code_idx").on(table.code, table.redeemedAt),
]);

export const profileBookings = sqliteTable("profile_bookings", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  serviceLinkId: text("service_link_id").notNull(),
  serviceTitle: text("service_title").notNull(),
  requestedDate: text("requested_date").notNull(),
  requestedTime: text("requested_time").notNull(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull().default(""),
  customerPhone: text("customer_phone").notNull().default(""),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("profile_bookings_profile_date_idx").on(table.profileId, table.requestedDate, table.requestedTime),
  index("profile_bookings_status_idx").on(table.profileId, table.status, table.createdAt),
]);

export const taplexUsers = sqliteTable("taplex_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash"),
  passwordSalt: text("password_salt"),
  googleSub: text("google_sub"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("taplex_users_email_unique").on(table.email),
  uniqueIndex("taplex_users_google_sub_unique").on(table.googleSub),
]);

export const taplexSessions = sqliteTable("taplex_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: text("user_id").notNull().references(() => taplexUsers.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("taplex_sessions_user_idx").on(table.userId, table.expiresAt)]);

export const connections = sqliteTable("connections", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id").notNull().references(() => taplexUsers.id, { onDelete: "cascade" }),
  connectedProfileId: text("connected_profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  note: text("note").notNull().default(""),
  metAt: text("met_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("connections_owner_profile_unique").on(table.ownerUserId, table.connectedProfileId),
  index("connections_owner_met_idx").on(table.ownerUserId, table.metAt),
]);

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => taplexUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  uniqueIndex("password_reset_tokens_hash_unique").on(table.tokenHash),
  index("password_reset_tokens_user_idx").on(table.userId, table.expiresAt),
]);

export const authAttempts = sqliteTable("auth_attempts", {
  key: text("key").primaryKey(),
  attemptCount: integer("attempt_count").notNull().default(0),
  windowStartedAt: text("window_started_at").notNull(),
});

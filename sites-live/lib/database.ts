import { requireDatabase } from "@/lib/runtime";

let schemaPromise: Promise<void> | null = null;

export function ensureDatabaseSchema() {
  if (!schemaPromise) {
    schemaPromise = initializeSchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

async function initializeSchema() {
  const db = requireDatabase();
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT DEFAULT '' NOT NULL,
      price_cents INTEGER NOT NULL,
      currency TEXT DEFAULT 'usd' NOT NULL,
      inventory INTEGER DEFAULT 0 NOT NULL,
      track_inventory INTEGER DEFAULT 0 NOT NULL,
      active INTEGER DEFAULT 1 NOT NULL,
      image_key TEXT,
      image_alt TEXT DEFAULT '' NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS products_slug_unique ON products (slug)"),
    db.prepare("CREATE INDEX IF NOT EXISTS products_active_idx ON products (active, created_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS app_migrations (
      id TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY NOT NULL,
      checkout_session_id TEXT NOT NULL,
      status TEXT NOT NULL,
      amount_total INTEGER DEFAULT 0 NOT NULL,
      currency TEXT DEFAULT 'usd' NOT NULL,
      customer_email TEXT,
      cart_json TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_session_unique ON orders (checkout_session_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY NOT NULL,
      owner_email TEXT NOT NULL,
      handle TEXT NOT NULL,
      display_name TEXT NOT NULL,
      headline TEXT DEFAULT '' NOT NULL,
      bio TEXT DEFAULT '' NOT NULL,
      skin TEXT DEFAULT 'obsidian' NOT NULL,
      social_icon_style TEXT DEFAULT 'brand' NOT NULL,
      avatar_key TEXT,
      contact_email TEXT DEFAULT '' NOT NULL,
      contact_phone TEXT DEFAULT '' NOT NULL,
      location_city TEXT DEFAULT '' NOT NULL,
      location_region TEXT DEFAULT '' NOT NULL,
      location_country TEXT DEFAULT '' NOT NULL,
      location_postal_code TEXT DEFAULT '' NOT NULL,
      location_latitude REAL,
      location_longitude REAL,
      location_visibility TEXT DEFAULT 'city_state' NOT NULL,
      nearby_discovery INTEGER DEFAULT 0 NOT NULL,
      published INTEGER DEFAULT 0 NOT NULL,
      plan TEXT DEFAULT 'free' NOT NULL,
      pro_unlocked_at TEXT,
      pro_expires_at TEXT,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      pro_source TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS profiles_owner_email_unique ON profiles (owner_email)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS profiles_handle_unique ON profiles (handle)"),
    db.prepare("CREATE INDEX IF NOT EXISTS profiles_published_idx ON profiles (published, handle)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS profile_links (
      id TEXT PRIMARY KEY NOT NULL,
      profile_id TEXT NOT NULL,
      kind TEXT DEFAULT 'link' NOT NULL,
      platform TEXT DEFAULT 'website' NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT DEFAULT '' NOT NULL,
      price_label TEXT DEFAULT '' NOT NULL,
      duration_minutes INTEGER,
      active INTEGER DEFAULT 1 NOT NULL,
      sort_order INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON UPDATE NO ACTION ON DELETE CASCADE
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS profile_links_profile_order_idx ON profile_links (profile_id, kind, sort_order)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS profile_gallery_items (
      id TEXT PRIMARY KEY NOT NULL,
      profile_id TEXT NOT NULL,
      image_key TEXT NOT NULL,
      caption TEXT DEFAULT '' NOT NULL,
      alt_text TEXT DEFAULT '' NOT NULL,
      sort_order INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS profile_gallery_profile_order_idx ON profile_gallery_items (profile_id, sort_order)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS promo_codes (
      code TEXT PRIMARY KEY NOT NULL,
      description TEXT DEFAULT '' NOT NULL,
      max_redemptions INTEGER NOT NULL,
      redemption_count INTEGER DEFAULT 0 NOT NULL,
      active INTEGER DEFAULT 1 NOT NULL,
      duration_days INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS promo_redemptions (
      id TEXT PRIMARY KEY NOT NULL,
      code TEXT NOT NULL,
      profile_id TEXT NOT NULL,
      redeemed_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (code) REFERENCES promo_codes(code) ON UPDATE NO ACTION ON DELETE NO ACTION,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON UPDATE NO ACTION ON DELETE CASCADE
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS promo_redemptions_profile_unique ON promo_redemptions (profile_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS promo_redemptions_code_idx ON promo_redemptions (code, redeemed_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS profile_bookings (
      id TEXT PRIMARY KEY NOT NULL,
      profile_id TEXT NOT NULL,
      service_link_id TEXT NOT NULL,
      service_title TEXT NOT NULL,
      requested_date TEXT NOT NULL,
      requested_time TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT DEFAULT '' NOT NULL,
      customer_phone TEXT DEFAULT '' NOT NULL,
      notes TEXT DEFAULT '' NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON UPDATE NO ACTION ON DELETE CASCADE
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS profile_bookings_profile_date_idx ON profile_bookings (profile_id, requested_date, requested_time)"),
    db.prepare("CREATE INDEX IF NOT EXISTS profile_bookings_status_idx ON profile_bookings (profile_id, status, created_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS taplex_users (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT,
      password_salt TEXT,
      google_sub TEXT,
      apple_sub TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS taplex_users_email_unique ON taplex_users (email)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS taplex_users_google_sub_unique ON taplex_users (google_sub)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS taplex_sessions (
      token_hash TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (user_id) REFERENCES taplex_users(id) ON UPDATE NO ACTION ON DELETE CASCADE
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS taplex_sessions_user_idx ON taplex_sessions (user_id, expires_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY NOT NULL,
      owner_user_id TEXT NOT NULL,
      connected_profile_id TEXT NOT NULL,
      note TEXT DEFAULT '' NOT NULL,
      met_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (owner_user_id) REFERENCES taplex_users(id) ON DELETE CASCADE,
      FOREIGN KEY (connected_profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS connections_owner_profile_unique ON connections (owner_user_id, connected_profile_id)"),
    db.prepare("CREATE INDEX IF NOT EXISTS connections_owner_met_idx ON connections (owner_user_id, met_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (user_id) REFERENCES taplex_users(id) ON UPDATE NO ACTION ON DELETE CASCADE
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS password_reset_tokens_hash_unique ON password_reset_tokens (token_hash)"),
    db.prepare("CREATE INDEX IF NOT EXISTS password_reset_tokens_user_idx ON password_reset_tokens (user_id, expires_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS auth_attempts (
      key TEXT PRIMARY KEY NOT NULL,
      attempt_count INTEGER DEFAULT 0 NOT NULL,
      window_started_at TEXT NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS magic_link_tokens (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      return_to TEXT DEFAULT '/dashboard' NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS magic_link_tokens_hash_unique ON magic_link_tokens (token_hash)"),
    db.prepare("CREATE INDEX IF NOT EXISTS magic_link_tokens_email_idx ON magic_link_tokens (email, expires_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS nfc_batches (
      id TEXT PRIMARY KEY NOT NULL,
      batch_number TEXT NOT NULL,
      product_type TEXT NOT NULL,
      color TEXT DEFAULT '' NOT NULL,
      sku TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      created_by_email TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS nfc_batches_number_unique ON nfc_batches (batch_number)"),
    db.prepare("CREATE INDEX IF NOT EXISTS nfc_batches_created_idx ON nfc_batches (created_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS nfc_units (
      id TEXT PRIMARY KEY NOT NULL,
      batch_id TEXT NOT NULL,
      serial_number TEXT NOT NULL,
      slug_hash TEXT NOT NULL,
      status TEXT DEFAULT 'inventory' NOT NULL,
      status_before_freeze TEXT,
      owner_user_id TEXT,
      profile_id TEXT,
      order_id TEXT,
      purchaser_email TEXT,
      replacement_for_id TEXT,
      replaced_by_id TEXT,
      claimed_at TEXT,
      activated_at TEXT,
      last_tapped_at TEXT,
      tap_count INTEGER DEFAULT 0 NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (batch_id) REFERENCES nfc_batches(id) ON UPDATE NO ACTION ON DELETE RESTRICT,
      FOREIGN KEY (owner_user_id) REFERENCES taplex_users(id) ON UPDATE NO ACTION ON DELETE SET NULL,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON UPDATE NO ACTION ON DELETE SET NULL
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS nfc_units_serial_unique ON nfc_units (serial_number)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS nfc_units_slug_hash_unique ON nfc_units (slug_hash)"),
    db.prepare("CREATE INDEX IF NOT EXISTS nfc_units_status_idx ON nfc_units (status, updated_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS nfc_units_batch_idx ON nfc_units (batch_id, serial_number)"),
    db.prepare("CREATE INDEX IF NOT EXISTS nfc_units_owner_idx ON nfc_units (owner_user_id, status)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS nfc_secure_tags (
      unit_id TEXT PRIMARY KEY NOT NULL,
      public_id TEXT NOT NULL,
      chip_type TEXT DEFAULT 'NTAG424DNA' NOT NULL,
      uid_hex TEXT NOT NULL,
      security_mode TEXT DEFAULT 'sdm' NOT NULL,
      key_mode TEXT DEFAULT 'development' NOT NULL,
      destination_path TEXT,
      status TEXT DEFAULT 'active' NOT NULL,
      highest_counter INTEGER DEFAULT 0 NOT NULL,
      verified_tap_count INTEGER DEFAULT 0 NOT NULL,
      replay_count INTEGER DEFAULT 0 NOT NULL,
      invalid_count INTEGER DEFAULT 0 NOT NULL,
      last_verified_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (unit_id) REFERENCES nfc_units(id) ON UPDATE NO ACTION ON DELETE CASCADE
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS nfc_secure_tags_public_id_unique ON nfc_secure_tags (public_id)"),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS nfc_secure_tags_uid_unique ON nfc_secure_tags (uid_hex)"),
    db.prepare("CREATE INDEX IF NOT EXISTS nfc_secure_tags_status_idx ON nfc_secure_tags (status, updated_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS nfc_tap_events (
      id TEXT PRIMARY KEY NOT NULL,
      unit_id TEXT NOT NULL,
      event_minute TEXT NOT NULL,
      visitor_hash TEXT NOT NULL,
      referrer_host TEXT DEFAULT '' NOT NULL,
      device_class TEXT DEFAULT 'other' NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (unit_id) REFERENCES nfc_units(id) ON UPDATE NO ACTION ON DELETE CASCADE
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS nfc_tap_events_dedupe_unique ON nfc_tap_events (unit_id, event_minute, visitor_hash)"),
    db.prepare("CREATE INDEX IF NOT EXISTS nfc_tap_events_unit_idx ON nfc_tap_events (unit_id, created_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS nfc_transfers (
      id TEXT PRIMARY KEY NOT NULL,
      unit_id TEXT NOT NULL,
      initiated_by_email TEXT NOT NULL,
      recipient_email TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      status TEXT DEFAULT 'pending' NOT NULL,
      expires_at TEXT NOT NULL,
      accepted_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (unit_id) REFERENCES nfc_units(id) ON UPDATE NO ACTION ON DELETE CASCADE
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS nfc_transfers_token_unique ON nfc_transfers (token_hash)"),
    db.prepare("CREATE INDEX IF NOT EXISTS nfc_transfers_unit_idx ON nfc_transfers (unit_id, status, created_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS nfc_audit_logs (
      id TEXT PRIMARY KEY NOT NULL,
      unit_id TEXT,
      batch_id TEXT,
      actor_email TEXT NOT NULL,
      action TEXT NOT NULL,
      metadata_json TEXT DEFAULT '{}' NOT NULL,
      request_hash TEXT DEFAULT '' NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (unit_id) REFERENCES nfc_units(id) ON UPDATE NO ACTION ON DELETE SET NULL,
      FOREIGN KEY (batch_id) REFERENCES nfc_batches(id) ON UPDATE NO ACTION ON DELETE SET NULL
    )`),
    db.prepare("CREATE INDEX IF NOT EXISTS nfc_audit_logs_created_idx ON nfc_audit_logs (created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS nfc_audit_logs_unit_idx ON nfc_audit_logs (unit_id, created_at)"),
    db.prepare(`CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY NOT NULL,
      owner_email TEXT NOT NULL,
      token TEXT NOT NULL,
      token_hash TEXT NOT NULL,
      platform TEXT DEFAULT '' NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
      revoked_at TEXT
    )`),
    db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_token_hash_unique ON push_subscriptions (token_hash)"),
    db.prepare("CREATE INDEX IF NOT EXISTS push_subscriptions_owner_idx ON push_subscriptions (owner_email, revoked_at, updated_at)"),
    db.prepare(`INSERT OR IGNORE INTO profiles
      (id,owner_email,handle,display_name,headline,bio,skin,contact_email,contact_phone,published)
      VALUES ('33333333-3333-4333-8333-333333333333','demo@taplex.local','taplex-demo','B-Hold da General','Artist · Barber · Creator','Building culture through sound, style, and connection.','obsidian','','',1)`),
    db.prepare(`INSERT OR IGNORE INTO profile_links
      (id,profile_id,kind,platform,title,url,active,sort_order)
      VALUES ('44444444-4444-4444-8444-444444444441','33333333-3333-4333-8333-333333333333','social','instagram','Instagram','https://www.instagram.com/bholddageneral/',1,0)`),
    db.prepare(`INSERT OR IGNORE INTO profile_links
      (id,profile_id,kind,platform,title,url,active,sort_order)
      VALUES ('44444444-4444-4444-8444-444444444442','33333333-3333-4333-8333-333333333333','link','music','Latest music','https://www.instagram.com/bholddageneral/',1,0)`),
    db.prepare(`INSERT OR IGNORE INTO profile_links
      (id,profile_id,kind,platform,title,url,active,sort_order)
      VALUES ('44444444-4444-4444-8444-444444444443','33333333-3333-4333-8333-333333333333','link','calendar','Book a cut','https://www.instagram.com/bholddageneral/',1,1)`),
    db.prepare(`INSERT OR IGNORE INTO profile_links
      (id,profile_id,kind,platform,title,url,active,sort_order)
      VALUES ('44444444-4444-4444-8444-444444444444','33333333-3333-4333-8333-333333333333','link','video','Watch my story','https://www.instagram.com/bholddageneral/',1,2)`),
  ]);

  await addColumnIfMissing("profile_links", "description", "TEXT DEFAULT '' NOT NULL");
  await addColumnIfMissing("profile_links", "price_label", "TEXT DEFAULT '' NOT NULL");
  await addColumnIfMissing("profile_links", "duration_minutes", "INTEGER");
  await addColumnIfMissing("profiles", "plan", "TEXT DEFAULT 'free' NOT NULL");
  await addColumnIfMissing("profiles", "pro_unlocked_at", "TEXT");
  await addColumnIfMissing("profiles", "pro_expires_at", "TEXT");
  await addColumnIfMissing("profiles", "stripe_customer_id", "TEXT");
  await addColumnIfMissing("profiles", "stripe_subscription_id", "TEXT");
  await addColumnIfMissing("profiles", "pro_source", "TEXT");
  await addColumnIfMissing("profiles", "social_icon_style", "TEXT DEFAULT 'brand' NOT NULL");
  await addColumnIfMissing("profiles", "location_city", "TEXT DEFAULT '' NOT NULL");
  await addColumnIfMissing("profiles", "location_region", "TEXT DEFAULT '' NOT NULL");
  await addColumnIfMissing("profiles", "location_country", "TEXT DEFAULT '' NOT NULL");
  await addColumnIfMissing("profiles", "location_postal_code", "TEXT DEFAULT '' NOT NULL");
  await addColumnIfMissing("profiles", "location_latitude", "REAL");
  await addColumnIfMissing("profiles", "location_longitude", "REAL");
  await addColumnIfMissing("profiles", "location_visibility", "TEXT DEFAULT 'city_state' NOT NULL");
  await addColumnIfMissing("profiles", "nearby_discovery", "INTEGER DEFAULT 0 NOT NULL");
  await addColumnIfMissing("taplex_users", "apple_sub", "TEXT");
  await addColumnIfMissing("promo_codes", "duration_days", "INTEGER");
  await db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS taplex_users_apple_sub_unique ON taplex_users (apple_sub)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS profiles_nearby_idx ON profiles (nearby_discovery, location_country, location_region, location_city)").run();
  await applyOfficialWristbandCatalog();
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO promo_codes
      (code,description,max_redemptions,redemption_count,active,duration_days)
      VALUES ('FIRSTTAP100','TapLex Founder Pro — lifetime access for the first 100 members',100,0,1,NULL)`),
    db.prepare(`INSERT OR IGNORE INTO promo_codes
      (code,description,max_redemptions,redemption_count,active,duration_days)
      VALUES ('TAPLEX1YEAR','TapLex Pro — one year of access',100,0,1,365)`),
  ]);
}

async function applyOfficialWristbandCatalog() {
  const db = requireDatabase();
  const migrationId = "2026-07-21-official-wristband-colors-v1";
  const applied = await db.prepare("SELECT id FROM app_migrations WHERE id = ? LIMIT 1").bind(migrationId).all<{ id: string }>();
  if ((applied.results ?? []).length > 0) return;

  const description = (color: string) => `Official ${color} TapLex waterproof silicone NFC wristband. Tap to share your permanent digital profile, with a printed QR backup and activation support included.`;
  await db.batch([
    officialWristbandStatement(db, "7d5177a8-6f10-4aa9-8c25-5f4f4c1a0101", "Black", description("black"), "taplex-wristband-black.webp"),
    officialWristbandStatement(db, "7d5177a8-6f10-4aa9-8c25-5f4f4c1a0102", "Blue", description("blue"), "taplex-wristband-blue.webp"),
    officialWristbandStatement(db, "7d5177a8-6f10-4aa9-8c25-5f4f4c1a0103", "Gray", description("gray"), "taplex-wristband-gray.webp"),
    officialWristbandStatement(db, "7d5177a8-6f10-4aa9-8c25-5f4f4c1a0104", "Pink", description("pink"), "taplex-wristband-pink.webp"),
    officialWristbandStatement(db, "7d5177a8-6f10-4aa9-8c25-5f4f4c1a0105", "Purple", description("purple"), "taplex-wristband-purple.webp"),
    db.prepare("UPDATE products SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id IN (?, ?)").bind(
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ),
    db.prepare("INSERT OR IGNORE INTO app_migrations (id) VALUES (?)").bind(migrationId),
  ]);
}

function officialWristbandStatement(
  db: ReturnType<typeof requireDatabase>,
  id: string,
  color: string,
  description: string,
  imageFilename: string,
) {
  return db.prepare(`INSERT OR IGNORE INTO products
    (id,name,slug,description,price_cents,currency,inventory,track_inventory,active,image_key,image_alt)
    VALUES (?,?,?,?,5000,'usd',0,0,1,?,?)`).bind(
    id,
    `TapLex NFC Wristband — ${color}`,
    `taplex-nfc-wristband-${color.toLowerCase()}`,
    description,
    `static:${imageFilename}`,
    `${color} TapLex waterproof silicone NFC wristband with QR code`,
  );
}

async function addColumnIfMissing(table: string, column: string, definition: string) {
  const db = requireDatabase();
  const fields = await db.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
  if ((fields.results ?? []).some((field) => field.name === column)) return;
  await db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
}

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

const testEnv = {
  ASSETS: {
    fetch: async () => new Response("Not found", { status: 404 }),
  },
};

const testContext = {
  waitUntil() {},
  passThroughOnException() {},
};

test("renders every public sales route with security headers", async () => {
  const worker = await loadWorker();

  for (const path of ["/", "/offline", "/login", "/signup", "/forgot-password", "/reset-password", "/launch", "/order", "/order/success"]) {
    const response = await worker.fetch(
      new Request(`http://localhost${path}`, {
        headers: { accept: "text/html" },
      }),
      testEnv,
      testContext,
    );

    assert.equal(response.status, 200, path);
    assert.match(
      response.headers.get("content-type") ?? "",
      /^text\/html\b/i,
      path,
    );
    const html = await response.text();
    assert.match(html, developmentPreviewMeta, path);
    if (path === "/") {
      assert.match(html, /STYLISTS/i);
      assert.match(html, /The story behind the tap/i);
      assert.match(html, /Share TapLex/i);
      assert.match(html, /My Profile/i);
      assert.match(html, /Each color/i);
      assert.match(html, /\$50/i);
      assert.match(html, /manifest\.webmanifest/i);
      assert.match(html, /pwa-launch-splash/i);
      assert.doesNotMatch(html, />Install App</i);
      for (const skin of ["obsidian", "royal", "ocean", "sunset", "emerald", "cosmic", "rose", "canvas"]) {
        assert.match(html, new RegExp(`/signup\\?skin=${skin}`), `homepage ${skin} profile path`);
      }
      assert.match(html, /Use this background/i);
    }
    if (path === "/offline") assert.match(html, /Your network is still with you/i);
    if (path === "/order") assert.match(html, /Five signature colors/i);
    if (path === "/signup") {
      assert.match(html, /Have a TapLex access code/i);
      assert.match(html, /Founder or promo code/i);
    }
    if (path === "/login") assert.match(html, /Forgot password/i);
    if (path === "/forgot-password") assert.match(html, /Send reset link/i);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff", path);
    assert.equal(response.headers.get("x-frame-options"), "DENY", path);
    assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/, path);
    assert.match(response.headers.get("content-security-policy") ?? "", /frame-src https:\/\/www\.youtube\.com https:\/\/www\.youtube-nocookie\.com https:\/\/player\.vimeo\.com https:\/\/www\.tiktok\.com/, path);
  }

  const selectedSkinSignup = await worker.fetch(new Request("http://localhost/signup?skin=royal", { headers: { accept: "text/html" } }), testEnv, testContext);
  assert.equal(selectedSkinSignup.status, 200);
  const selectedSkinSignupHtml = await selectedSkinSignup.text();
  assert.match(selectedSkinSignupHtml, /Selected background/i);
  assert.match(selectedSkinSignupHtml, /Royal Purple/i);
  assert.match(selectedSkinSignupHtml, /return_to=%2Fdashboard%3Fskin%3Droyal/i);

  const invalidSkinSignup = await worker.fetch(new Request("http://localhost/signup?skin=not-a-skin", { headers: { accept: "text/html" } }), testEnv, testContext);
  assert.equal(invalidSkinSignup.status, 200);
  assert.doesNotMatch(await invalidSkinSignup.text(), /Selected background/i);
});

test("ships a complete installable PWA without caching private or mutable NFC routes", async () => {
  const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.name, "TapLex");
  assert.equal(manifest.short_name, "TapLex");
  assert.equal(manifest.description, "Premium NFC networking platform.");
  assert.equal(manifest.theme_color, "#D4AF37");
  assert.equal(manifest.background_color, "#000000");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.orientation, "portrait");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");

  const requiredSizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
  for (const size of requiredSizes) {
    const icon = await readFile(new URL(`../public/pwa/icon-${size}x${size}.png`, import.meta.url));
    assert.equal(icon.readUInt32BE(16), size, `${size}px icon width`);
    assert.equal(icon.readUInt32BE(20), size, `${size}px icon height`);
  }
  const maskable = manifest.icons.find((icon) => icon.purpose === "maskable");
  assert.equal(maskable?.sizes, "512x512");
  const maskableBytes = await readFile(new URL(`../public${maskable.src}`, import.meta.url));
  assert.equal(maskableBytes.readUInt32BE(16), 512);
  assert.equal(maskableBytes.readUInt32BE(20), 512);

  const serviceWorker = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(serviceWorker, /networkFirstPublicProfile/);
  assert.match(serviceWorker, /staleWhileRevalidate/);
  assert.match(serviceWorker, /\/offline/);
  assert.match(serviceWorker, /isPrivateRoute\(url\.pathname\) \|\| isTagRoute\(url\.pathname\)/);
  assert.match(serviceWorker, /self\.addEventListener\("push"/);
  assert.match(serviceWorker, /notificationclick/);
  assert.match(serviceWorker, /skipWaiting/);

  const worker = await loadWorker();
  const staticEnv = {
    ASSETS: {
      fetch: async (request) => {
        const pathname = new URL(request.url).pathname;
        if (pathname === "/sw.js") return new Response(serviceWorker, { headers: { "content-type": "text/javascript" } });
        return new Response("Not found", { status: 404 });
      },
    },
  };
  const swResponse = await worker.fetch(new Request("https://taplex.co/sw.js"), staticEnv, testContext);
  assert.equal(swResponse.status, 200);
  assert.equal(swResponse.headers.get("service-worker-allowed"), "/");
  assert.match(swResponse.headers.get("cache-control") ?? "", /no-store/);

  const pushConfig = await worker.fetch(new Request("https://taplex.co/api/push/config"), testEnv, testContext);
  assert.equal(pushConfig.status, 200);
  assert.deepEqual(await pushConfig.json(), { configured: false });
  assert.equal(pushConfig.headers.get("cache-control"), "private, no-store");

  const unauthorizedPush = await worker.fetch(new Request("https://taplex.co/api/push/subscriptions", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://taplex.co" },
    body: JSON.stringify({ token: "a".repeat(80) }),
  }), testEnv, testContext);
  assert.equal(unauthorizedPush.status, 401);
});

test("protects owner APIs and fails closed before payment setup", async () => {
  const worker = await loadWorker();

  const googleStart = await worker.fetch(
    new Request("https://taplex.co/api/auth/google/start?return_to=%2Fdashboard"),
    { ...testEnv, GOOGLE_CLIENT_ID: "taplex-pwa-test.apps.googleusercontent.com" },
    testContext,
  );
  assert.equal(googleStart.status, 302);
  const googleTarget = new URL(googleStart.headers.get("location"));
  assert.equal(googleTarget.origin, "https://accounts.google.com");
  assert.equal(googleTarget.searchParams.get("client_id"), "taplex-pwa-test.apps.googleusercontent.com");
  assert.equal(googleTarget.searchParams.get("code_challenge_method"), "S256");
  assert.match(googleStart.headers.get("set-cookie") ?? "", /HttpOnly/);

  const adminResponse = await worker.fetch(
    new Request("http://localhost/api/admin/products", { headers: { accept: "application/json" } }),
    testEnv,
    testContext,
  );
  assert.equal(adminResponse.status, 401);
  assert.deepEqual(await adminResponse.json(), { error: "Sign in is required." });

  const checkoutResponse = await worker.fetch(
    new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost" },
      body: JSON.stringify({ items: [] }),
    }),
    testEnv,
    testContext,
  );
  assert.equal(checkoutResponse.status, 503);

  const webhookResponse = await worker.fetch(
    new Request("http://localhost/api/stripe/webhook", { method: "POST", body: "{}" }),
    testEnv,
    testContext,
  );
  assert.equal(webhookResponse.status, 503);

  const forgedWebhookResponse = await worker.fetch(
    new Request("http://localhost/api/stripe/webhook", {
      method: "POST",
      headers: { "stripe-signature": "t=1,v1=forged" },
      body: "{}",
    }),
    { ...testEnv, STRIPE_SECRET_KEY: "sk_test_placeholder", STRIPE_WEBHOOK_SECRET: "whsec_placeholder" },
    testContext,
  );
  assert.equal(forgedWebhookResponse.status, 400);

  const promoResponse = await worker.fetch(
    new Request("http://localhost/api/profile/redeem", { method: "POST", headers: { "content-type": "application/json", origin: "http://localhost" }, body: JSON.stringify({ code: "FIRSTTAP100" }) }),
    testEnv,
    testContext,
  );
  assert.equal(promoResponse.status, 401);

  const customersResponse = await worker.fetch(new Request("http://localhost/api/admin/customers", { headers: { accept: "application/json" } }), testEnv, testContext);
  assert.equal(customersResponse.status, 401);
  const promoCodesResponse = await worker.fetch(new Request("http://localhost/api/admin/promo-codes", { headers: { accept: "application/json" } }), testEnv, testContext);
  assert.equal(promoCodesResponse.status, 401);
  const nfcResponse = await worker.fetch(new Request("http://localhost/api/admin/nfc", { headers: { accept: "application/json" } }), testEnv, testContext);
  assert.equal(nfcResponse.status, 401);
});

test("secures NFC batch custody, preview, claiming, redirects, and private tap analytics", async () => {
  const worker = await loadWorker();
  const unitsByHash = new Map();
  const nfcInsertStatements = [];
  const analyticsBindings = [];
  const attempts = new Map();
  const profiles = new Map([
    ["first@example.com", { id: "11111111-1111-4111-8111-111111111111", owner_email: "first@example.com", handle: "first-owner", display_name: "First Owner", headline: "Creator", bio: "First", skin: "obsidian", social_icon_style: "brand", avatar_key: null, contact_email: "", contact_phone: "", location_city: "", location_region: "", location_country: "", location_postal_code: "", location_latitude: null, location_longitude: null, location_visibility: "city_state", nearby_discovery: 0, published: 1, plan: "free", pro_unlocked_at: null, pro_expires_at: null, stripe_customer_id: null, stripe_subscription_id: null, pro_source: null }],
    ["second@example.com", { id: "22222222-2222-4222-8222-222222222222", owner_email: "second@example.com", handle: "second-owner", display_name: "Second Owner", headline: "Creator", bio: "Second", skin: "obsidian", social_icon_style: "brand", avatar_key: null, contact_email: "", contact_phone: "", location_city: "", location_region: "", location_country: "", location_postal_code: "", location_latitude: null, location_longitude: null, location_visibility: "city_state", nearby_discovery: 0, published: 1, plan: "free", pro_unlocked_at: null, pro_expires_at: null, stripe_customer_id: null, stripe_subscription_id: null, pro_source: null }],
  ]);
  const accounts = new Map([
    ["first@example.com", { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "first@example.com" }],
    ["second@example.com", { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", email: "second@example.com" }],
  ]);
  const database = {
    prepare(sql) {
      return {
        sql, values: [], bind(...values) { this.values = values; return this; },
        async first() {
          if (sql.includes("FROM auth_attempts")) return attempts.get(this.values[0]) ?? null;
          if (sql.includes("FROM nfc_batches WHERE batch_number")) return null;
          if (sql.includes("WHERE u.slug_hash = ?")) {
            const unit = unitsByHash.get(this.values[0]);
            return unit ? { id: unit.id, serial_number: unit.serial_number, status: unit.status, purchaser_email: unit.purchaser_email, product_type: "NFC Card", color: "Black & Gold", profile_handle: unit.profile_handle ?? null } : null;
          }
          if (sql.includes("SELECT id,status,owner_user_id,purchaser_email FROM nfc_units")) return [...unitsByHash.values()].find((unit) => unit.slug_hash === this.values[0]) ?? null;
          if (sql.includes("FROM taplex_users WHERE email")) return accounts.get(this.values[0]) ?? null;
          if (sql.includes("FROM profiles WHERE owner_email")) return profiles.get(this.values[0]) ?? null;
          if (sql.includes("SELECT u.profile_id,p.handle profile_handle")) {
            const unit = [...unitsByHash.values()].find((item) => item.id === this.values[0] && item.owner_user_id === this.values[1]);
            return unit ? { profile_id: unit.profile_id, profile_handle: unit.profile_handle } : null;
          }
          return null;
        },
        async all() { return { results: [] }; },
        async run() {
          if (sql.includes("INSERT INTO auth_attempts")) attempts.set(this.values[0], { attempt_count: 1, window_started_at: this.values[1] });
          if (sql.includes("UPDATE auth_attempts")) attempts.get(this.values[0]).attempt_count += 1;
          if (sql.includes("UPDATE nfc_units SET status='active',owner_user_id")) {
            const unit = [...unitsByHash.values()].find((item) => item.id === this.values[5]);
            if (!unit || unit.status !== "unclaimed" || unit.owner_user_id) return { meta: { changes: 0 } };
            unit.status = "active"; unit.owner_user_id = this.values[0]; unit.profile_id = this.values[1];
            unit.profile_handle = [...profiles.values()].find((profile) => profile.id === this.values[1])?.handle ?? null;
          }
          if (sql.includes("INSERT OR IGNORE INTO nfc_tap_events")) analyticsBindings.push(this.values);
          if (sql.includes("UPDATE nfc_units SET tap_count")) {
            const unit = [...unitsByHash.values()].find((item) => item.id === this.values[2]); if (unit) unit.tap_count += 1;
          }
          return { meta: { changes: 1 } };
        },
      };
    },
    async batch(statements) {
      for (const statement of statements) {
        if (statement.sql.includes("INSERT INTO nfc_units") && statement.sql.includes("slug_hash")) {
          nfcInsertStatements.push(statement);
          const [id, batch_id, serial_number, slug_hash, status, order_id, purchaser_email] = statement.values;
          unitsByHash.set(slug_hash, { id, batch_id, serial_number, slug_hash, status, order_id, purchaser_email, owner_user_id: null, profile_id: null, profile_handle: null, tap_count: 0 });
        }
      }
      return statements.map(() => ({ success: true }));
    },
  };
  const env = { ...testEnv, DB: database, ADMIN_EMAIL: "owner@example.com", TAP_ANALYTICS_SALT: "test-only-analytics-salt" };
  const batchResponse = await worker.fetch(new Request("https://taplex.co/api/admin/nfc", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://taplex.co", "sec-fetch-site": "same-origin", "oai-authenticated-user-email": "owner@example.com" },
    body: JSON.stringify({ productType: "NFC Card", color: "Black & Gold", sku: "TLX-CARD", batchNumber: "2026-SEC-1", quantity: 2, status: "unclaimed" }),
  }), env, testContext);
  assert.equal(batchResponse.status, 201);
  const created = await batchResponse.json();
  assert.equal(created.units.length, 2);
  assert.equal(new Set(created.units.map((unit) => unit.url)).size, 2);
  for (const unit of created.units) {
    assert.match(unit.url, /^https:\/\/taplex\.co\/t\/[A-Za-z0-9_-]{32}$/);
    assert.match(unit.qrFilename, /\.png$/);
    const rawSlug = new URL(unit.url).pathname.split("/").pop();
    assert.equal(nfcInsertStatements.some((statement) => statement.values.includes(rawSlug)), false, "raw NFC secrets must never be stored");
  }

  const firstUrl = created.units[0].url;
  const preview = await worker.fetch(new Request(`${firstUrl}?preview=1`, { headers: { accept: "text/html", "user-agent": "QR production test" } }), env, testContext);
  assert.equal(preview.status, 200);
  assert.match(await preview.text(), /Safe test mode/i);
  assert.equal(analyticsBindings.length, 0);

  const firstClaim = await worker.fetch(new Request("https://taplex.co/api/tags/claim", { method: "POST", headers: { "content-type": "application/json", origin: "https://taplex.co", "sec-fetch-site": "same-origin", "oai-authenticated-user-email": "first@example.com", "oai-authenticated-user-full-name": "First%20Owner" }, body: JSON.stringify({ slug: new URL(firstUrl).pathname.split("/").pop() }) }), env, testContext);
  assert.equal(firstClaim.status, 200);
  assert.match((await firstClaim.json()).setupUrl, /^\/claim\/setup\?unit=/);
  const secondClaim = await worker.fetch(new Request("https://taplex.co/api/tags/claim", { method: "POST", headers: { "content-type": "application/json", origin: "https://taplex.co", "sec-fetch-site": "same-origin", "oai-authenticated-user-email": "second@example.com", "oai-authenticated-user-full-name": "Second%20Owner" }, body: JSON.stringify({ slug: new URL(firstUrl).pathname.split("/").pop() }) }), env, testContext);
  assert.equal(secondClaim.status, 409);
  assert.match((await secondClaim.json()).error, /already been claimed/i);

  const botTap = await worker.fetch(new Request(firstUrl, { headers: { accept: "text/html", "user-agent": "Googlebot", "cf-connecting-ip": "203.0.113.8" } }), env, testContext);
  assert.ok([303, 307, 308].includes(botTap.status));
  assert.equal(analyticsBindings.length, 0);
  const humanTap = await worker.fetch(new Request(firstUrl, { headers: { accept: "text/html", "user-agent": "Mozilla/5.0 iPhone", "cf-connecting-ip": "203.0.113.9" } }), env, testContext);
  assert.ok([303, 307, 308].includes(humanTap.status));
  assert.equal(new URL(humanTap.headers.get("location"), firstUrl).pathname, "/p/first-owner");
  assert.equal(analyticsBindings.length, 1);
  assert.equal(analyticsBindings[0].includes("203.0.113.9"), false, "analytics must not store raw IP addresses");
});

test("supports independent TapLex email accounts with secure sessions", async () => {
  const worker = await loadWorker();
  let user = null;
  const sessions = new Map();
  const attempts = new Map();
  const resetTokens = new Map();
  const database = {
    prepare(sql) {
      return {
        sql, values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          if (sql.includes("FROM auth_attempts")) return attempts.get(this.values[0]) ?? null;
          if (sql.includes("FROM taplex_users WHERE email") && sql.includes("password_hash")) return user;
          if (sql.includes("FROM taplex_users WHERE email")) return user;
          if (sql.includes("FROM taplex_sessions s JOIN taplex_users")) {
            const session = sessions.get(this.values[0]);
            return session && session.expires_at > this.values[1] ? { email: user.email, display_name: user.display_name, google_sub: null } : null;
          }
          if (sql.includes("FROM password_reset_tokens t") && sql.includes("JOIN taplex_users")) {
            const reset = resetTokens.get(this.values[0]);
            return reset && !reset.used_at && reset.expires_at > this.values[1] ? { id: reset.id, user_id: reset.user_id, email: user.email } : null;
          }
          if (sql.includes("FROM profiles WHERE owner_email") && this.values[0] === "legacy@example.com") return { display_name: "Legacy Creator" };
          return null;
        },
        async all() { return { results: [] }; },
        async run() {
          if (sql.includes("INTO taplex_users")) user = { id: this.values[0], email: this.values[1], display_name: this.values[2], password_hash: this.values[3], password_salt: this.values[4] };
          if (sql.includes("INSERT INTO auth_attempts")) attempts.set(this.values[0], { attempt_count: 1, window_started_at: this.values[1] });
          if (sql.includes("UPDATE auth_attempts")) attempts.get(this.values[0]).attempt_count += 1;
          if (sql.includes("DELETE FROM taplex_sessions")) sessions.delete(this.values[0]);
          if (sql.includes("DELETE FROM password_reset_tokens WHERE token_hash")) resetTokens.delete(this.values[0]);
          if (sql.includes("UPDATE taplex_users SET password_hash")) {
            user.password_hash = this.values[0];
            user.password_salt = this.values[1];
          }
          return { meta: { changes: 1 } };
        },
      };
    },
    async batch(statements) {
      for (const statement of statements) {
        if (statement.sql.includes("INSERT INTO taplex_sessions")) sessions.set(statement.values[0], { user_id: statement.values[1], expires_at: statement.values[2] });
        if (statement.sql.includes("INSERT INTO password_reset_tokens")) resetTokens.set(statement.values[2], { id: statement.values[0], user_id: statement.values[1], expires_at: statement.values[3], used_at: null });
        if (statement.sql.includes("UPDATE password_reset_tokens SET used_at")) {
          for (const reset of resetTokens.values()) if (reset.user_id === statement.values[1] && !reset.used_at) reset.used_at = statement.values[0];
        }
        if (statement.sql.includes("UPDATE taplex_users SET password_hash")) {
          user.password_hash = statement.values[0];
          user.password_salt = statement.values[1];
        }
        if (statement.sql.includes("DELETE FROM taplex_sessions WHERE user_id")) {
          for (const [token, session] of sessions) if (session.user_id === statement.values[0]) sessions.delete(token);
        }
      }
      return statements.map(() => ({ success: true }));
    },
  };
  const env = { ...testEnv, DB: database };
  const crossSite = await worker.fetch(new Request("http://localhost/api/auth/signup", { method: "POST", headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site", "content-type": "application/json" }, body: JSON.stringify({ name: "Creator", email: "creator@example.com", password: "very-secure-password" }) }), env, testContext);
  assert.equal(crossSite.status, 400);

  const invalidPromo = await worker.fetch(new Request("http://localhost/api/auth/signup", { method: "POST", headers: { origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" }, body: JSON.stringify({ name: "Creator", email: "creator@example.com", password: "very-secure-password", promoCode: "INVALID" }) }), env, testContext);
  assert.equal(invalidPromo.status, 400);
  assert.match((await invalidPromo.json()).error, /not valid/i);

  const signup = await worker.fetch(new Request("http://localhost/api/auth/signup", { method: "POST", headers: { origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" }, body: JSON.stringify({ name: "TapLex Creator", email: "creator@example.com", password: "very-secure-password" }) }), env, testContext);
  assert.equal(signup.status, 200);
  const cookie = signup.headers.get("set-cookie") ?? "";
  assert.match(cookie, /taplex_session=/);
  assert.match(cookie, /HttpOnly/i);
  assert.match(cookie, /SameSite=Lax/i);
  assert.notEqual(user.password_hash, "very-secure-password");

  const wrongPassword = await worker.fetch(new Request("http://localhost/api/auth/login", { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify({ email: "creator@example.com", password: "wrong-password" }) }), env, testContext);
  assert.equal(wrongPassword.status, 400);
  assert.match((await wrongPassword.json()).error, /incorrect/i);

  const login = await worker.fetch(new Request("http://localhost/api/auth/login", { method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: JSON.stringify({ email: "creator@example.com", password: "very-secure-password" }) }), env, testContext);
  assert.equal(login.status, 200);
  const loginCookie = login.headers.get("set-cookie") ?? "";
  assert.match(loginCookie, /taplex_session=/);

  const crossSiteLogout = await worker.fetch(new Request("http://localhost/api/auth/logout", { method: "POST", headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site", cookie: loginCookie.split(";")[0] } }), env, testContext);
  assert.equal(crossSiteLogout.status, 403);

  const logout = await worker.fetch(new Request("http://localhost/api/auth/logout", { method: "POST", headers: { origin: "http://localhost", "sec-fetch-site": "same-origin", cookie: loginCookie.split(";")[0] } }), env, testContext);
  assert.equal(logout.status, 303);
  assert.equal(logout.headers.get("location"), "/");
  assert.match(logout.headers.get("set-cookie") ?? "", /taplex_session=;/);
  const loggedOutDashboard = await worker.fetch(new Request("http://localhost/dashboard", { headers: { accept: "text/html", cookie: loginCookie.split(";")[0] } }), env, testContext);
  assert.ok([303, 307, 308].includes(loggedOutDashboard.status));

  // A Google-created account may not have a password yet. The reset flow adds
  // one to the same user record without creating a duplicate TapLex account.
  user.password_hash = null;
  user.password_salt = null;
  user.google_sub = "google-user-123";

  const originalFetch = globalThis.fetch;
  let resetEmail = null;
  globalThis.fetch = async (url, options) => {
    if (String(url) === "https://api.resend.com/emails") {
      resetEmail = JSON.parse(String(options?.body ?? "{}"));
      return Response.json({ id: "email_123" });
    }
    return originalFetch(url, options);
  };
  try {
    const forgotPassword = await worker.fetch(new Request("http://localhost/api/auth/forgot-password", { method: "POST", headers: { origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" }, body: JSON.stringify({ email: "creator@example.com" }) }), { ...env, RESEND_API_KEY: "re_test_key" }, testContext);
    assert.equal(forgotPassword.status, 200);
    assert.match((await forgotPassword.json()).message, /if that email belongs/i);
    assert.equal(resetEmail.to[0], "creator@example.com");
    const resetUrl = resetEmail.text.match(/https?:\/\/\S+/)?.[0];
    assert.ok(resetUrl);
    const resetToken = new URL(resetUrl).searchParams.get("token");
    assert.ok(resetToken);

    const resetPassword = await worker.fetch(new Request("http://localhost/api/auth/reset-password", { method: "POST", headers: { origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" }, body: JSON.stringify({ token: resetToken, password: "an-even-better-password" }) }), env, testContext);
    assert.equal(resetPassword.status, 200);
    assert.match(resetPassword.headers.get("set-cookie") ?? "", /taplex_session=/);
    assert.ok(user.password_hash);
    assert.equal(user.google_sub, "google-user-123");

    const replayReset = await worker.fetch(new Request("http://localhost/api/auth/reset-password", { method: "POST", headers: { origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" }, body: JSON.stringify({ token: resetToken, password: "another-secure-password" }) }), env, testContext);
    assert.equal(replayReset.status, 400);
    assert.match((await replayReset.json()).error, /invalid or expired/i);

    user = null;
    resetEmail = null;
    const legacyReset = await worker.fetch(new Request("http://localhost/api/auth/forgot-password", { method: "POST", headers: { origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" }, body: JSON.stringify({ email: "legacy@example.com" }) }), { ...env, RESEND_API_KEY: "re_test_key" }, testContext);
    assert.equal(legacyReset.status, 200);
    assert.equal(user.email, "legacy@example.com");
    assert.equal(user.display_name, "Legacy Creator");
    assert.equal(resetEmail.to[0], "legacy@example.com");
  } finally {
    globalThis.fetch = originalFetch;
  }

  const googleNeedsConfig = await worker.fetch(new Request("http://localhost/api/auth/google/start"), env, testContext);
  assert.equal(googleNeedsConfig.status, 303);
  assert.match(googleNeedsConfig.headers.get("location") ?? "", /Google\+sign-in\+needs/i);
});

test("renders the owner dashboard only for the configured signed-in account", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/admin", {
      headers: {
        accept: "text/html",
        "oai-authenticated-user-email": "owner@example.com",
        "oai-authenticated-user-full-name": "TapLex%20Owner",
        "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
      },
    }),
    { ...testEnv, ADMIN_EMAIL: "owner@example.com" },
    testContext,
  );

  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Commerce dashboard/i);
  assert.match(html, /Manage what/i);
  assert.match(html, /Log out/i);
  assert.doesNotMatch(html, /owner@example\.com/i);
});

test("rejects cross-site writes and disguised product uploads", async () => {
  const worker = await loadWorker();
  const database = {
    prepare() {
      return {
        bind() { return this; },
        async all() { return { results: [] }; },
        async run() { return { meta: { changes: 0 } }; },
      };
    },
    async batch(statements) { return statements.map(() => ({ success: true })); },
  };
  const adminEnv = { ...testEnv, ADMIN_EMAIL: "owner@example.com", DB: database };
  const authHeaders = {
    "oai-authenticated-user-email": "owner@example.com",
    origin: "http://localhost",
    "sec-fetch-site": "same-origin",
  };

  const crossSiteResponse = await worker.fetch(
    new Request("http://localhost/api/admin/products", {
      method: "POST",
      headers: { ...authHeaders, origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
      body: new FormData(),
    }),
    adminEnv,
    testContext,
  );
  assert.equal(crossSiteResponse.status, 403);

  const customerListResponse = await worker.fetch(new Request("http://localhost/api/admin/customers", { headers: { ...authHeaders, accept: "application/json" } }), adminEnv, testContext);
  assert.equal(customerListResponse.status, 200);
  assert.deepEqual((await customerListResponse.json()).customers, []);

  const form = new FormData();
  form.set("name", "Unsafe upload");
  form.set("price", "40");
  form.set("inventory", "0");
  form.set("image", new File(["not-a-real-png"], "fake.png", { type: "image/png" }));
  const uploadResponse = await worker.fetch(
    new Request("http://localhost/api/admin/products", { method: "POST", headers: authHeaders, body: form }),
    adminEnv,
    testContext,
  );
  assert.equal(uploadResponse.status, 400);
  assert.match((await uploadResponse.json()).error, /not a valid image/i);
});

test("renders public TapLex pages and protects customer-owned profile writes", async () => {
  const worker = await loadWorker();
  const savedBatches = [];
  const profileRow = {
    id: "33333333-3333-4333-8333-333333333333",
    owner_email: "customer@example.com",
    handle: "customer",
    display_name: "TapLex Customer",
    headline: "Creator · Entrepreneur",
    bio: "Always connected.",
    skin: "obsidian",
    avatar_key: null,
    contact_email: "",
    contact_phone: "",
    location_city: "Los Angeles",
    location_region: "CA",
    location_country: "United States",
    location_postal_code: "",
    location_latitude: 34.0522,
    location_longitude: -118.2437,
    location_visibility: "city_state",
    nearby_discovery: 1,
    published: 1,
    plan: "free",
    pro_unlocked_at: null,
    pro_expires_at: null,
  };
  const linkRows = [
    { id: "44444444-4444-4444-8444-444444444440", kind: "social", platform: "instagram", title: "Instagram", url: "https://instagram.com/taplex", description: "", price_label: "", duration_minutes: null, active: 1, sort_order: 0 },
    { id: "44444444-4444-4444-8444-444444444441", kind: "link", platform: "website", title: "My website", url: "https://example.com/", description: "", price_label: "", duration_minutes: null, active: 1, sort_order: 0 },
    { id: "44444444-4444-4444-8444-444444444442", kind: "video", platform: "youtube", title: "My story", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", description: "", price_label: "", duration_minutes: null, active: 1, sort_order: 0 },
    { id: "44444444-4444-4444-8444-444444444443", kind: "support", platform: "cashapp", title: "Cash App", url: "https://cash.app/$taplexdemo", description: "$taplexdemo", price_label: "", duration_minutes: null, active: 1, sort_order: 0 },
    { id: "44444444-4444-4444-8444-444444444444", kind: "booking", platform: "booksy", title: "Signature haircut", url: "https://booksy.com/en-us/", description: "Cut, line-up, and finish.", price_label: "$45", duration_minutes: 45, active: 1, sort_order: 0 },
    { id: "44444444-4444-4444-8444-444444444445", kind: "booking", platform: "taplex", title: "Creative consultation", url: "https://taplex.co/booking", description: "Plan your launch.", price_label: "$60", duration_minutes: 30, active: 1, sort_order: 1 },
  ];
  const database = {
    prepare(sql) {
      return {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          if (sql.includes("FROM profiles p JOIN profile_links l")) return profileRow.plan === "pro" ? { profile_id: profileRow.id, service_id: linkRows[5].id, service_title: linkRows[5].title } : null;
          if (sql.includes("FROM profile_bookings")) return null;
          if (sql.includes("FROM profiles WHERE owner_email")) return profileRow;
          if (sql.includes("FROM profiles WHERE handle") && sql.includes("published = 1")) return profileRow;
          if (sql.includes("FROM profile_links") && sql.includes("kind = 'booking'")) return linkRows.find((link) => link.kind === "booking") ?? null;
          if (sql.includes("FROM promo_codes") && ["FIRSTTAP100", "TAPLEX1YEAR"].includes(this.values[0])) return { code: this.values[0], max_redemptions: 100, redemption_count: 0, active: 1, duration_days: this.values[0] === "TAPLEX1YEAR" ? 365 : null };
          return null;
        },
        async all() {
          if (sql.includes("FROM profile_links")) return { results: linkRows };
          return { results: [] };
        },
        async run() { return { meta: { changes: 1 } }; },
      };
    },
    async batch(statements) {
      if (statements.some((statement) => statement.sql.includes("UPDATE profiles SET plan = 'pro'"))) {
        const planUpdate = statements.find((statement) => statement.sql.includes("UPDATE profiles SET plan = 'pro'"));
        profileRow.plan = "pro";
        profileRow.pro_unlocked_at = new Date().toISOString();
        profileRow.pro_expires_at = planUpdate?.values[1] ?? null;
      }
      savedBatches.push(statements.map((statement) => statement.values));
      return statements.map(() => ({ success: true }));
    },
  };
  const customerEnv = { ...testEnv, DB: database };
  const authHeaders = {
    accept: "text/html",
    "oai-authenticated-user-email": "customer@example.com",
    "oai-authenticated-user-full-name": "TapLex%20Customer",
    "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
  };

  const dashboard = await worker.fetch(new Request("http://localhost/dashboard", { headers: authHeaders }), customerEnv, testContext);
  assert.equal(dashboard.status, 200);
  const dashboardHtml = await dashboard.text();
  assert.match(dashboardHtml, /Build your TapLex/i);
  assert.match(dashboardHtml, /Type only your @username/i);
  assert.match(dashboardHtml, /1\/1 included on Free/i);
  assert.match(dashboardHtml, /optimized automatically/i);
  assert.match(dashboardHtml, /Support Me/i);
  assert.match(dashboardHtml, /City &amp; state/i);
  assert.match(dashboardHtml, /ZIP \/ postal/i);
  assert.match(dashboardHtml, /Device location/i);
  assert.match(dashboardHtml, /Booking &amp; services/i);
  assert.match(dashboardHtml, /Have a TapLex Pro code/i);
  assert.match(dashboardHtml, /People I Met/i);
  assert.match(dashboardHtml, /My Profile/i);
  assert.match(dashboardHtml, /Edit Profile/i);
  assert.match(dashboardHtml, /Quick profile fill-ins/i);
  assert.match(dashboardHtml, /Fill available blanks/i);
  assert.match(dashboardHtml, /Choose your country/i);
  assert.match(dashboardHtml, /Choose state \/ province/i);
  assert.match(dashboardHtml, /California/i);
  assert.match(dashboardHtml, /Log out/i);

  const selectedSkinDashboard = await worker.fetch(new Request("http://localhost/dashboard?skin=royal", { headers: authHeaders }), customerEnv, testContext);
  assert.equal(selectedSkinDashboard.status, 200);
  const selectedSkinDashboardHtml = await selectedSkinDashboard.text();
  assert.match(selectedSkinDashboardHtml, /Royal Purple selected from the TapLex gallery/i);
  assert.match(selectedSkinDashboardHtml, /public-skin-royal/i);

  const connectionsPage = await worker.fetch(new Request("http://localhost/connections", { headers: authHeaders }), customerEnv, testContext);
  assert.equal(connectionsPage.status, 200);
  const connectionsHtml = await connectionsPage.text();
  assert.match(connectionsHtml, /Your private network/i);
  assert.match(connectionsHtml, /No saved people yet/i);

  const publicProfile = await worker.fetch(new Request("http://localhost/p/customer", { headers: { accept: "text/html" } }), customerEnv, testContext);
  assert.equal(publicProfile.status, 200);
  const publicHtml = await publicProfile.text();
  assert.match(publicHtml, /TapLex Customer/i);
  assert.match(publicHtml, /Los Angeles, CA/i);
  assert.doesNotMatch(publicHtml, /34\.0522|-118\.2437/i);
  assert.match(publicHtml, /Support me/i);
  assert.match(publicHtml, /Book with me/i);
  assert.match(publicHtml, /Signature haircut/i);
  assert.match(publicHtml, /Creative consultation/i);
  assert.match(publicHtml, /Request a time/i);
  assert.match(publicHtml, /My story/i);
  assert.match(publicHtml, /www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/i);
  assert.match(publicHtml, /social-icons-brand/i);
  assert.match(publicHtml, /Remember this person/i);

  const crossSiteConnection = await worker.fetch(new Request("http://localhost/api/connections", {
    method: "POST",
    headers: { ...authHeaders, accept: "application/json", origin: "https://attacker.example", "sec-fetch-site": "cross-site", "content-type": "application/json" },
    body: JSON.stringify({ handle: "someone" }),
  }), customerEnv, testContext);
  assert.equal(crossSiteConnection.status, 403);

  const crossSite = await worker.fetch(new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { ...authHeaders, accept: "application/json", origin: "https://attacker.example", "sec-fetch-site": "cross-site", "content-type": "application/json" },
    body: JSON.stringify({}),
  }), customerEnv, testContext);
  assert.equal(crossSite.status, 403);

  const unsafeLink = await worker.fetch(new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify({
      ...profileRow,
      displayName: profileRow.display_name,
      contactEmail: "",
      contactPhone: "",
      published: true,
      links: [{ id: crypto.randomUUID(), kind: "link", platform: "website", title: "Unsafe", url: "javascript:alert(1)", active: true }],
    }),
  }), customerEnv, testContext);
  assert.equal(unsafeLink.status, 400);
  assert.match((await unsafeLink.json()).error, /https:\/\/ or http:\/\//i);

  const handleOnlySocial = await worker.fetch(new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify({
      ...profileRow,
      displayName: profileRow.display_name,
      contactEmail: "",
      contactPhone: "",
      published: true,
      links: [{ id: crypto.randomUUID(), kind: "social", platform: "instagram", title: "Instagram", url: "@bholddageneral", active: true }],
    }),
  }), customerEnv, testContext);
  assert.equal(handleOnlySocial.status, 200);
  assert.ok(savedBatches.flat(2).includes("https://www.instagram.com/bholddageneral"));

  const bandcampSocial = await worker.fetch(new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify({ ...profileRow, displayName: profileRow.display_name, socialIconStyle: "brand", contactEmail: "", contactPhone: "", published: true, links: [{ id: crypto.randomUUID(), kind: "social", platform: "bandcamp", title: "Bandcamp", url: "@taplexmusic", active: true }] }),
  }), customerEnv, testContext);
  assert.equal(bandcampSocial.status, 200);
  assert.ok(savedBatches.flat(2).includes("https://taplexmusic.bandcamp.com/"));

  const fiveSocials = await worker.fetch(new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify({ ...profileRow, displayName: profileRow.display_name, socialIconStyle: "brand", contactEmail: "", contactPhone: "", published: true, links: ["instagram", "tiktok", "youtube", "x", "audiomack"].map((platform, index) => ({ id: crypto.randomUUID(), kind: "social", platform, title: platform, url: platform === "audiomack" ? "@taplex" : `@taplex${index}`, active: true })) }),
  }), customerEnv, testContext);
  assert.equal(fiveSocials.status, 400);
  assert.match((await fiveSocials.json()).error, /up to 4 social icons/i);

  const twoMainLinksPayload = {
    ...profileRow,
    displayName: profileRow.display_name,
    contactEmail: "",
    contactPhone: "",
    published: true,
    links: ["Portfolio", "Store"].map((title, index) => ({
      id: crypto.randomUUID(),
      kind: "link",
      platform: "website",
      title,
      url: `https://example.com/${index}`,
      active: true,
    })),
  };
  const twoFreeMainLinks = await worker.fetch(new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify(twoMainLinksPayload),
  }), customerEnv, testContext);
  assert.equal(twoFreeMainLinks.status, 400);
  assert.match((await twoFreeMainLinks.json()).error, /1 main link/i);

  const unsafeVideo = await worker.fetch(new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify({
      ...profileRow,
      displayName: profileRow.display_name,
      contactEmail: "",
      contactPhone: "",
      published: true,
      links: [{ id: crypto.randomUUID(), kind: "video", platform: "youtube", title: "Fake video", url: "https://attacker.example/video", active: true }],
    }),
  }), customerEnv, testContext);
  assert.equal(unsafeVideo.status, 400);
  assert.match((await unsafeVideo.json()).error, /valid YouTube link/i);

  const unplayableVideo = await worker.fetch(new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify({ ...profileRow, displayName: profileRow.display_name, contactEmail: "", contactPhone: "", published: true, links: [{ id: crypto.randomUUID(), kind: "video", platform: "youtube", title: "Channel", url: "https://www.youtube.com/@taplex", active: true }] }),
  }), customerEnv, testContext);
  assert.equal(unplayableVideo.status, 400);
  assert.match((await unplayableVideo.json()).error, /playable/i);

  const zelleSupport = await worker.fetch(new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify({
      ...profileRow,
      displayName: profileRow.display_name,
      contactEmail: "",
      contactPhone: "",
      published: true,
      links: [{ id: crypto.randomUUID(), kind: "support", platform: "zelle", title: "Zelle", url: "https://www.zellepay.com/", description: "tips@example.com", active: true }],
    }),
  }), customerEnv, testContext);
  assert.equal(zelleSupport.status, 200);
  assert.ok(savedBatches.flat(2).includes("tips@example.com"));

  const freePostalLocation = await worker.fetch(new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify({ ...profileRow, displayName: profileRow.display_name, locationCity: "Los Angeles", locationRegion: "CA", locationCountry: "United States", locationPostalCode: "90015", locationVisibility: "city_state_postal", contactEmail: "", contactPhone: "", published: true, links: [] }),
  }), customerEnv, testContext);
  assert.equal(freePostalLocation.status, 400);
  assert.match((await freePostalLocation.json()).error, /TapLex Pro features/i);

  const freeKeepsExistingPrecise = await worker.fetch(new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify({ ...profileRow, displayName: profileRow.display_name, locationCity: "Los Angeles", locationRegion: "CA", locationCountry: "United States", locationLatitude: 34.0522, locationLongitude: -118.2437, locationVisibility: "city_state", nearbyDiscovery: true, contactEmail: "", contactPhone: "", published: true, links: [] }),
  }), customerEnv, testContext);
  assert.equal(freeKeepsExistingPrecise.status, 200);

  const unsafeApplePay = await worker.fetch(new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify({ ...profileRow, displayName: profileRow.display_name, contactEmail: "", contactPhone: "", published: true, links: [{ id: crypto.randomUUID(), kind: "support", platform: "apple-pay", title: "Apple Pay Checkout", url: "http://attacker.example/pay", description: "http://attacker.example/pay", active: true }] }),
  }), customerEnv, testContext);
  assert.equal(unsafeApplePay.status, 400);
  assert.match((await unsafeApplePay.json()).error, /secure https/i);

  const invalidFounderCode = await worker.fetch(new Request("http://localhost/api/profile/redeem", {
    method: "POST",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify({ code: "NOT-A-REAL-CODE" }),
  }), customerEnv, testContext);
  assert.equal(invalidFounderCode.status, 400);
  assert.match((await invalidFounderCode.json()).error, /not valid/i);

  const oneYearCode = await worker.fetch(new Request("http://localhost/api/profile/redeem", {
    method: "POST",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify({ code: "taplex1year" }),
  }), customerEnv, testContext);
  assert.equal(oneYearCode.status, 200);
  const oneYearData = await oneYearCode.json();
  assert.equal(oneYearData.profile.isPro, true);
  assert.ok(Date.parse(oneYearData.profile.proExpiresAt) > Date.now() + 364 * 24 * 60 * 60 * 1000);
  assert.match(oneYearData.message, /unlocked through/i);

  profileRow.pro_expires_at = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const founderCode = await worker.fetch(new Request("http://localhost/api/profile/redeem", {
    method: "POST",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify({ code: "first-tap-100" }),
  }), customerEnv, testContext);
  assert.equal(founderCode.status, 200);
  const founderData = await founderCode.json();
  assert.equal(founderData.profile.isPro, true);
  assert.equal(founderData.profile.plan, "pro");
  assert.match(founderData.message, /unlocked for life/i);

  const twoProMainLinks = await worker.fetch(new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify(twoMainLinksPayload),
  }), customerEnv, testContext);
  assert.equal(twoProMainLinks.status, 200);

  const proLocationAndApplePay = await worker.fetch(new Request("http://localhost/api/profile", {
    method: "PUT",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify({ ...profileRow, displayName: profileRow.display_name, locationCity: "Los Angeles", locationRegion: "CA", locationCountry: "United States", locationPostalCode: "90015", locationLatitude: 34.0522, locationLongitude: -118.2437, locationVisibility: "city_state_postal", nearbyDiscovery: true, contactEmail: "", contactPhone: "", published: true, links: [{ id: crypto.randomUUID(), kind: "support", platform: "apple-pay", title: "Apple Pay Checkout", url: "https://buy.stripe.com/test", description: "https://buy.stripe.com/test", active: true }] }),
  }), customerEnv, testContext);
  assert.equal(proLocationAndApplePay.status, 200);
  assert.ok(savedBatches.flat(2).includes("90015"));
  assert.ok(savedBatches.flat(2).includes("https://buy.stripe.com/test"));

  const bookingDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const bookingRequest = await worker.fetch(new Request("http://localhost/api/public/bookings", {
    method: "POST", headers: { origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/json" },
    body: JSON.stringify({ handle: "customer", serviceId: linkRows[5].id, requestedDate: bookingDate, requestedTime: "10:30", customerName: "New Client", customerEmail: "client@example.com", customerPhone: "", notes: "First visit" }),
  }), customerEnv, testContext);
  assert.equal(bookingRequest.status, 201);
  assert.equal((await bookingRequest.json()).booking.status, "pending");

  const crossSiteBooking = await worker.fetch(new Request("http://localhost/api/public/bookings", {
    method: "POST", headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site", "content-type": "application/json" }, body: "{}",
  }), customerEnv, testContext);
  assert.equal(crossSiteBooking.status, 403);

  const bookingInbox = await worker.fetch(new Request("http://localhost/api/profile/bookings", { headers: { ...authHeaders, accept: "application/json" } }), customerEnv, testContext);
  assert.equal(bookingInbox.status, 200);
  assert.deepEqual((await bookingInbox.json()).bookings, []);

  const imageForm = new FormData();
  imageForm.set("image", new File(["not-a-real-image"], "avatar.png", { type: "image/png" }));
  const unsafeAvatar = await worker.fetch(new Request("http://localhost/api/profile/avatar", {
    method: "POST",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin" },
    body: imageForm,
  }), customerEnv, testContext);
  assert.equal(unsafeAvatar.status, 400);
  assert.match((await unsafeAvatar.json()).error, /not a valid image/i);

  const oversizedAvatar = await worker.fetch(new Request("http://localhost/api/profile/avatar", {
    method: "POST",
    headers: { ...authHeaders, accept: "application/json", origin: "http://localhost", "sec-fetch-site": "same-origin", "content-type": "application/octet-stream", "content-length": String(7 * 1024 * 1024) },
    body: new Uint8Array([0]),
  }), customerEnv, testContext);
  assert.equal(oversizedAvatar.status, 413);
  assert.match(oversizedAvatar.headers.get("content-type") ?? "", /^application\/json/i);
  assert.match((await oversizedAvatar.json()).error, /too large/i);
});

test("resets, disconnects, and releases permanent NFC links without changing their identity", async () => {
  const worker = await loadWorker();
  const accounts = new Map([
    ["owner@example.com", { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", email: "owner@example.com" }],
    ["second@example.com", { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", email: "second@example.com" }],
    ["attacker@example.com", { id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc", email: "attacker@example.com" }],
  ]);
  const profiles = new Map([
    ["owner@example.com", { id: "11111111-1111-4111-8111-111111111111", owner_email: "owner@example.com", handle: "owner-profile", display_name: "Owner", headline: "Creator", bio: "Owner bio", skin: "obsidian", social_icon_style: "brand", avatar_key: null, contact_email: "", contact_phone: "", location_city: "", location_region: "", location_country: "", location_postal_code: "", location_latitude: null, location_longitude: null, location_visibility: "city_state", nearby_discovery: 0, published: 1, plan: "free", pro_unlocked_at: null, pro_expires_at: null, stripe_customer_id: null, stripe_subscription_id: null, pro_source: null }],
    ["second@example.com", { id: "22222222-2222-4222-8222-222222222222", owner_email: "second@example.com", handle: "second-profile", display_name: "Second", headline: "Creator", bio: "Second bio", skin: "obsidian", social_icon_style: "brand", avatar_key: null, contact_email: "", contact_phone: "", location_city: "", location_region: "", location_country: "", location_postal_code: "", location_latitude: null, location_longitude: null, location_visibility: "city_state", nearby_discovery: 0, published: 1, plan: "free", pro_unlocked_at: null, pro_expires_at: null, stripe_customer_id: null, stripe_subscription_id: null, pro_source: null }],
  ]);
  const slugs = {
    reset: "R".repeat(32),
    disconnect: "D".repeat(32),
    deleteOne: "P".repeat(32),
    deleteTwo: "Q".repeat(32),
  };
  const ownerId = accounts.get("owner@example.com").id;
  const ownerProfileId = profiles.get("owner@example.com").id;
  const units = new Map();
  for (const [index, [key, slug]] of Object.entries(slugs).entries()) {
    const id = `90000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
    units.set(id, {
      id,
      batch_id: "80000000-0000-4000-8000-000000000001",
      serial_number: `TLX-TEST-${index + 1}`,
      slug_hash: await testHash(slug),
      status: key === "reset" ? "frozen" : "active",
      status_before_freeze: key === "reset" ? "active" : null,
      owner_user_id: ownerId,
      profile_id: ownerProfileId,
      order_id: null,
      purchaser_email: null,
      replacement_for_id: null,
      replaced_by_id: null,
      claimed_at: "2026-07-22T00:00:00.000Z",
      activated_at: "2026-07-22T00:00:00.000Z",
      last_tapped_at: null,
      tap_count: 0,
      created_at: "2026-07-22T00:00:00.000Z",
      updated_at: "2026-07-22T00:00:00.000Z",
    });
  }
  const auditLogs = [];
  const attempts = new Map();
  const unitBySlugHash = (hash) => [...units.values()].find((unit) => unit.slug_hash === hash);
  const adminRow = (unit) => unit ? {
    ...unit,
    batch_number: "TEST-BATCH",
    product_type: "NFC Wristband",
    color: "Black",
    sku: "TLX-TEST",
    owner_email: [...accounts.values()].find((account) => account.id === unit.owner_user_id)?.email ?? null,
    owner_name: "Owner",
    profile_handle: [...profiles.values()].find((profile) => profile.id === unit.profile_id)?.handle ?? null,
  } : null;
  const database = {
    prepare(sql) {
      return {
        sql,
        values: [],
        bind(...values) { this.values = values; return this; },
        async first() {
          if (sql.includes("FROM auth_attempts")) return attempts.get(this.values[0]) ?? null;
          if (sql.includes("FROM taplex_users WHERE email")) return accounts.get(this.values[0]) ?? null;
          if (sql.includes("SELECT id,avatar_key FROM profiles WHERE owner_email")) {
            const profile = profiles.get(this.values[0]);
            return profile ? { id: profile.id, avatar_key: profile.avatar_key } : null;
          }
          if (sql.includes("FROM profiles WHERE owner_email")) return profiles.get(this.values[0]) ?? null;
          if (sql.includes("FROM profiles WHERE id=? AND owner_email")) {
            return [...profiles.values()].find((profile) => profile.id === this.values[0] && profile.owner_email === this.values[1]) ?? null;
          }
          if (sql.includes("SELECT u.id,u.serial_number,u.status,u.profile_id FROM nfc_units")) {
            const unit = units.get(this.values[0]);
            return unit?.owner_user_id === this.values[1] ? { id: unit.id, serial_number: unit.serial_number, status: unit.status, profile_id: unit.profile_id } : null;
          }
          if (sql.includes("SELECT id,status,owner_user_id,purchaser_email FROM nfc_units")) {
            const unit = unitBySlugHash(this.values[0]);
            return unit ? { id: unit.id, status: unit.status, owner_user_id: unit.owner_user_id, purchaser_email: unit.purchaser_email } : null;
          }
          if (sql.includes("SELECT u.profile_id,p.handle profile_handle")) {
            const unit = units.get(this.values[0]);
            const profile = unit ? [...profiles.values()].find((item) => item.id === unit.profile_id) : null;
            return unit?.owner_user_id === this.values[1] ? { profile_id: unit.profile_id, profile_handle: profile?.handle ?? null } : null;
          }
          if (sql.includes("WHERE u.slug_hash = ?")) {
            const unit = unitBySlugHash(this.values[0]);
            const profile = unit ? [...profiles.values()].find((item) => item.id === unit.profile_id) : null;
            return unit ? { id: unit.id, serial_number: unit.serial_number, status: unit.status, purchaser_email: unit.purchaser_email, product_type: "NFC Wristband", color: "Black", profile_handle: profile?.handle ?? null } : null;
          }
          if (sql.includes("FROM nfc_units u JOIN nfc_batches") && sql.includes("WHERE u.id=?")) return adminRow(units.get(this.values[0]));
          return null;
        },
        async all() {
          if (sql.includes("SELECT id,serial_number,status FROM nfc_units WHERE profile_id")) {
            return { results: [...units.values()].filter((unit) => unit.profile_id === this.values[0]).map((unit) => ({ id: unit.id, serial_number: unit.serial_number, status: unit.status })) };
          }
          if (sql.includes("SELECT image_key FROM profile_gallery_items")) return { results: [] };
          if (sql.includes("FROM profile_links") || sql.includes("FROM profile_gallery_items")) return { results: [] };
          return { results: [] };
        },
        async run() {
          if (sql.includes("INSERT INTO auth_attempts")) attempts.set(this.values[0], { attempt_count: 1, window_started_at: this.values[1] });
          if (sql.includes("UPDATE auth_attempts")) attempts.get(this.values[0]).attempt_count += 1;
          if (sql.includes("UPDATE nfc_units SET status='active',owner_user_id")) {
            const unit = units.get(this.values[5]);
            if (!unit || unit.status !== "unclaimed" || unit.owner_user_id) return { meta: { changes: 0 } };
            unit.status = "active"; unit.owner_user_id = this.values[0]; unit.profile_id = this.values[1]; unit.claimed_at = this.values[2];
          }
          if (sql.includes("INSERT INTO nfc_audit_logs")) auditLogs.push({ action: this.values[4], values: [...this.values] });
          return { meta: { changes: 1 } };
        },
      };
    },
    async batch(statements) {
      for (const statement of statements) {
        const { sql, values } = statement;
        if (sql.includes("UPDATE nfc_units SET owner_user_id=NULL") && sql.includes("WHERE id=?")) {
          const unit = units.get(values[1]);
          if (unit && (!sql.includes("owner_user_id=?") || unit.owner_user_id === values[2])) {
            unit.owner_user_id = null; unit.profile_id = null; unit.claimed_at = null; unit.status = "unclaimed"; unit.status_before_freeze = null;
          }
        } else if (sql.includes("UPDATE nfc_units SET owner_user_id=NULL") && sql.includes("WHERE profile_id=?")) {
          for (const unit of units.values()) if (unit.profile_id === values[1]) {
            unit.owner_user_id = null; unit.profile_id = null; unit.claimed_at = null; unit.status = "unclaimed"; unit.status_before_freeze = null;
          }
        } else if (sql.includes("UPDATE profiles SET headline=''")) {
          const profile = [...profiles.values()].find((item) => item.id === values[1] && item.owner_email === values[2]);
          if (profile) { profile.published = 0; profile.headline = ""; profile.bio = ""; profile.avatar_key = null; }
        }
        if (sql.includes("INSERT INTO nfc_audit_logs")) auditLogs.push({ action: values[4], values: [...values] });
      }
      return statements.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  const env = { ...testEnv, DB: database, ADMIN_EMAIL: "owner@example.com" };
  const adminHeaders = { "oai-authenticated-user-email": "owner@example.com", origin: "https://taplex.co", "sec-fetch-site": "same-origin", "content-type": "application/json" };
  const ownerHeaders = { "oai-authenticated-user-email": "owner@example.com", origin: "https://taplex.co", "sec-fetch-site": "same-origin", "content-type": "application/json" };
  const secondHeaders = { "oai-authenticated-user-email": "second@example.com", origin: "https://taplex.co", "sec-fetch-site": "same-origin", "content-type": "application/json" };
  const attackerHeaders = { "oai-authenticated-user-email": "attacker@example.com", origin: "https://taplex.co", "sec-fetch-site": "same-origin", "content-type": "application/json" };
  const resetUnit = unitBySlugHash(await testHash(slugs.reset));
  const originalIdentity = { slugHash: resetUnit.slug_hash, serial: resetUnit.serial_number };

  const frozenWithoutWarning = await worker.fetch(new Request("https://taplex.co/api/admin/nfc", { method: "PATCH", headers: adminHeaders, body: JSON.stringify({ action: "reset", unitId: resetUnit.id }) }), env, testContext);
  assert.equal(frozenWithoutWarning.status, 400);
  assert.equal(resetUnit.status, "frozen");
  const adminReset = await worker.fetch(new Request("https://taplex.co/api/admin/nfc", { method: "PATCH", headers: adminHeaders, body: JSON.stringify({ action: "reset", unitId: resetUnit.id, confirmFrozen: true, reason: "Acceptance test" }) }), env, testContext);
  assert.equal(adminReset.status, 200);
  assert.deepEqual({ slugHash: resetUnit.slug_hash, serial: resetUnit.serial_number }, originalIdentity);
  assert.equal(resetUnit.owner_user_id, null); assert.equal(resetUnit.profile_id, null); assert.equal(resetUnit.claimed_at, null); assert.equal(resetUnit.status, "unclaimed");
  const resetLanding = await worker.fetch(new Request(`https://taplex.co/t/${slugs.reset}`, { headers: { accept: "text/html" } }), env, testContext);
  assert.equal(resetLanding.status, 200); assert.match(await resetLanding.text(), /Make this TapLex yours/i);

  const newClaim = await worker.fetch(new Request("https://taplex.co/api/tags/claim", { method: "POST", headers: secondHeaders, body: JSON.stringify({ slug: slugs.reset }) }), env, testContext);
  const newClaimData = await newClaim.clone().json();
  assert.equal(newClaim.status, 200, newClaimData.error); assert.equal(resetUnit.owner_user_id, accounts.get("second@example.com").id); assert.equal(resetUnit.profile_id, profiles.get("second@example.com").id);
  const futureTap = await worker.fetch(new Request(`https://taplex.co/t/${slugs.reset}`, { headers: { accept: "text/html" } }), env, testContext);
  assert.ok([303, 307, 308].includes(futureTap.status)); assert.equal(new URL(futureTap.headers.get("location"), "https://taplex.co").pathname, "/p/second-profile");

  const disconnectUnit = unitBySlugHash(await testHash(slugs.disconnect));
  const attackerDisconnect = await worker.fetch(new Request("https://taplex.co/api/profile/tags", { method: "POST", headers: attackerHeaders, body: JSON.stringify({ action: "disconnect", unitId: disconnectUnit.id, confirmation: "DISCONNECT" }) }), env, testContext);
  assert.equal(attackerDisconnect.status, 403); assert.equal(disconnectUnit.owner_user_id, ownerId);
  const ownerDisconnect = await worker.fetch(new Request("https://taplex.co/api/profile/tags", { method: "POST", headers: ownerHeaders, body: JSON.stringify({ action: "disconnect", unitId: disconnectUnit.id, confirmation: "DISCONNECT" }) }), env, testContext);
  assert.equal(ownerDisconnect.status, 200); assert.equal(disconnectUnit.status, "unclaimed"); assert.equal(disconnectUnit.profile_id, null); assert.equal(profiles.get("owner@example.com").published, 1);
  const disconnectedLanding = await worker.fetch(new Request(`https://taplex.co/t/${slugs.disconnect}`, { headers: { accept: "text/html" } }), env, testContext);
  assert.equal(disconnectedLanding.status, 200); assert.match(await disconnectedLanding.text(), /Make this TapLex yours/i);

  const attackerDelete = await worker.fetch(new Request("https://taplex.co/api/profile", { method: "DELETE", headers: attackerHeaders, body: JSON.stringify({ confirmation: "DELETE" }) }), env, testContext);
  assert.equal(attackerDelete.status, 400); assert.equal(profiles.get("owner@example.com").published, 1);
  const deleteProfile = await worker.fetch(new Request("https://taplex.co/api/profile", { method: "DELETE", headers: ownerHeaders, body: JSON.stringify({ confirmation: "DELETE" }) }), env, testContext);
  assert.equal(deleteProfile.status, 200); assert.equal(profiles.get("owner@example.com").published, 0);
  for (const slug of [slugs.deleteOne, slugs.deleteTwo]) {
    const unit = unitBySlugHash(await testHash(slug));
    assert.equal(unit.status, "unclaimed"); assert.equal(unit.owner_user_id, null); assert.equal(unit.profile_id, null); assert.equal(unit.claimed_at, null);
    const landing = await worker.fetch(new Request(`https://taplex.co/t/${slug}`, { headers: { accept: "text/html" } }), env, testContext);
    assert.equal(landing.status, 200); assert.match(await landing.text(), /Make this TapLex yours/i);
  }
  const adminAudit = auditLogs.find((entry) => entry.action === "unit.admin_reset");
  const disconnectAudit = auditLogs.find((entry) => entry.action === "unit.owner_disconnected");
  const profileAudit = auditLogs.find((entry) => entry.action === "profile.deleted");
  assert.equal(JSON.parse(adminAudit.values[5]).adminUserId, ownerId);
  assert.equal(JSON.parse(disconnectAudit.values[5]).userId, ownerId);
  assert.deepEqual(JSON.parse(profileAudit.values[5]).affectedProductIds.sort(), [unitBySlugHash(await testHash(slugs.deleteOne)).id, unitBySlugHash(await testHash(slugs.deleteTwo)).id].sort());
});

async function testHash(value) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Buffer.from(bytes).toString("base64url");
}

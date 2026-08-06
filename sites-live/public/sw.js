/* TapLex PWA service worker. Public pages are cached conservatively; account,
   admin, checkout, and API responses always stay network-only. */
const CACHE_VERSION = "taplex-pwa-2026-07-22-v1";
const PRECACHE = `${CACHE_VERSION}-precache`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const PROFILE_CACHE = `${CACHE_VERSION}-profiles`;
const ACTIVE_CACHES = new Set([PRECACHE, STATIC_CACHE, IMAGE_CACHE, PROFILE_CACHE]);
const PRECACHE_URLS = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/taplex-logo.webp",
  "/pwa/icon-192x192.png",
  "/pwa/icon-512x512.png",
  "/pwa/icon-maskable-512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(PRECACHE);
    await Promise.allSettled(PRECACHE_URLS.map(async (url) => {
      const response = await fetch(new Request(url, { cache: "reload" }));
      if (response.ok) await cache.put(url, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => !ACTIVE_CACHES.has(name)).map((name) => caches.delete(name)));
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable();
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) return;
  if (isPrivateRoute(url.pathname) || isTagRoute(url.pathname)) return;

  if (request.mode === "navigate") {
    if (isPublicProfileRoute(url.pathname)) {
      event.respondWith(networkFirstPublicProfile(request, event));
      return;
    }
    event.respondWith(networkFirstNavigation(request, event));
    return;
  }

  if (request.destination === "image") {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, event, 80));
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/pwa/") ||
    ["style", "script", "font", "worker"].includes(request.destination)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, 120));
  }
});

function isPrivateRoute(pathname) {
  return /^\/(?:admin|dashboard|claim|transfer|login|signup|forgot-password|reset-password|order)(?:\/|$)/.test(pathname);
}

function isTagRoute(pathname) {
  return /^\/t\/[^/]+/.test(pathname);
}

function isPublicProfileRoute(pathname) {
  return /^\/p\/[^/]+\/?$/.test(pathname);
}

async function networkFirstNavigation(request, event) {
  try {
    const preload = await event.preloadResponse;
    const response = preload || await fetch(request);
    if (response.ok && new URL(request.url).pathname === "/") {
      const cache = await caches.open(PRECACHE);
      event.waitUntil(cache.put("/", response.clone()));
    }
    return response;
  } catch {
    const cache = await caches.open(PRECACHE);
    return (await cache.match(request, { ignoreSearch: true })) || (await cache.match("/offline")) || Response.error();
  }
}

async function networkFirstPublicProfile(request, event) {
  const cache = await caches.open(PROFILE_CACHE);
  try {
    const preload = await event.preloadResponse;
    const response = preload || await fetch(request);
    if (response.ok && response.headers.get("x-taplex-pwa-cache") === "public-profile") {
      event.waitUntil((async () => {
        await cache.put(request, response.clone());
        await trimCache(PROFILE_CACHE, 30);
      })());
    }
    return response;
  } catch {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    const precache = await caches.open(PRECACHE);
    return (await precache.match("/offline")) || Response.error();
  }
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (canCache(response)) {
    await cache.put(request, response.clone());
    await trimCache(cacheName, maxEntries);
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName, event, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const refresh = fetch(request).then(async (response) => {
    if (canCache(response)) {
      await cache.put(request, response.clone());
      await trimCache(cacheName, maxEntries);
    }
    return response;
  });
  if (cached) {
    event.waitUntil(refresh.catch(() => undefined));
    return cached;
  }
  return refresh;
}

function canCache(response) {
  return response.ok && response.type !== "opaque" && !/no-store|private/i.test(response.headers.get("cache-control") || "");
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  const target = safeAppPath(payload.url);
  event.waitUntil(self.registration.showNotification(payload.title || "TapLex", {
    body: payload.body || "Your TapLex network has an update.",
    icon: "/pwa/icon-192x192.png",
    badge: "/pwa/badge-96x96.png",
    tag: payload.tag || "taplex-update",
    renotify: Boolean(payload.renotify),
    data: { url: target },
    vibrate: [120, 60, 120]
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = safeAppPath(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("navigate" in client) await client.navigate(target);
      if ("focus" in client) return client.focus();
    }
    return self.clients.openWindow(target);
  })());
});

function readPushPayload(event) {
  if (!event.data) return {};
  try { return event.data.json(); } catch { return { body: event.data.text() }; }
}

function safeAppPath(value) {
  try {
    const url = new URL(String(value || "/dashboard"), self.location.origin);
    return url.origin === self.location.origin ? `${url.pathname}${url.search}${url.hash}` : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { bindRuntimeEnv, type TapLexWorkerEnv } from "../lib/runtime";

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: TapLexWorkerEnv, ctx: ExecutionContext): Promise<Response> {
    bindRuntimeEnv(env);
    const url = new URL(request.url);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      const imageResponse = await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
      return withSecurityHeaders(imageResponse, request);
    }

    const response = await handler.fetch(request, env, ctx);
    return withSecurityHeaders(response, request);
  },
};

function withSecurityHeaders(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);
  const url = new URL(request.url);
  const pathname = url.pathname;
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://firebaseinstallations.googleapis.com https://fcmregistrations.googleapis.com https://www.googleapis.com https://*.googleapis.com",
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.tiktok.com",
  ];
  if (url.protocol === "https:") {
    contentSecurityPolicy.push("upgrade-insecure-requests");
  }
  headers.set("Content-Security-Policy", contentSecurityPolicy.join("; "));
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(self), payment=(), usb=()");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  if (url.protocol === "https:") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  if (pathname === "/sw.js") {
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    headers.set("Service-Worker-Allowed", "/");
    headers.set("Content-Type", "text/javascript; charset=utf-8");
  } else if (pathname === "/manifest.webmanifest") {
    headers.set("Cache-Control", "public, max-age=300, must-revalidate");
    headers.set("Content-Type", "application/manifest+json; charset=utf-8");
  } else if (pathname.startsWith("/api/") || /^\/(?:admin|dashboard|claim|transfer|login|signup|forgot-password|reset-password|order)(?:\/|$)/.test(pathname)) {
    headers.set("Cache-Control", "private, no-store");
  } else if (/^\/p\/[^/]+\/?$/.test(pathname)) {
    const authenticated = /(?:^|;\s*)taplex_session=/.test(request.headers.get("cookie") ?? "") || Boolean(request.headers.get("oai-authenticated-user-email"));
    if (!authenticated && response.status === 200) {
      headers.set("Cache-Control", "public, max-age=0, must-revalidate");
      headers.set("X-TapLex-PWA-Cache", "public-profile");
    } else {
      headers.set("Cache-Control", "private, no-store");
    }
  } else if (pathname.startsWith("/pwa/") || pathname.startsWith("/_next/static/") || pathname.startsWith("/assets/")) {
    headers.set("Cache-Control", "public, max-age=604800, stale-while-revalidate=86400");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default worker;

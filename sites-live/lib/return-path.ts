export function safeReturnPath(value: unknown, fallback = "/dashboard") {
  const candidate = String(value ?? "");
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  let url: URL;
  try {
    url = new URL(candidate, "https://taplex.local");
  } catch {
    return fallback;
  }
  if (url.origin !== "https://taplex.local" || ["/api/auth/google/callback", "/api/auth/apple/callback"].includes(url.pathname)) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}

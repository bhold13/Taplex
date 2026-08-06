import { assertSameOrigin, clearSessionCookie, cookieValue, deleteSession, SESSION_COOKIE } from "@/lib/taplex-auth";

export async function POST(request: Request) {
  try { assertSameOrigin(request); } catch { return Response.json({ error: "Cross-site request rejected." }, { status: 403 }); }
  await deleteSession(cookieValue(request.headers.get("cookie"), SESSION_COOKIE));
  return new Response(null, { status: 303, headers: { Location: "/", "Set-Cookie": clearSessionCookie(new URL(request.url).protocol === "https:") } });
}

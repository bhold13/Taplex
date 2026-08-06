import { assertSameOrigin, resetEmailPassword, sessionCookie } from "@/lib/taplex-auth";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json() as Record<string, unknown>;
    const token = await resetEmailPassword(body.token, body.password);
    return Response.json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(token, new URL(request.url).protocol === "https:"), "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Password could not be reset." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}

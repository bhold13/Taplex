import { assertSameOrigin, requestPasswordReset } from "@/lib/taplex-auth";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json() as Record<string, unknown>;
    await requestPasswordReset(body.email, new URL(request.url).origin);
    return Response.json({ message: "If that email belongs to a TapLex password account, a reset link is on the way." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Password reset could not be started." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}

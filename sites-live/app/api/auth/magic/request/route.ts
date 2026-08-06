import { requestMagicLink } from "@/lib/magic-auth";
import { assertSameOrigin } from "@/lib/taplex-auth";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json() as Record<string, unknown>;
    await requestMagicLink(body.email, body.returnTo, request);
    return Response.json({ message: "Check your email for a secure TapLex sign-in link." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Sign-in email could not be sent." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}

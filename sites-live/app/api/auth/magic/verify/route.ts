import { sessionCookie } from "@/lib/taplex-auth";
import { verifyMagicLink } from "@/lib/magic-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const result = await verifyMagicLink(url.searchParams.get("token"));
    return new Response(null, {
      status: 303,
      headers: {
        Location: result.returnTo,
        "Set-Cookie": sessionCookie(result.session, url.protocol === "https:"),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.redirect(new URL(`/login?error=${encodeURIComponent(error instanceof Error ? error.message : "That sign-in link is invalid.")}`, request.url), 303);
  }
}

import { authorizeProfileApi } from "@/lib/profile-auth";
import { redeemFounderCode } from "@/lib/profiles";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json() as { code?: unknown };
    const profile = await redeemFounderCode(auth.user.email, body.code);
    return Response.json({
      profile,
      message: profile.proExpiresAt
        ? `TapLex Pro unlocked through ${new Date(profile.proExpiresAt).toLocaleDateString("en-US")}.`
        : "Founder Pro unlocked for life.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "That code could not be redeemed.";
    return Response.json({ error: message }, { status: 400 });
  }
}

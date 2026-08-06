import { authorizeProfileApi } from "@/lib/profile-auth";
import { claimNfcTag } from "@/lib/nfc";

export async function POST(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const result = await claimNfcTag(String(body.slug ?? ""), auth.user, request, body.profileId);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "This TapLex product could not be claimed." }, { status: 409, headers: { "Cache-Control": "no-store" } });
  }
}

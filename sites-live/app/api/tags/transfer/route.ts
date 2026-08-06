import { authorizeProfileApi } from "@/lib/profile-auth";
import { acceptNfcTransfer } from "@/lib/nfc";

export async function POST(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const result = await acceptNfcTransfer(body.token, auth.user, request);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Transfer could not be accepted." }, { status: 400 });
  }
}

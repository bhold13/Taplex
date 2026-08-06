import { authorizeProfileApi } from "@/lib/profile-auth";
import { beginOwnerNfcTransfer, disconnectOwnedNfcProduct, getOwnedNfcProducts, reconnectOwnedNfcProduct } from "@/lib/nfc";
import { listOwnerProfiles } from "@/lib/profiles";

export async function GET(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;
  try {
    const [products, profiles] = await Promise.all([getOwnedNfcProducts(auth.user.email), listOwnerProfiles(auth.user.email)]);
    return Response.json({ products, profiles }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Your TapLex products could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const result = body.action === "transfer"
      ? await beginOwnerNfcTransfer(body.unitId, auth.user.email, body.recipientEmail, request)
      : body.action === "disconnect"
        ? await disconnectOwnedNfcProduct(body.unitId, auth.user, body.confirmation, request)
      : body.action === "connect_profile"
        ? await reconnectOwnedNfcProduct(body.unitId, auth.user.email, body.profileId, request)
        : (() => { throw new Error("Unknown product action."); })();
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product action could not be completed.";
    return Response.json({ error: message }, { status: /do not own/i.test(message) ? 403 : 400 });
  }
}

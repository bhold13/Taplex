import { authorizeAdminApi } from "@/lib/admin";
import { configureSecureNfcTag, listSecureNfcTags, removeSecureNfcTag } from "@/lib/secure-nfc";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorizeAdminApi(request);
  if (!auth.ok) return auth.response;
  try {
    return Response.json({ secureTags: await listSecureNfcTags() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Secure NFC tags could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeAdminApi(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const secureTag = await configureSecureNfcTag({
      unitId: body.unitId,
      publicId: body.publicId,
      uidHex: body.uidHex,
      destinationPath: body.destinationPath,
      actorEmail: auth.user.email,
      request,
    });
    return Response.json({ secureTag }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Secure NFC configuration failed." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizeAdminApi(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    return Response.json(await removeSecureNfcTag(body.unitId, auth.user.email), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Secure NFC configuration could not be removed." }, { status: 400 });
  }
}

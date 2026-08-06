import { authorizeProfileApi } from "@/lib/profile-auth";
import { getOrCreateProfile, saveProfile } from "@/lib/profiles";
import { deleteOwnedProfileAndReleaseTags } from "@/lib/nfc";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;

  try {
    const profile = await getOrCreateProfile(auth.user);
    return Response.json({ profile });
  } catch {
    return Response.json({ error: "Your TapLex profile could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const profile = await saveProfile(auth.user.email, body);
    return Response.json({ profile });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Your TapLex profile could not be saved.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const result = await deleteOwnedProfileAndReleaseTags(auth.user, body.confirmation, request);
    return Response.json({ ...result, message: "Profile deleted and connected tags released." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Your profile could not be deleted." }, { status: 400 });
  }
}

import { authorizeProfileApi } from "@/lib/profile-auth";
import { listConnections, removeConnection, saveConnection, updateConnectionNote } from "@/lib/connections";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;
  return Response.json({ connections: await listConnections(auth.user.email) });
}

export async function POST(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as { handle?: unknown };
    const saved = await saveConnection(auth.user.email, body.handle);
    return Response.json({ ...saved, message: saved.created ? "Saved to People I Met." : "This person is already saved." });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Connection could not be saved." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as { id?: unknown; note?: unknown };
    const note = await updateConnectionNote(auth.user.email, body.id, body.note);
    return Response.json({ note });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Note could not be saved." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;
  try {
    const id = new URL(request.url).searchParams.get("id");
    await removeConnection(auth.user.email, id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Connection could not be removed." }, { status: 400 });
  }
}

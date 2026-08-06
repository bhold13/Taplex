import { authorizeAdminApi } from "@/lib/admin";
import { adminNfcAction, createNfcBatch, listNfcAuditLogs, listNfcInventory } from "@/lib/nfc";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorizeAdminApi(request);
  if (!auth.ok) return auth.response;
  try {
    const url = new URL(request.url);
    const [units, auditLogs] = await Promise.all([
      listNfcInventory({ search: url.searchParams.get("search") ?? "", status: url.searchParams.get("status") ?? "" }),
      listNfcAuditLogs(),
    ]);
    return Response.json({ units, auditLogs }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "NFC inventory could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeAdminApi(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const result = await createNfcBatch(auth.user.email, body, request);
    return Response.json(result, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "NFC batch could not be created." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await authorizeAdminApi(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json() as Record<string, unknown>;
    const result = await adminNfcAction(auth.user.email, body, request);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "NFC inventory action failed." }, { status: 400 });
  }
}

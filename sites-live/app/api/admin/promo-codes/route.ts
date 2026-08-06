import { authorizeAdminApi } from "@/lib/admin";
import { createPromoCode, listPromoCodes, updatePromoCode } from "@/lib/promo-codes";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorizeAdminApi(request);
  if (!auth.ok) return auth.response;
  try {
    return Response.json({ promoCodes: await listPromoCodes() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Pro codes could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeAdminApi(request);
  if (!auth.ok) return auth.response;
  try {
    const promoCode = await createPromoCode(await request.json());
    return Response.json({ promoCode }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Pro code could not be created." }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const auth = await authorizeAdminApi(request);
  if (!auth.ok) return auth.response;
  try {
    const promoCode = await updatePromoCode(await request.json());
    return Response.json({ promoCode });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Pro code could not be updated." }, { status: 400 });
  }
}

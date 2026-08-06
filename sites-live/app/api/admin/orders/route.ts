import { desc } from "drizzle-orm";
import { authorizeAdminApi } from "@/lib/admin";
import { getDb } from "@/db";
import { orders } from "@/db/schema";
import { ensureDatabaseSchema } from "@/lib/database";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorizeAdminApi(request);
  if (!auth.ok) return auth.response;

  await ensureDatabaseSchema();
  const rows = await getDb().select().from(orders).orderBy(desc(orders.createdAt)).limit(50);
  return Response.json({ orders: rows });
}

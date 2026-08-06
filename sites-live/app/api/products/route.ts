import { listPublicProducts, productToJson } from "@/lib/catalog";
import { paymentsConfigured } from "@/lib/stripe";
import { ensureDatabaseSchema } from "@/lib/database";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await ensureDatabaseSchema();
    const rows = await listPublicProducts();
    return Response.json({
      products: rows.map(productToJson),
      paymentsConfigured: paymentsConfigured(),
    }, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" },
    });
  } catch {
    return Response.json({ error: "The TapLex catalog is temporarily unavailable." }, { status: 503 });
  }
}

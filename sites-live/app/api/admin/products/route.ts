import { authorizeAdminApi } from "@/lib/admin";
import { listAllProducts, parseProductForm, productSlug, productToJson } from "@/lib/catalog";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { deleteProductImage, storeProductImage } from "@/lib/media";
import { paymentsConfigured } from "@/lib/stripe";
import { ensureDatabaseSchema } from "@/lib/database";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authorizeAdminApi(request);
  if (!auth.ok) return auth.response;

  try {
    await ensureDatabaseSchema();
    const rows = await listAllProducts();
    return Response.json({ products: rows.map(productToJson), paymentsConfigured: paymentsConfigured() });
  } catch {
    return Response.json({ error: "Products could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await authorizeAdminApi(request);
  if (!auth.ok) return auth.response;

  let imageKey: string | null = null;
  try {
    await ensureDatabaseSchema();
    const form = await request.formData();
    const input = parseProductForm(form);
    const image = form.get("image");
    if (image instanceof File && image.size > 0) imageKey = await storeProductImage(image);

    const id = crypto.randomUUID();
    const [created] = await getDb().insert(products).values({
      id,
      slug: productSlug(input.name, id),
      ...input,
      imageKey,
    }).returning();

    return Response.json({ product: productToJson(created) }, { status: 201 });
  } catch (error) {
    await deleteProductImage(imageKey).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Product could not be created.";
    return Response.json({ error: message }, { status: 400 });
  }
}

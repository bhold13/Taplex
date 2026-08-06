import { eq } from "drizzle-orm";
import { authorizeAdminApi } from "@/lib/admin";
import { getDb } from "@/db";
import { products } from "@/db/schema";
import { parseProductForm, productToJson } from "@/lib/catalog";
import { deleteProductImage, storeProductImage } from "@/lib/media";
import { ensureDatabaseSchema } from "@/lib/database";

export const dynamic = "force-dynamic";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdminApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "Invalid product." }, { status: 400 });

  let newImageKey: string | null = null;
  try {
    await ensureDatabaseSchema();
    const [existing] = await getDb().select().from(products).where(eq(products.id, id)).limit(1);
    if (!existing) return Response.json({ error: "Product not found." }, { status: 404 });

    const form = await request.formData();
    const input = parseProductForm(form);
    const image = form.get("image");
    if (image instanceof File && image.size > 0) newImageKey = await storeProductImage(image);

    const [updated] = await getDb().update(products).set({
      ...input,
      imageKey: newImageKey ?? existing.imageKey,
      updatedAt: new Date().toISOString(),
    }).where(eq(products.id, id)).returning();

    if (newImageKey) await deleteProductImage(existing.imageKey).catch(() => undefined);
    return Response.json({ product: productToJson(updated) });
  } catch (error) {
    await deleteProductImage(newImageKey).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Product could not be updated.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await authorizeAdminApi(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "Invalid product." }, { status: 400 });

  await ensureDatabaseSchema();
  const [existing] = await getDb().select().from(products).where(eq(products.id, id)).limit(1);
  if (!existing) return Response.json({ error: "Product not found." }, { status: 404 });

  await getDb().delete(products).where(eq(products.id, id));
  await deleteProductImage(existing.imageKey).catch(() => undefined);
  return Response.json({ deleted: true });
}

import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { products } from "@/db/schema";

export type ProductRecord = typeof products.$inferSelect;

export type ProductInput = {
  active: boolean;
  description: string;
  imageAlt: string;
  inventory: number;
  name: string;
  priceCents: number;
  trackInventory: boolean;
};

export function productToJson(product: ProductRecord) {
  return {
    ...product,
    imageUrl: productImageUrl(product.imageKey),
  };
}

export function productImageUrl(imageKey: string | null) {
  if (!imageKey) return null;
  if (imageKey.startsWith("static:")) {
    const filename = imageKey.slice("static:".length);
    return /^[a-z0-9-]+\.(?:png|webp|jpg)$/.test(filename) ? `/products/${filename}` : null;
  }
  return `/api/media/${encodeURIComponent(imageKey)}`;
}

export async function listPublicProducts() {
  const rows = await getDb()
    .select()
    .from(products)
    .where(eq(products.active, true))
    .orderBy(asc(products.name));
  return rows.filter((row) => !row.trackInventory || row.inventory > 0);
}

export async function listAllProducts() {
  return getDb().select().from(products).orderBy(desc(products.updatedAt), asc(products.name));
}

export function parseProductForm(form: FormData): ProductInput {
  const name = stringField(form, "name", 80);
  const description = stringField(form, "description", 600, false);
  const imageAlt = stringField(form, "imageAlt", 120, false);
  const price = Number(form.get("price"));
  const inventory = Number(form.get("inventory"));

  if (!name) throw new Error("Product name is required.");
  if (!Number.isFinite(price) || price < 1 || price > 10000) throw new Error("Price must be between $1 and $10,000.");
  if (!Number.isInteger(inventory) || inventory < 0 || inventory > 100000) throw new Error("Inventory must be a whole number between 0 and 100,000.");

  return {
    name,
    description,
    imageAlt,
    priceCents: Math.round(price * 100),
    inventory,
    trackInventory: form.get("trackInventory") === "true",
    active: form.get("active") !== "false",
  };
}

export function productSlug(name: string, id: string) {
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "product";
  return `${base}-${id.slice(0, 8)}`;
}

function stringField(form: FormData, key: string, maxLength: number, required = true) {
  const value = form.get(key);
  if (typeof value !== "string") {
    if (required) throw new Error(`${key} is required.`);
    return "";
  }
  return value.trim().slice(0, maxLength);
}

import { authorizeProfileApi } from "@/lib/profile-auth";
import { deleteStoredImage, storeGalleryImage } from "@/lib/media";
import { ensureDatabaseSchema } from "@/lib/database";
import { requireDatabase } from "@/lib/runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await authorizeProfileApi(request); if (!auth.ok) return auth.response;
  await ensureDatabaseSchema();
  const db = requireDatabase();
  const profile = await db.prepare("SELECT id FROM profiles WHERE owner_email=? LIMIT 1").bind(auth.user.email.toLowerCase()).first<{id:string}>();
  if (!profile) return Response.json({ error: "Profile not found." }, { status: 404 });
  const count = await db.prepare("SELECT COUNT(*) count FROM profile_gallery_items WHERE profile_id=?").bind(profile.id).first<{count:number}>();
  if ((count?.count ?? 0) >= 12) return Response.json({ error: "Your gallery can hold up to 12 work photos." }, { status: 400 });
  let imageKey: string | null = null;
  try {
    const form = await request.formData(); const image = form.get("image");
    if (!(image instanceof File) || !image.size) return Response.json({ error: "Choose a work photo." }, { status: 400 });
    imageKey = await storeGalleryImage(image);
    const id = crypto.randomUUID(); const caption = String(form.get("caption") ?? "").trim().slice(0,120); const altText = String(form.get("altText") ?? "").trim().slice(0,160) || caption || "Creator work sample";
    await db.prepare("INSERT INTO profile_gallery_items (id,profile_id,image_key,caption,alt_text,sort_order) VALUES (?,?,?,?,?,?)").bind(id,profile.id,imageKey,caption,altText,count?.count ?? 0).run();
    return Response.json({ item: { id, imageKey, caption, altText, sortOrder: count?.count ?? 0 } });
  } catch (error) { await deleteStoredImage(imageKey).catch(() => undefined); return Response.json({ error: error instanceof Error ? error.message : "Work photo could not be uploaded." }, { status: 400 }); }
}

export async function DELETE(request: Request) {
  const auth = await authorizeProfileApi(request); if (!auth.ok) return auth.response;
  await ensureDatabaseSchema(); const db = requireDatabase();
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const item = await db.prepare("SELECT g.image_key FROM profile_gallery_items g JOIN profiles p ON p.id=g.profile_id WHERE g.id=? AND p.owner_email=? LIMIT 1").bind(id,auth.user.email.toLowerCase()).first<{image_key:string}>();
  if (!item) return Response.json({ error: "Gallery photo not found." }, { status: 404 });
  await db.prepare("DELETE FROM profile_gallery_items WHERE id=?").bind(id).run(); await deleteStoredImage(item.image_key).catch(() => undefined);
  return Response.json({ ok: true });
}

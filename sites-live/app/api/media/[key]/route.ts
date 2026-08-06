import { requireBucket } from "@/lib/runtime";

const SAFE_IMAGE_KEY = /^[0-9a-f-]{36}\.(?:jpg|png|webp)$/;

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  if (!SAFE_IMAGE_KEY.test(key)) return new Response("Not found", { status: 404 });

  const object = await requireBucket().get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", object.httpEtag);
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}

import { authorizeProfileApi } from "@/lib/profile-auth";
import { deleteStoredImage, storeProfileImage } from "@/lib/media";
import { updateProfileAvatar } from "@/lib/profiles";

export const dynamic = "force-dynamic";
const MAX_PROFILE_REQUEST_BYTES = 6 * 1024 * 1024;

export async function POST(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > MAX_PROFILE_REQUEST_BYTES) {
    return Response.json({ error: "That profile photo is too large. Choose it again so TapLex can optimize it before uploading." }, { status: 413 });
  }

  let newKey: string | null = null;
  try {
    const form = await request.formData();
    const image = form.get("image");
    if (!(image instanceof File) || image.size === 0) {
      return Response.json({ error: "Choose a profile image." }, { status: 400 });
    }

    newKey = await storeProfileImage(image);
    const oldKey = await updateProfileAvatar(auth.user.email, newKey);
    await deleteStoredImage(oldKey).catch(() => undefined);
    return Response.json({ avatarKey: newKey });
  } catch (error) {
    await deleteStoredImage(newKey).catch(() => undefined);
    const message = error instanceof Error ? error.message : "Profile image could not be uploaded.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await authorizeProfileApi(request);
  if (!auth.ok) return auth.response;

  try {
    const oldKey = await updateProfileAvatar(auth.user.email, null);
    await deleteStoredImage(oldKey).catch(() => undefined);
    return Response.json({ avatarKey: null });
  } catch {
    return Response.json({ error: "Profile image could not be removed." }, { status: 400 });
  }
}

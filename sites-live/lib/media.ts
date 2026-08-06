import { requireBucket } from "@/lib/runtime";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function storeProductImage(file: File) {
  return storeImage(file, "taplex-product", "Product");
}

export async function storeProfileImage(file: File) {
  return storeImage(file, "taplex-profile", "Profile");
}

export async function storeGalleryImage(file: File) {
  return storeImage(file, "taplex-gallery", "Gallery");
}

async function storeImage(file: File, uploadedFor: string, label: string) {
  const extension = IMAGE_TYPES.get(file.type);
  if (!extension) throw new Error(`Use a JPG, PNG, or WebP ${label.toLowerCase()} image.`);
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) throw new Error(`${label} images must be smaller than 5 MB.`);

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidImageSignature(bytes, file.type)) throw new Error("The uploaded file is not a valid image.");

  const key = `${crypto.randomUUID()}.${extension}`;
  await requireBucket().put(key, bytes, {
    httpMetadata: { contentType: file.type },
    customMetadata: { uploadedFor },
  });
  return key;
}

export async function deleteProductImage(key: string | null) {
  return deleteStoredImage(key);
}

export async function deleteStoredImage(key: string | null) {
  if (!key || key.startsWith("static:")) return;
  await requireBucket().delete(key);
}

function hasValidImageSignature(bytes: Uint8Array, type: string) {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === "image/webp") {
    return String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

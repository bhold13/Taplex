"use client";

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const TARGET_UPLOAD_BYTES = 850 * 1024;
const MAX_IMAGE_DIMENSION = 1600;

export async function optimizeImageUpload(file: File) {
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) throw new Error("Choose a JPG, PNG, or WebP image.");
  if (file.size <= 0) throw new Error("Choose an image to upload.");
  if (file.size > MAX_SOURCE_BYTES) throw new Error("Choose a photo smaller than 25 MB.");
  if (file.size <= TARGET_UPLOAD_BYTES) return file;

  const { image, objectUrl } = await loadImage(file);
  try {
    let best: Blob | null = null;
    let maxDimension = MAX_IMAGE_DIMENSION;
    let quality = 0.86;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("This browser could not prepare the image.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(image, 0, 0, width, height);

      const candidate = await canvasToBlob(canvas, "image/webp", quality);
      if (!best || candidate.size < best.size) best = candidate;
      if (candidate.size <= TARGET_UPLOAD_BYTES) break;
      maxDimension = Math.max(900, Math.round(maxDimension * 0.82));
      quality = Math.max(0.66, quality - 0.06);
    }

    if (!best) throw new Error("This photo could not be optimized.");
    const extension = best.type === "image/png" ? "png" : best.type === "image/jpeg" ? "jpg" : "webp";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "taplex-image";
    return new File([best], `${baseName}.${extension}`, { type: best.type, lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(file: File) {
  return new Promise<{ image: HTMLImageElement; objectUrl: string }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve({ image, objectUrl });
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("This image could not be opened. Try saving it as JPG, PNG, or WebP."));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("This photo could not be optimized.")), type, quality);
  });
}

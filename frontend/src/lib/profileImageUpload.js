import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";

import {
  getFirebaseAuth,
  getFirebaseStorage,
  isFirebaseConfigured
} from "./firebase/clientApp";
import { ProfileStoreError } from "./profileStore";

export const maxImageBytes = 5 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function getImageUploadError(error, fallbackMessage = "Image upload failed.") {
  if (error instanceof ProfileStoreError) {
    return error;
  }

  const code = String(error?.code || "").toLowerCase();
  const message = String(error?.message || "");
  const isPermissionError =
    code === "storage/unauthorized" ||
    code === "permission-denied" ||
    /missing or insufficient permissions/i.test(message);

  if (isPermissionError) {
    return new ProfileStoreError(
      "Image uploads are blocked by Firebase Storage. Enable Cloud Storage for the TapLex Firebase project, publish storage.rules, and try again. This project currently requires a Firebase billing-plan upgrade before Storage can be enabled.",
      "storage-not-enabled"
    );
  }

  return new ProfileStoreError(fallbackMessage, "image-upload-failed");
}

export function validateImageFile(file) {
  if (!file || !allowedImageTypes.has(file.type)) {
    throw new ProfileStoreError("Choose a JPG, PNG, WebP, or GIF image.", "invalid-image-type");
  }

  if (file.size <= 0) {
    throw new ProfileStoreError("The selected image is empty.", "invalid-image");
  }

  if (file.size > maxImageBytes) {
    throw new ProfileStoreError("Images must be 5 MB or smaller.", "image-too-large");
  }
}

function readAsDataUrl(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    reader.onerror = () => reject(new ProfileStoreError("The image could not be read.", "image-read-failed"));
    reader.onload = () => {
      onProgress?.(100);
      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

async function getSignedInUser() {
  const auth = getFirebaseAuth();

  if (typeof auth.authStateReady === "function") {
    await auth.authStateReady();
  }

  if (!auth.currentUser) {
    throw new ProfileStoreError("Sign in before uploading profile images.", "auth-required");
  }

  return auth.currentUser;
}

export async function uploadProfileImage({ file, kind, onProgress }) {
  validateImageFile(file);

  if (!isFirebaseConfigured()) {
    return readAsDataUrl(file, onProgress);
  }

  const user = await getSignedInUser();
  const storagePath =
    kind === "cover"
      ? `cover-images/${user.uid}/cover-image`
      : `profile-images/${user.uid}/profile-photo`;
  const storageRef = ref(getFirebaseStorage(), storagePath);
  const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type });

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        onProgress?.(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
      },
      (error) => reject(getImageUploadError(error)),
      async () => {
        try {
          resolve(await getDownloadURL(uploadTask.snapshot.ref));
        } catch (error) {
          reject(getImageUploadError(error, "The uploaded image URL could not be loaded."));
        }
      }
    );
  });
}

export async function uploadGalleryImage({ file, onProgress }) {
  validateImageFile(file);
  if (!isFirebaseConfigured()) return readAsDataUrl(file, onProgress);

  const user = await getSignedInUser();
  const imageId = crypto.randomUUID();
  const storageRef = ref(getFirebaseStorage(), `gallery-images/${user.uid}/${imageId}`);
  const uploadTask = uploadBytesResumable(storageRef, file, { contentType: file.type });

  return new Promise((resolve, reject) => {
    uploadTask.on("state_changed", (snapshot) => onProgress?.(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)), (error) => reject(getImageUploadError(error)), async () => {
      try { resolve({ id: imageId, url: await getDownloadURL(uploadTask.snapshot.ref) }); }
      catch (error) { reject(getImageUploadError(error, "The gallery image URL could not be loaded.")); }
    });
  });
}

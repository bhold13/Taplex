import {
  getImageUploadError,
  maxImageBytes,
  validateImageFile
} from "@/lib/profileImageUpload";

describe("profile image validation", () => {
  it("accepts supported image files", () => {
    const image = new File(["image"], "profile.png", { type: "image/png" });

    expect(() => validateImageFile(image)).not.toThrow();
  });

  it("rejects non-images and files over 5 MB", () => {
    const textFile = new File(["text"], "profile.txt", { type: "text/plain" });
    const largeImage = { name: "large.jpg", type: "image/jpeg", size: maxImageBytes + 1 };

    expect(() => validateImageFile(textFile)).toThrow(/JPG, PNG, WebP, or GIF/i);
    expect(() => validateImageFile(largeImage)).toThrow(/5 MB or smaller/i);
  });

  it("explains Firebase Storage permission failures", () => {
    const error = getImageUploadError({
      code: "storage/unauthorized",
      message: "Missing or insufficient permissions."
    });

    expect(error.code).toBe("storage-not-enabled");
    expect(error.message).toMatch(/Enable Cloud Storage/i);
    expect(error.message).toMatch(/billing-plan upgrade/i);
  });
});

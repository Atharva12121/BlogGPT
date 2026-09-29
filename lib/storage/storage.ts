import { CloudinaryStorage } from "./cloudinary-storage";
import { LocalStorage } from "./local-storage";
import { MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_SIZE_LABEL } from "./constants";
import type { UploadResult } from "./types";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
export { MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_SIZE_LABEL } from "./constants";

export function validateImageFile(file: File): string | null {
  if (!ALLOWED.includes(file.type)) {
    return "Invalid image format. Allowed: JPEG, PNG, WEBP.";
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return `Image must be ${MAX_IMAGE_SIZE_LABEL} or smaller.`;
  }
  return null;
}

export async function storeImage(
  file: Buffer,
  filename: string,
  mimeType: string
): Promise<UploadResult & { coverImagePublicId?: string; localImagePath?: string }> {
  const mode = process.env.STORAGE_MODE || "both";
  const local = new LocalStorage();
  const cloud = new CloudinaryStorage();

  if (mode === "local") {
    const r = await local.upload(file, filename, mimeType);
    return { ...r, localImagePath: r.localPath };
  }

  if (mode === "cloudinary") {
    const r = await cloud.upload(file, filename, mimeType);
    return { url: r.url, coverImagePublicId: r.publicId };
  }

  const cloudResult = await cloud.upload(file, filename, mimeType);
  try {
    const localResult = await local.upload(file, filename, mimeType);
    return {
      url: cloudResult.url,
      coverImagePublicId: cloudResult.publicId,
      localImagePath: localResult.localPath,
    };
  } catch (error) {
    if (cloudResult.publicId) {
      try {
        await cloud.delete(cloudResult.publicId);
      } catch (cleanupError) {
        console.error("Unable to roll back Cloudinary image after local storage failed", cleanupError);
      }
    }
    throw error;
  }
}

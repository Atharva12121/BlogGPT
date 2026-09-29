import { NextRequest } from "next/server";
import sharp from "sharp";
import { requireAuth } from "@/lib/auth/api";
import { MAX_IMAGE_SIZE_BYTES } from "@/lib/storage/constants";
import {
  storeImage,
  validateImageFile,
} from "@/lib/storage/storage";
import { CloudinaryUploadError } from "@/lib/storage/cloudinary-storage";
import { jsonError, jsonSuccess } from "@/lib/utils/api-response";

export async function POST(request: NextRequest) {
  const { error } = await requireAuth(["ADMIN", "EMPLOYEE"]);
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("No file uploaded", 400);
    }

    const validation = validateImageFile(file);
    if (validation) return jsonError(validation, 400);

    const buffer = Buffer.from(await file.arrayBuffer());
    let optimized: Buffer;
    try {
      optimized = await sharp(buffer)
        .rotate()
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();
    } catch (error) {
      console.warn("Rejected an unreadable image upload", error);
      return jsonError("The uploaded file is not a valid supported image.", 400);
    }

    if (optimized.byteLength > MAX_IMAGE_SIZE_BYTES) {
      return jsonError("Optimized image must be 5 MB or smaller.", 400);
    }

    const filename = `${file.name.replace(/\.[^.]+$/, "") || "image"}.webp`;
    const result = await storeImage(optimized, filename, "image/webp");

    return jsonSuccess({
      url: result.url,
      coverImagePublicId: result.coverImagePublicId ?? result.publicId,
      localImagePath: result.localImagePath ?? result.localPath,
    });
  } catch (e) {
    if (e instanceof CloudinaryUploadError) {
      return jsonError(e.message, 502);
    }
    console.error("Image upload failed", e);
    return jsonError("Unable to store uploaded image.", 500);
  }
}

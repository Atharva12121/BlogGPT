import { v2 as cloudinary } from "cloudinary";
import type { StorageProvider, UploadResult } from "./types";

export class CloudinaryUploadError extends Error {
  constructor(statusCode?: number, invalidSignature = false) {
    const message = invalidSignature
      ? "Cloudinary rejected the configured credentials. Check that the cloud name, API key, and API secret in .env belong to the same Cloudinary account."
      : statusCode === 403
        ? "Cloudinary denied this image upload (HTTP 403). Check the account's API credentials and upload permissions."
        : `Cloudinary image upload failed${statusCode ? ` (HTTP ${statusCode})` : ""}. Check the Cloudinary account and try again.`;
    super(message);
    this.name = "CloudinaryUploadError";
  }
}

function configured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function getCloudinary() {
  if (!configured()) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

export class CloudinaryStorage implements StorageProvider {
  async upload(
    file: Buffer,
    filename: string,
    mimeType: string
  ): Promise<UploadResult> {
    const cld = getCloudinary();
    const base64 = `data:${mimeType};base64,${file.toString("base64")}`;
    let result;
    try {
      result = await cld.uploader.upload(base64, {
        folder: "blog-builder",
        public_id: filename.replace(/\.[^.]+$/, ""),
        resource_type: "image",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const statusCode =
        typeof error === "object" && error !== null && "http_code" in error &&
        typeof error.http_code === "number"
          ? error.http_code
          : Number(message.match(/status code\s*-\s*(\d+)/i)?.[1]);
      if (/invalid signature|unauthorized|authentication/i.test(message)) {
        throw new CloudinaryUploadError(statusCode || undefined, true);
      }
      if (statusCode) {
        throw new CloudinaryUploadError(statusCode);
      }
      throw error;
    }
    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  async delete(publicId: string): Promise<void> {
    const cld = getCloudinary();
    await cld.uploader.destroy(publicId);
  }
}

export function isCloudinaryConfigured(): boolean {
  return configured();
}

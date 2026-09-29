import fs from "fs/promises";
import path from "path";
import type { StorageProvider, UploadResult } from "./types";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export class LocalStorage implements StorageProvider {
  async upload(
    file: Buffer,
    filename: string,
    _mimeType: string
  ): Promise<UploadResult> {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const safeName = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    await fs.writeFile(filePath, file);
    const localPath = `/uploads/${safeName}`;
    return { url: localPath, localPath };
  }

  async delete(localPath: string): Promise<void> {
    const relative = localPath.startsWith("/") ? localPath.slice(1) : localPath;
    const full = path.join(process.cwd(), "public", relative);
    try {
      await fs.unlink(full);
    } catch {
      /* ignore missing file */
    }
  }
}

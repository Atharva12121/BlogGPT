export type UploadResult = {
  url: string;
  publicId?: string;
  localPath?: string;
};

export interface StorageProvider {
  upload(file: Buffer, filename: string, mimeType: string): Promise<UploadResult>;
  delete?(publicIdOrPath: string): Promise<void>;
}

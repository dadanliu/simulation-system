import { Inject, Injectable } from "@nestjs/common";
import { mockBusinessError, mockSuccess } from "./mock-response";
import { STORAGE_SERVICE } from "./storage/storage.tokens";
import type { StorageService } from "./storage/storage.types";

export type UploadedMemoryFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

const ALLOWED_FILE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 2 * 1024 * 1024;

@Injectable()
export class UploadService {
  constructor(@Inject(STORAGE_SERVICE) private readonly storageService: StorageService) {}

  createUploadToken(filename?: string) {
    if (!filename?.trim()) {
      return mockBusinessError(30001, "filename is required");
    }

    return mockSuccess({
      uploadId: `mock_upload_${Date.now()}`,
      filename,
      uploadUrl: "https://mock-upload.local/upload",
      expiresIn: 300
    });
  }

  async uploadFile(file?: UploadedMemoryFile, scene?: string) {
    if (!file) {
      return mockBusinessError(30002, "file is required");
    }

    if (!ALLOWED_FILE_TYPES.has(file.mimetype)) {
      return mockBusinessError(30003, "unsupported file type");
    }

    if (file.size > MAX_FILE_SIZE) {
      return mockBusinessError(30004, "file size exceeds 2MB limit");
    }

    const storedFile = await this.storageService.save(file, scene?.trim() || "commodity");

    return mockSuccess({
      driver: storedFile.driver,
      fileId: storedFile.fileId,
      fileName: storedFile.fileName,
      fileSize: storedFile.size,
      fileType: storedFile.mimeType,
      key: storedFile.key,
      mimeType: storedFile.mimeType,
      scene: storedFile.scene,
      size: storedFile.size,
      uploadId: storedFile.fileId,
      url: storedFile.url
    });
  }
}

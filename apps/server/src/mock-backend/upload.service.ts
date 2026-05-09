import { Inject, Injectable } from "@nestjs/common";
import { mockBusinessError, mockSuccess } from "./mock-response";
import { FileRegistryService } from "./storage/file-registry.service";
import { STORAGE_SERVICE } from "./storage/storage.tokens";
import type { StorageService } from "./storage/storage.types";
import { validateUploadedImage } from "./upload-security";

export type UploadedMemoryFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

@Injectable()
export class UploadService {
  constructor(
    @Inject(STORAGE_SERVICE) private readonly storageService: StorageService,
    private readonly fileRegistryService: FileRegistryService
  ) {}

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
    const validation = validateUploadedImage(file);

    if (!validation.ok) {
      return mockBusinessError(validation.code, validation.message);
    }

    const uploadedFile = file as UploadedMemoryFile;
    const storedFile = await this.storageService.save(
      uploadedFile,
      scene?.trim() || "commodity"
    );
    this.fileRegistryService.save(storedFile);

    return mockSuccess({
      driver: storedFile.driver,
      fileId: storedFile.fileId,
      fileName: storedFile.fileName,
      fileSize: storedFile.size,
      fileType: storedFile.mimeType,
      key: storedFile.key,
      mimeType: storedFile.mimeType,
      scanStatus: validation.scanStatus,
      scene: storedFile.scene,
      size: storedFile.size,
      uploadId: storedFile.fileId,
      url: storedFile.url
    });
  }

  async getFileAccess(fileId: string) {
    return this.storageService.getAccess(fileId);
  }
}

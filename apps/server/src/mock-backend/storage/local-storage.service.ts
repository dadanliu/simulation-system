import { Injectable } from "@nestjs/common";
import type { StoredFile, StorageScene, StorageService } from "./storage.types";
import type { UploadedMemoryFile } from "../upload.service";

@Injectable()
export class LocalStorageService implements StorageService {
  save(file: UploadedMemoryFile, scene: StorageScene): StoredFile {
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileId = `mock_file_${Date.now()}`;

    return {
      fileId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      scene,
      size: file.size,
      url: `https://mock-cdn.local/uploads/${fileId}-${sanitizedFilename}`
    };
  }
}

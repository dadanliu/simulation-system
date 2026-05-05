import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { StoredFile, StorageScene, StorageService } from "./storage.types";
import type { UploadedMemoryFile } from "../upload.service";

@Injectable()
export class LocalStorageService implements StorageService {
  constructor(private readonly configService: ConfigService) {}

  save(file: UploadedMemoryFile, scene: StorageScene): StoredFile {
    const sanitizedFilename = this.sanitizeFilename(file.originalname);
    const fileId = `local_${randomUUID()}`;
    const key = `${scene}/${fileId}-${sanitizedFilename}`;
    const uploadDir = this.configService.get<string>("LOCAL_UPLOAD_DIR", ".dev/uploads");
    const publicBaseUrl = this.configService.get<string>("LOCAL_UPLOAD_PUBLIC_BASE_URL", "http://localhost:3002/uploads");
    const targetPath = path.resolve(uploadDir, key);

    mkdirSync(path.dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, file.buffer);

    return {
      driver: "local",
      fileId,
      fileName: file.originalname,
      key,
      mimeType: file.mimetype,
      scene,
      size: file.size,
      url: `${publicBaseUrl.replace(/\/$/, "")}/${key}`
    };
  }

  private sanitizeFilename(filename: string) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  }
}

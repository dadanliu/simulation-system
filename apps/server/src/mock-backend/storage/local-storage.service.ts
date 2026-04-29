import { Injectable } from "@nestjs/common";
import type { StoredFile, StorageScene, StorageService } from "./storage.types";
import type { UploadedMemoryFile } from "../upload.service";

@Injectable()
export class LocalStorageService implements StorageService {
  save(file: UploadedMemoryFile, scene: StorageScene): StoredFile {
    const fileId = `mock_file_${Date.now()}`;

    return {
      fileId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      scene,
      size: file.size,
      // 本地演示不启动静态文件服务，直接返回 data URL，保证列表页能真实预览图片。
      url: `data:${file.mimetype};base64,${file.buffer.toString("base64")}`
    };
  }
}

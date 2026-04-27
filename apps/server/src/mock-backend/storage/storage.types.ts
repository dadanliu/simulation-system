import type { UploadedMemoryFile } from "../upload.service";

export type StorageScene = "commodity" | string;

export type StoredFile = {
  fileId: string;
  fileName: string;
  mimeType: string;
  scene: StorageScene;
  size: number;
  url: string;
};

export type StorageService = {
  save(file: UploadedMemoryFile, scene: StorageScene): StoredFile;
};

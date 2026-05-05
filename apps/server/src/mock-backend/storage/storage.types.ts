import type { UploadedMemoryFile } from "../upload.service";

export type StorageScene = "commodity" | string;

export type StoredFile = {
  driver: "local" | "oss" | "s3";
  fileId: string;
  fileName: string;
  key: string;
  mimeType: string;
  scene: StorageScene;
  size: number;
  url: string;
};

export type StorageService = {
  save(file: UploadedMemoryFile, scene: StorageScene): Promise<StoredFile> | StoredFile;
};

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

export type StoredFileAccess = {
  body?: Buffer;
  driver: StoredFile["driver"];
  mimeType: string;
  redirectUrl?: string;
};

export type StorageService = {
  getAccess(
    fileId: string
  ): Promise<StoredFileAccess | null> | StoredFileAccess | null;
  save(
    file: UploadedMemoryFile,
    scene: StorageScene
  ): Promise<StoredFile> | StoredFile;
};

import { Injectable } from "@nestjs/common";
import { mockBusinessError, mockSuccess } from "./mock-response";

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

  uploadFile(file?: UploadedMemoryFile, scene?: string) {
    if (!file) {
      return mockBusinessError(30002, "file is required");
    }

    if (!ALLOWED_FILE_TYPES.has(file.mimetype)) {
      return mockBusinessError(30003, "unsupported file type");
    }

    if (file.size > MAX_FILE_SIZE) {
      return mockBusinessError(30004, "file size exceeds 2MB limit");
    }

    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uploadId = `mock_file_${Date.now()}`;

    return mockSuccess({
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      scene: scene?.trim() || "commodity",
      uploadId,
      url: `https://mock-cdn.local/uploads/${uploadId}-${sanitizedFilename}`
    });
  }
}

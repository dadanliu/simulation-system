import { Injectable } from "@nestjs/common";
import { mockBusinessError, mockSuccess } from "./mock-response";

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
}

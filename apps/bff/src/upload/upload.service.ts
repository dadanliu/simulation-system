import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import type { AuthUser } from "../user/user.types";
import { ApiClientService } from "../bff/api-client.service";

export type UploadedMemoryFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

export type UploadResult = {
  fileName: string;
  fileSize: number;
  fileType: string;
  scene: string;
  uploadId: string;
  url: string;
};

export type ProductImageUploadResult = {
  fileId: string;
  mimeType: string;
  scene: string;
  size: number;
  url: string;
};

@Injectable()
export class UploadService {
  constructor(private readonly apiClientService: ApiClientService) {}

  async uploadFile(request: Request, user: AuthUser, file: UploadedMemoryFile, scene?: string) {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });

    formData.append("file", blob, file.originalname);
    formData.append("scene", scene?.trim() || "commodity");

    const result = await this.apiClientService.request<UploadResult>(request, "/api/upload", {
      formData,
      method: "POST",
      userId: user.id
    });

    return {
      fileId: result.uploadId,
      mimeType: result.fileType,
      scene: result.scene,
      size: result.fileSize,
      url: result.url
    } satisfies ProductImageUploadResult;
  }
}

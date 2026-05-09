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
  driver?: string;
  fileId?: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  key?: string;
  mimeType?: string;
  scanStatus?: "ready";
  scene: string;
  size?: number;
  uploadId: string;
  url: string;
};

export type ProductImageUploadResult = {
  fileId: string;
  mimeType: string;
  scanStatus?: "ready";
  scene: string;
  size: number;
  url: string;
};

@Injectable()
export class UploadService {
  constructor(private readonly apiClientService: ApiClientService) {}

  async uploadFile(
    request: Request,
    user: AuthUser,
    file: UploadedMemoryFile,
    scene?: string
  ) {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], {
      type: file.mimetype
    });

    formData.append("file", blob, file.originalname);
    formData.append("scene", scene?.trim() || "commodity");

    const result = await this.apiClientService.request<UploadResult>(
      request,
      "/api/upload",
      {
        formData,
        method: "POST",
        userId: user.id
      }
    );

    const fileId = result.fileId ?? result.uploadId;

    return {
      fileId,
      mimeType: result.mimeType ?? result.fileType,
      scanStatus: result.scanStatus,
      scene: result.scene,
      size: result.size ?? result.fileSize,
      url: `/api/files/${encodeURIComponent(fileId)}`
    } satisfies ProductImageUploadResult;
  }

  async getFile(request: Request, fileId: string, userId?: string) {
    return this.apiClientService.requestRaw(request, `/api/files/${fileId}`, {
      method: "GET",
      userId
    });
  }
}

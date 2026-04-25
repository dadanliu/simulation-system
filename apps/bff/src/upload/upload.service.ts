import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import type { AuthUser } from "../auth/mock-users";
import { ApiClientService } from "../bff/api-client.service";
import { BffBusinessException } from "../bff/errors";

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

@Injectable()
export class UploadService {
  constructor(private readonly apiClientService: ApiClientService) {}

  async uploadFile(request: Request, user: AuthUser, file?: UploadedMemoryFile, scene?: string) {
    if (!file) {
      throw new BffBusinessException("请选择文件后再上传");
    }

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(file.buffer)], { type: file.mimetype });

    formData.append("file", blob, file.originalname);
    formData.append("scene", scene?.trim() || "commodity");

    return this.apiClientService.request<UploadResult>(request, "/api/upload", {
      formData,
      method: "POST",
      userId: user.id
    });
  }
}

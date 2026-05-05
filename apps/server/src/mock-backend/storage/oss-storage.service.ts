import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, randomUUID } from "node:crypto";
import { FileRegistryService } from "./file-registry.service";
import type { StoredFile, StorageScene, StorageService } from "./storage.types";
import type { UploadedMemoryFile } from "../upload.service";

@Injectable()
export class OssStorageService implements StorageService {
  constructor(
    private readonly configService: ConfigService,
    private readonly fileRegistryService: FileRegistryService
  ) {}

  async save(file: UploadedMemoryFile, scene: StorageScene): Promise<StoredFile> {
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileId = `oss_${randomUUID()}`;
    const keyPrefix = this.configService.get<string>("OSS_KEY_PREFIX", "uploads").replace(/^\/|\/$/g, "");
    const key = `${keyPrefix}/${scene}/${fileId}-${sanitizedFilename}`;
    const bucket = this.configService.getOrThrow<string>("OSS_BUCKET");
    const region = this.configService.getOrThrow<string>("OSS_REGION");
    const accessKeyId = this.configService.getOrThrow<string>("OSS_ACCESS_KEY_ID");
    const accessKeySecret = this.configService.getOrThrow<string>("OSS_ACCESS_KEY_SECRET");
    const publicBaseUrl =
      this.configService.get<string>("OSS_PUBLIC_BASE_URL") ?? `https://${bucket}.${region}.aliyuncs.com`;
    const uploadBaseUrl =
      this.configService.get<string>("OSS_UPLOAD_BASE_URL") ?? `https://${bucket}.${region}.aliyuncs.com`;

    await this.putObject(`${uploadBaseUrl.replace(/\/$/, "")}/${key}`, file, {
      accessKeyId,
      accessKeySecret,
      bucket,
      key
    });

    return {
      driver: "oss",
      fileId,
      fileName: file.originalname,
      key,
      mimeType: file.mimetype,
      scene,
      size: file.size,
      url: `${publicBaseUrl.replace(/\/$/, "")}/${key}`
    };
  }

  async getAccess(fileId: string) {
    const storedFile = this.fileRegistryService.get(fileId);

    if (!storedFile || storedFile.driver !== "oss") {
      return null;
    }

    const bucket = this.configService.getOrThrow<string>("OSS_BUCKET");
    const region = this.configService.getOrThrow<string>("OSS_REGION");
    const accessKeyId = this.configService.getOrThrow<string>("OSS_ACCESS_KEY_ID");
    const accessKeySecret = this.configService.getOrThrow<string>("OSS_ACCESS_KEY_SECRET");
    const fetchBaseUrl =
      this.configService.get<string>("OSS_UPLOAD_BASE_URL") ?? `https://${bucket}.${region}.aliyuncs.com`;
    const response = await this.fetchObject(`${fetchBaseUrl.replace(/\/$/, "")}/${storedFile.key}`, {
      accessKeyId,
      accessKeySecret,
      bucket,
      key: storedFile.key
    });

    return {
      body: Buffer.from(await response.arrayBuffer()),
      driver: storedFile.driver,
      mimeType: storedFile.mimeType
    };
  }

  private async putObject(
    url: string,
    file: UploadedMemoryFile,
    credentials: {
      accessKeyId: string;
      accessKeySecret: string;
      bucket: string;
      key: string;
    }
  ) {
    const date = new Date().toUTCString();
    const canonicalResource = `/${credentials.bucket}/${credentials.key}`;
    const stringToSign = ["PUT", "", file.mimetype, date, canonicalResource].join("\n");
    const signature = createHmac("sha1", credentials.accessKeySecret).update(stringToSign).digest("base64");
    const response = await fetch(url, {
      body: new Uint8Array(file.buffer),
      headers: {
        Authorization: `OSS ${credentials.accessKeyId}:${signature}`,
        "Content-Type": file.mimetype,
        Date: date
      },
      method: "PUT"
    });

    if (!response.ok) {
      throw new Error(`OSS upload failed with status ${response.status}`);
    }
  }

  private async fetchObject(
    url: string,
    credentials: {
      accessKeyId: string;
      accessKeySecret: string;
      bucket: string;
      key: string;
    }
  ) {
    const date = new Date().toUTCString();
    const canonicalResource = `/${credentials.bucket}/${credentials.key}`;
    const stringToSign = ["GET", "", "", date, canonicalResource].join("\n");
    const signature = createHmac("sha1", credentials.accessKeySecret).update(stringToSign).digest("base64");
    const response = await fetch(url, {
      headers: {
        Authorization: `OSS ${credentials.accessKeyId}:${signature}`,
        Date: date
      },
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`OSS fetch failed with status ${response.status}`);
    }

    return response;
  }
}

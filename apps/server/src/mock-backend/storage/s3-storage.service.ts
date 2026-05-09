import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, createHmac, randomUUID } from "node:crypto";
import { FileRegistryService } from "./file-registry.service";
import type { StoredFile, StorageScene, StorageService } from "./storage.types";
import type { UploadedMemoryFile } from "../upload.service";
import { getEmptySha256 } from "../upload-security";

@Injectable()
export class S3StorageService implements StorageService {
  constructor(
    private readonly configService: ConfigService,
    private readonly fileRegistryService: FileRegistryService
  ) {}

  async save(
    file: UploadedMemoryFile,
    scene: StorageScene
  ): Promise<StoredFile> {
    const sanitizedFilename = file.originalname.replace(
      /[^a-zA-Z0-9._-]/g,
      "_"
    );
    const fileId = `s3_${randomUUID()}`;
    const keyPrefix = this.configService
      .get<string>("S3_KEY_PREFIX", "uploads")
      .replace(/^\/|\/$/g, "");
    const key = `${keyPrefix}/${scene}/${fileId}-${sanitizedFilename}`;
    const bucket = this.configService.getOrThrow<string>("S3_BUCKET");
    const region = this.configService.getOrThrow<string>("S3_REGION");
    const accessKeyId =
      this.configService.getOrThrow<string>("S3_ACCESS_KEY_ID");
    const secretAccessKey = this.configService.getOrThrow<string>(
      "S3_SECRET_ACCESS_KEY"
    );
    const publicBaseUrl =
      this.configService.get<string>("S3_PUBLIC_BASE_URL") ??
      `https://${bucket}.s3.${region}.amazonaws.com`;
    const uploadBaseUrl =
      this.configService.get<string>("S3_UPLOAD_BASE_URL") ??
      `https://${bucket}.s3.${region}.amazonaws.com`;
    const url = `${uploadBaseUrl.replace(/\/$/, "")}/${key}`;

    await this.putObject(url, file, {
      accessKeyId,
      region,
      secretAccessKey
    });

    return {
      driver: "s3",
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

    if (!storedFile || storedFile.driver !== "s3") {
      return null;
    }

    const bucket = this.configService.getOrThrow<string>("S3_BUCKET");
    const region = this.configService.getOrThrow<string>("S3_REGION");
    const accessKeyId =
      this.configService.getOrThrow<string>("S3_ACCESS_KEY_ID");
    const secretAccessKey = this.configService.getOrThrow<string>(
      "S3_SECRET_ACCESS_KEY"
    );
    const fetchBaseUrl =
      this.configService.get<string>("S3_UPLOAD_BASE_URL") ??
      `https://${bucket}.s3.${region}.amazonaws.com`;
    const response = await this.fetchObject(
      `${fetchBaseUrl.replace(/\/$/, "")}/${storedFile.key}`,
      {
        accessKeyId,
        region,
        secretAccessKey
      }
    );

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
      region: string;
      secretAccessKey: string;
    }
  ) {
    const parsedUrl = new URL(url);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = createHash("sha256").update(file.buffer).digest("hex");
    const canonicalUri = parsedUrl.pathname
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
    const canonicalHeaders =
      `content-type:${file.mimetype}\n` +
      `host:${parsedUrl.host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
    const canonicalRequest = [
      "PUT",
      canonicalUri,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join("\n");
    const credentialScope = `${dateStamp}/${credentials.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      createHash("sha256").update(canonicalRequest).digest("hex")
    ].join("\n");
    const signingKey = this.getSignatureKey(
      credentials.secretAccessKey,
      dateStamp,
      credentials.region
    );
    const signature = createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");
    const authorization = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const response = await fetch(url, {
      body: new Uint8Array(file.buffer),
      headers: {
        Authorization: authorization,
        "Content-Type": file.mimetype,
        Host: parsedUrl.host,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate
      },
      method: "PUT"
    });

    if (!response.ok) {
      throw new Error(`S3 upload failed with status ${response.status}`);
    }
  }

  private async fetchObject(
    url: string,
    credentials: {
      accessKeyId: string;
      region: string;
      secretAccessKey: string;
    }
  ) {
    const parsedUrl = new URL(url);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = getEmptySha256();
    const canonicalUri = parsedUrl.pathname
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
    const canonicalHeaders =
      `host:${parsedUrl.host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
    const canonicalRequest = [
      "GET",
      canonicalUri,
      "",
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join("\n");
    const credentialScope = `${dateStamp}/${credentials.region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      createHash("sha256").update(canonicalRequest).digest("hex")
    ].join("\n");
    const signingKey = this.getSignatureKey(
      credentials.secretAccessKey,
      dateStamp,
      credentials.region
    );
    const signature = createHmac("sha256", signingKey)
      .update(stringToSign)
      .digest("hex");
    const authorization = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const response = await fetch(url, {
      headers: {
        Authorization: authorization,
        Host: parsedUrl.host,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate
      },
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`S3 fetch failed with status ${response.status}`);
    }

    return response;
  }

  private getSignatureKey(
    secretAccessKey: string,
    dateStamp: string,
    region: string
  ) {
    const dateKey = createHmac("sha256", `AWS4${secretAccessKey}`)
      .update(dateStamp)
      .digest();
    const regionKey = createHmac("sha256", dateKey).update(region).digest();
    const serviceKey = createHmac("sha256", regionKey).update("s3").digest();
    return createHmac("sha256", serviceKey).update("aws4_request").digest();
  }
}

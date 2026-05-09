import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";

export type FileImageVariant = "detail" | "preview" | "thumb";

type SignedFileUrlInput = {
  fileId: string;
  variant: FileImageVariant;
  version: string;
};

@Injectable()
export class FileUrlService {
  private readonly publicBaseUrl: string;
  private readonly detailMaxAgeSeconds: number;
  private readonly detailStaleWhileRevalidateSeconds: number;
  private readonly secret: string;
  private readonly defaultTtlSeconds: number;
  private readonly previewCacheMaxAgeSeconds: number;
  private readonly previewCacheStaleWhileRevalidateSeconds: number;
  private readonly previewTtlSeconds: number;
  private readonly thumbMaxAgeSeconds: number;
  private readonly thumbStaleWhileRevalidateSeconds: number;

  constructor(configService: ConfigService) {
    this.publicBaseUrl = configService
      .get<string>("BFF_PUBLIC_BASE_URL", "http://localhost:3001")
      .replace(/\/$/, "");
    this.secret = configService.get<string>(
      "FILE_URL_SIGNING_SECRET",
      "next-bff-dev-file-secret"
    );
    this.defaultTtlSeconds = Number(
      configService.get<string>("FILE_URL_TTL_SECONDS", "604800")
    );
    this.detailMaxAgeSeconds = Number(
      configService.get<string>("FILE_CACHE_DETAIL_MAX_AGE_SECONDS", "31536000")
    );
    this.detailStaleWhileRevalidateSeconds = Number(
      configService.get<string>(
        "FILE_CACHE_DETAIL_STALE_WHILE_REVALIDATE_SECONDS",
        "86400"
      )
    );
    this.previewCacheMaxAgeSeconds = Number(
      configService.get<string>("FILE_CACHE_PREVIEW_MAX_AGE_SECONDS", "300")
    );
    this.previewCacheStaleWhileRevalidateSeconds = Number(
      configService.get<string>(
        "FILE_CACHE_PREVIEW_STALE_WHILE_REVALIDATE_SECONDS",
        "60"
      )
    );
    this.previewTtlSeconds = Number(
      configService.get<string>("FILE_PREVIEW_URL_TTL_SECONDS", "3600")
    );
    this.thumbMaxAgeSeconds = Number(
      configService.get<string>("FILE_CACHE_THUMB_MAX_AGE_SECONDS", "31536000")
    );
    this.thumbStaleWhileRevalidateSeconds = Number(
      configService.get<string>(
        "FILE_CACHE_THUMB_STALE_WHILE_REVALIDATE_SECONDS",
        "86400"
      )
    );
  }

  buildSignedUrl(input: SignedFileUrlInput) {
    const expires =
      Math.floor(Date.now() / 1000) + this.getTtlSeconds(input.variant);
    const signature = this.sign(
      input.fileId,
      input.variant,
      input.version,
      expires
    );
    const searchParams = new URLSearchParams({
      expires: String(expires),
      signature,
      v: input.version,
      variant: input.variant
    });

    return `${this.publicBaseUrl}/api/files/${encodeURIComponent(input.fileId)}?${searchParams.toString()}`;
  }

  verify(input: {
    expires?: string;
    fileId: string;
    signature?: string;
    v?: string;
    variant?: string;
  }) {
    if (
      !input.signature ||
      !input.expires ||
      !input.v ||
      !this.isVariant(input.variant)
    ) {
      return null;
    }

    const expires = Number(input.expires);

    if (!Number.isInteger(expires) || expires < Math.floor(Date.now() / 1000)) {
      return null;
    }

    const expected = this.sign(input.fileId, input.variant, input.v, expires);
    const actualBuffer = Buffer.from(input.signature);
    const expectedBuffer = Buffer.from(expected);

    if (actualBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(actualBuffer, expectedBuffer)) {
      return null;
    }

    return {
      expires,
      variant: input.variant,
      version: input.v
    };
  }

  getCacheProfile(variant: FileImageVariant) {
    if (variant === "preview") {
      return {
        immutable: false,
        maxAge: this.previewCacheMaxAgeSeconds,
        staleWhileRevalidate: this.previewCacheStaleWhileRevalidateSeconds
      };
    }

    return {
      immutable: true,
      maxAge:
        variant === "thumb"
          ? this.thumbMaxAgeSeconds
          : this.detailMaxAgeSeconds,
      staleWhileRevalidate:
        variant === "thumb"
          ? this.thumbStaleWhileRevalidateSeconds
          : this.detailStaleWhileRevalidateSeconds
    };
  }

  private isVariant(value?: string): value is FileImageVariant {
    return value === "thumb" || value === "detail" || value === "preview";
  }

  private getTtlSeconds(variant: FileImageVariant) {
    return variant === "preview"
      ? this.previewTtlSeconds
      : this.defaultTtlSeconds;
  }

  private sign(
    fileId: string,
    variant: FileImageVariant,
    version: string,
    expires: number
  ) {
    return createHmac("sha256", this.secret)
      .update(`${fileId}:${variant}:${version}:${expires}`)
      .digest("hex");
  }
}

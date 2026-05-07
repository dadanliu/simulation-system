import { Controller, Get, Param, Req, Res, UnauthorizedException } from "@nestjs/common";
import { ApiCookieAuth, ApiExcludeEndpoint } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { createHash } from "node:crypto";
import { GetCurrentUserService } from "../auth/get-current-user";
import { FileUrlService } from "./file-url.service";
import { UploadService } from "./upload.service";

@Controller("api/files")
export class FileController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly getCurrentUserService: GetCurrentUserService,
    private readonly fileUrlService: FileUrlService
  ) {}

  @Get(":fileId")
  @ApiExcludeEndpoint()
  @ApiCookieAuth("next_bff_session")
  async getFile(@Req() request: Request, @Param("fileId") fileId: string, @Res() response: Response) {
    const currentUser = await this.getCurrentUserService.execute(request);
    const signedUrl = this.fileUrlService.verify({
      expires: this.readQueryValue(request.query.expires),
      fileId,
      signature: this.readQueryValue(request.query.signature),
      v: this.readQueryValue(request.query.v),
      variant: this.readQueryValue(request.query.variant)
    });

    if (!currentUser && !signedUrl) {
      throw new UnauthorizedException("Unauthorized");
    }

    if (signedUrl) {
      const etag = this.buildEtag(fileId, signedUrl.variant, signedUrl.version);
      const lastModified = this.readLastModified(signedUrl.version);
      const cacheProfile = this.fileUrlService.getCacheProfile(signedUrl.variant);

      response.setHeader("Cache-Control", this.buildPublicCacheControl(cacheProfile));
      response.setHeader("CDN-Cache-Control", this.buildCdnCacheControl(cacheProfile));
      response.setHeader("Surrogate-Control", this.buildCdnCacheControl(cacheProfile));
      response.setHeader("ETag", etag);
      response.setHeader("Vary", "Accept");

      if (lastModified) {
        response.setHeader("Last-Modified", lastModified.toUTCString());
      }

      if (this.isNotModified(request, etag, lastModified)) {
        response.status(304).end();
        return;
      }
    } else {
      response.setHeader("Cache-Control", "private, no-store");
      response.setHeader("Pragma", "no-cache");
      response.setHeader("Vary", "Cookie, Accept");
    }

    const upstreamResponse = await this.uploadService.getFile(request, fileId, currentUser?.id);
    const arrayBuffer = await upstreamResponse.arrayBuffer();

    response.status(upstreamResponse.status);
    response.setHeader("Content-Type", upstreamResponse.headers.get("content-type") ?? "application/octet-stream");
    response.send(Buffer.from(arrayBuffer));
  }

  private readQueryValue(value: unknown) {
    return typeof value === "string" ? value : undefined;
  }

  private buildCdnCacheControl(profile: { immutable: boolean; maxAge: number; staleWhileRevalidate: number }) {
    return [
      "public",
      `max-age=${profile.maxAge}`,
      `stale-while-revalidate=${profile.staleWhileRevalidate}`,
      ...(profile.immutable ? ["immutable"] : [])
    ].join(", ");
  }

  private buildEtag(fileId: string, variant: string, version: string) {
    const digest = createHash("sha256").update(`${fileId}:${variant}:${version}`).digest("hex");
    return `"${digest}"`;
  }

  private buildPublicCacheControl(profile: { immutable: boolean; maxAge: number; staleWhileRevalidate: number }) {
    return [
      "public",
      `max-age=${profile.maxAge}`,
      `stale-while-revalidate=${profile.staleWhileRevalidate}`,
      ...(profile.immutable ? ["immutable"] : [])
    ].join(", ");
  }

  private isNotModified(request: Request, etag: string, lastModified: Date | null) {
    const ifNoneMatch = request.headers["if-none-match"];

    if (typeof ifNoneMatch === "string" && ifNoneMatch.split(",").map((value) => value.trim()).includes(etag)) {
      return true;
    }

    const ifModifiedSince = request.headers["if-modified-since"];

    if (typeof ifModifiedSince === "string" && lastModified) {
      const modifiedSince = new Date(ifModifiedSince);

      if (!Number.isNaN(modifiedSince.getTime()) && lastModified.getTime() <= modifiedSince.getTime()) {
        return true;
      }
    }

    return false;
  }

  private readLastModified(version: string) {
    if (/^\d+$/.test(version)) {
      const timestamp = Number(version);

      if (Number.isFinite(timestamp)) {
        return new Date(timestamp);
      }
    }

    const parsedDate = new Date(version);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
}

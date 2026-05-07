import type { ConfigService } from "@nestjs/config";
import { FileUrlService } from "./file-url.service";

describe("FileUrlService", () => {
  function createConfig(values: Record<string, string>) {
    return {
      get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback)
    } as unknown as ConfigService;
  }

  it("builds verifiable signed URLs for thumb/detail assets", () => {
    const service = new FileUrlService(
      createConfig({
        FILE_URL_SIGNING_SECRET: "test-secret",
        FILE_URL_TTL_SECONDS: "600",
        FILE_PREVIEW_URL_TTL_SECONDS: "60"
      })
    );

    const url = new URL(service.buildSignedUrl({ fileId: "file_1", variant: "thumb", version: "2026-05-07T10:00:00.000Z" }), "http://localhost");
    const verification = service.verify({
      expires: url.searchParams.get("expires") ?? undefined,
      fileId: "file_1",
      signature: url.searchParams.get("signature") ?? undefined,
      v: url.searchParams.get("v") ?? undefined,
      variant: url.searchParams.get("variant") ?? undefined
    });

    expect(verification).toMatchObject({
      variant: "thumb",
      version: "2026-05-07T10:00:00.000Z"
    });
  });

  it("rejects expired signed URLs", () => {
    const service = new FileUrlService(
      createConfig({
        FILE_URL_SIGNING_SECRET: "test-secret",
        FILE_URL_TTL_SECONDS: "600",
        FILE_PREVIEW_URL_TTL_SECONDS: "60"
      })
    );

    const expiredVerification = service.verify({
      expires: String(Math.floor(Date.now() / 1000) - 10),
      fileId: "file_1",
      signature: "invalid",
      v: "2026-05-07T10:00:00.000Z",
      variant: "detail"
    });

    expect(expiredVerification).toBeNull();
  });
});

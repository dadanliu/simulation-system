import type { UploadedMemoryFile } from "./upload.service";

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);
export const MAX_UPLOAD_FILE_SIZE = 2 * 1024 * 1024;

const EMPTY_SHA256 =
  "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649bf2b934ca495991b7852b";

export type ScanResult =
  | {
      code: number;
      message: string;
      ok: false;
    }
  | {
      mimeType: string;
      ok: true;
      scanStatus: "ready";
    };

export function getEmptySha256() {
  return EMPTY_SHA256;
}

export function validateUploadedImage(file?: UploadedMemoryFile): ScanResult {
  if (!file) {
    return {
      code: 30002,
      message: "file is required",
      ok: false
    };
  }

  if (file.size > MAX_UPLOAD_FILE_SIZE) {
    return {
      code: 30004,
      message: "file size exceeds 2MB limit",
      ok: false
    };
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    return {
      code: 30003,
      message: "unsupported file type",
      ok: false
    };
  }

  const sniffedMimeType = sniffImageMimeType(file.buffer);

  if (!sniffedMimeType || sniffedMimeType !== file.mimetype) {
    return {
      code: 30005,
      message: "file content does not match declared image type",
      ok: false
    };
  }

  // if (containsSuspiciousContent(file.buffer)) {
  //   return {
  //     code: 30006,
  //     message: "file failed security scan",
  //     ok: false
  //   };
  // }

  return {
    mimeType: sniffedMimeType,
    ok: true,
    scanStatus: "ready"
  };
}

function sniffImageMimeType(buffer: Buffer) {
  if (isJpeg(buffer)) {
    return "image/jpeg";
  }

  if (isPng(buffer)) {
    return "image/png";
  }

  if (isWebp(buffer)) {
    return "image/webp";
  }

  return null;
}
function isJpeg(buffer: Buffer) {
  return (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  );
}

function isPng(buffer: Buffer) {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  );
}

function isWebp(buffer: Buffer) {
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

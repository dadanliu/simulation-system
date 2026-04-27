import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import type { UploadedMemoryFile } from "../upload.service";

const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_PRODUCT_IMAGE_SIZE = 2 * 1024 * 1024;

@Injectable()
export class ParseProductImageFilePipe implements PipeTransform<UploadedMemoryFile | undefined, UploadedMemoryFile> {
  transform(file: UploadedMemoryFile | undefined) {
    if (!file) {
      throw new BadRequestException("file is required");
    }

    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("only jpg, png and webp images are allowed");
    }

    if (file.size > MAX_PRODUCT_IMAGE_SIZE) {
      throw new BadRequestException("file size exceeds 2MB limit");
    }

    return file;
  }
}

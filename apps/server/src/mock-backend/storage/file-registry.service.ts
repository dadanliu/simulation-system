import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { StoredFile } from "./storage.types";

@Injectable()
export class FileRegistryService {
  private readonly registryPath: string;

  constructor(configService: ConfigService) {
    this.registryPath = path.resolve(configService.get<string>("UPLOAD_REGISTRY_PATH", ".dev/upload-registry.json"));
  }

  get(fileId: string): StoredFile | null {
    return this.read()[fileId] ?? null;
  }

  save(file: StoredFile) {
    const registry = this.read();

    registry[file.fileId] = file;
    mkdirSync(path.dirname(this.registryPath), { recursive: true });
    writeFileSync(this.registryPath, JSON.stringify(registry, null, 2));
  }

  private read(): Record<string, StoredFile> {
    if (!existsSync(this.registryPath)) {
      return {};
    }

    try {
      return JSON.parse(readFileSync(this.registryPath, "utf8")) as Record<string, StoredFile>;
    } catch {
      return {};
    }
  }
}

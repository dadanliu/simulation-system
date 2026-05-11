import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HealthService } from "../health/health.service";
import { mockSuccess } from "./mock-response";

@Injectable()
export class MockBackendService {
  constructor(
    private readonly configService: ConfigService,
    private readonly healthService: HealthService
  ) {}

  async getHealth() {
    const health = await this.healthService.getReady();

    return mockSuccess({
      commitSha: this.configService.get<string>("RELEASE_COMMIT_SHA", "local"),
      dependencies: health.dependencies,
      env: this.configService.get<string>("APP_ENV", "development"),
      service: "server",
      framework: "nestjs",
      releaseNotesUrl: this.configService.get<string>("RELEASE_NOTES_URL", ""),
      status: health.status,
      version: this.configService.get<string>("APP_VERSION", "local"),
      uptimeSeconds: health.uptimeSeconds
    });
  }
}

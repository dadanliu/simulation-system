import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mockSuccess } from "./mock-response";

@Injectable()
export class MockBackendService {
  constructor(private readonly configService: ConfigService) {}

  getHealth() {
    return mockSuccess({
      commitSha: this.configService.get<string>("RELEASE_COMMIT_SHA", "local"),
      env: this.configService.get<string>("APP_ENV", "development"),
      service: "server",
      framework: "nestjs",
      releaseNotesUrl: this.configService.get<string>("RELEASE_NOTES_URL", ""),
      version: this.configService.get<string>("APP_VERSION", "local"),
      status: "ok"
    });
  }
}

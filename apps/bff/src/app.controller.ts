import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SuccessResponseMessage } from "./common/interceptors/response-envelope.decorator";

@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @SuccessResponseMessage("NestJS BFF service is running")
  getRoot() {
    return {
      commitSha: this.configService.get<string>("RELEASE_COMMIT_SHA", "local"),
      env: this.configService.get<string>("APP_ENV", "development"),
      releaseNotesUrl: this.configService.get<string>("RELEASE_NOTES_URL", ""),
      service: "bff",
      version: this.configService.get<string>("APP_VERSION", "local"),
      status: "running"
    };
  }
}

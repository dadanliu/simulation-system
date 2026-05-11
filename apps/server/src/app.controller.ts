import { Controller, Get } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  getRoot() {
    return {
      commitSha: this.configService.get<string>("RELEASE_COMMIT_SHA", "local"),
      env: this.configService.get<string>("APP_ENV", "development"),
      success: true,
      message: "NestJS mock backend is running",
      releaseNotesUrl: this.configService.get<string>("RELEASE_NOTES_URL", ""),
      service: "backend",
      version: this.configService.get<string>("APP_VERSION", "local")
    };
  }
}

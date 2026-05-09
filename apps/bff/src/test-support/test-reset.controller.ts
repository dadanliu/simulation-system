import { Controller, NotFoundException, Post } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TestResetService } from "./test-reset.service";

@Controller("api/test")
export class TestResetController {
  constructor(
    private readonly configService: ConfigService,
    private readonly testResetService: TestResetService
  ) {}

  @Post("reset")
  async reset() {
    if (!this.isEnabled()) {
      throw new NotFoundException("not found");
    }

    await this.testResetService.reset();

    return {
      message: "test data reset"
    };
  }

  private isEnabled() {
    return this.configService.get<string>("APP_ENV") === "test" || this.configService.get<string>("E2E_TEST_RESET_ENABLED") === "true";
  }
}

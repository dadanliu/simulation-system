import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { SkipResponseEnvelope } from "../common/interceptors/response-envelope.decorator";
import { HealthService } from "./health.service";

@Controller("api/health")
@SkipResponseEnvelope()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get("live")
  getLive() {
    return this.healthService.getLive();
  }

  @Get("ready")
  async getReady(@Res({ passthrough: true }) response: Response) {
    const health = await this.healthService.getReady();

    if (health.status !== "ok") {
      response.status(503);
    }

    return health;
  }
}

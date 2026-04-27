import { Controller, Get } from "@nestjs/common";
import { SuccessResponseMessage } from "./common/interceptors/response-envelope.decorator";

@Controller()
export class AppController {
  @Get()
  @SuccessResponseMessage("NestJS BFF service is running")
  getRoot() {
    return {
      status: "running"
    };
  }
}

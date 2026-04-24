import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      success: true,
      message: "NestJS BFF service is running"
    };
  }
}

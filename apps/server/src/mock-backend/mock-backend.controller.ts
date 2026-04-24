import { Controller, Get } from "@nestjs/common";
import { MockBackendService } from "./mock-backend.service";

@Controller("api")
export class MockBackendController {
  constructor(private readonly mockBackendService: MockBackendService) {}

  @Get("health")
  getHealth() {
    return this.mockBackendService.getHealth();
  }

  @Get("users")
  getUsers() {
    return this.mockBackendService.getUsers();
  }
}

import { Injectable } from "@nestjs/common";
import { mockSuccess } from "./mock-response";

@Injectable()
export class MockBackendService {
  getHealth() {
    return mockSuccess({
      service: "server",
      framework: "nestjs",
      status: "ok"
    });
  }
}

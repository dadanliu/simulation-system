import { Injectable } from "@nestjs/common";

@Injectable()
export class MockBackendService {
  getHealth() {
    return {
      success: true,
      data: {
        service: "server",
        framework: "nestjs",
        status: "ok"
      }
    };
  }

  getUsers() {
    return {
      success: true,
      data: [
        {
          id: "u_admin_001",
          username: "admin",
          name: "Admin User",
          role: "admin"
        }
      ]
    };
  }
}

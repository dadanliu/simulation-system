import type { INestApplication } from "@nestjs/common";
import request = require("supertest");
import type { AuthUser } from "../user/user.types";
import { createBffTestApp, createTestAppMocks, type TestAppMocks } from "../test/app-test-utils";

describe("AuthController e2e", () => {
  let app: INestApplication;
  let mocks: TestAppMocks;

  const adminUser: AuthUser = {
    id: "u_admin_001",
    roles: ["admin"],
    username: "admin"
  };

  beforeEach(async () => {
    mocks = createTestAppMocks();
    app = await createBffTestApp(mocks);
  });

  afterEach(async () => {
    await app.close();
  });

  it("logs in successfully and wraps the response with traceId", async () => {
    mocks.authService.login.mockResolvedValue({
      sessionId: "session-admin",
      user: adminUser
    });

    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("x-trace-id", "trace-login")
      .send({
        password: "admin123",
        username: "admin"
      })
      .expect(201);

    expect(response.headers["set-cookie"][0]).toContain("next_bff_session=session-admin");
    expect(response.body).toEqual({
      data: {
        user: adminUser
      },
      message: "ok",
      success: true,
      traceId: "trace-login"
    });
    expect(mocks.authService.login).toHaveBeenCalledWith("admin", "admin123");
  });
});

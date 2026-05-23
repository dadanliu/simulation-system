import { Controller, Get, type INestApplication } from "@nestjs/common";
import request = require("supertest");
import { Public } from "./public.decorator";
import type { AuthUser } from "../user/user.types";
import {
  createBffTestApp,
  createTestAppMocks,
  type TestAppMocks
} from "../test/app-test-utils";

@Controller("api/global-auth-test")
class GlobalAuthTestController {
  @Get("protected")
  protectedRoute() {
    return {
      ok: true
    };
  }

  @Get("public")
  @Public()
  publicRoute() {
    return {
      ok: true
    };
  }
}

describe("global auth guards e2e", () => {
  let app: INestApplication;
  let mocks: TestAppMocks;

  const adminUser: AuthUser = {
    id: "u_admin_001",
    permissions: [],
    roles: ["admin"],
    tenantId: "tenant_demo",
    username: "admin"
  };

  beforeEach(async () => {
    mocks = createTestAppMocks();
    app = await createBffTestApp(mocks, {
      controllers: [GlobalAuthTestController]
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("protects a new controller even when it does not use @UseGuards", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(null);

    const response = await request(app.getHttpServer())
      .get("/api/global-auth-test/protected")
      .set("x-trace-id", "trace-global-auth")
      .expect(401);

    expect(response.body).toMatchObject({
      message: "Unauthorized",
      path: "/api/global-auth-test/protected",
      statusCode: 401,
      success: false,
      traceId: "trace-global-auth"
    });
  });

  it("allows public routes without resolving current user", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/global-auth-test/public")
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        ok: true
      },
      success: true
    });
    expect(mocks.getCurrentUserService.execute).not.toHaveBeenCalled();
  });

  it("allows protected routes when the global AuthGuard resolves a user", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(adminUser);

    const response = await request(app.getHttpServer())
      .get("/api/global-auth-test/protected")
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        ok: true
      },
      success: true
    });
  });
});

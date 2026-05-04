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

  function mockLoginSuccess() {
    mocks.authService.login.mockResolvedValue({
      sessionId: "session-admin",
      user: adminUser
    });
  }

  it("logs in successfully and writes a local HTTP compatible HttpOnly cookie", async () => {
    mockLoginSuccess();
    mocks.authService.getSessionTtlSeconds.mockReturnValue(3600);

    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("x-trace-id", "trace-login")
      .set("user-agent", "jest")
      .send({
        password: "admin123",
        username: "admin"
      })
      .expect(201);
    const setCookie = response.headers["set-cookie"][0];

    expect(setCookie).toContain("next_bff_session=session-admin");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Max-Age=3600");
    expect(setCookie).not.toContain("Secure");
    expect(response.body).toEqual({
      data: {
        user: adminUser
      },
      message: "ok",
      success: true,
      traceId: "trace-login"
    });
    expect(mocks.authService.login).toHaveBeenCalledWith(
      "admin",
      "admin123",
      expect.objectContaining({
        ip: expect.any(String),
        userAgent: expect.any(String)
      })
    );
  });

  it("adds Secure in production when COOKIE_SECURE is not explicitly configured", async () => {
    await app.close();
    app = await createBffTestApp(mocks, {
      config: {
        NODE_ENV: "production"
      }
    });
    mockLoginSuccess();

    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("user-agent", "jest")
      .send({
        password: "admin123",
        username: "admin"
      })
      .expect(201);

    expect(response.headers["set-cookie"][0]).toContain("Secure");
  });

  it("lets COOKIE_SECURE override the environment", async () => {
    await app.close();
    app = await createBffTestApp(mocks, {
      config: {
        COOKIE_SECURE: "true",
        NODE_ENV: "test"
      }
    });
    mockLoginSuccess();

    const secureResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("user-agent", "jest")
      .send({
        password: "admin123",
        username: "admin"
      })
      .expect(201);

    expect(secureResponse.headers["set-cookie"][0]).toContain("Secure");

    await app.close();
    app = await createBffTestApp(mocks, {
      config: {
        COOKIE_SECURE: "false",
        NODE_ENV: "production"
      }
    });
    mockLoginSuccess();

    const insecureResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("user-agent", "jest")
      .send({
        password: "admin123",
        username: "admin"
      })
      .expect(201);

    expect(insecureResponse.headers["set-cookie"][0]).not.toContain("Secure");
  });

  it("clears the cookie on logout with the same security attributes", async () => {
    await app.close();
    app = await createBffTestApp(mocks, {
      config: {
        COOKIE_SECURE: "true"
      }
    });

    const response = await request(app.getHttpServer())
      .post("/api/auth/logout")
      .set("Cookie", "next_bff_session=session-admin")
      .expect(200);
    const setCookie = response.headers["set-cookie"][0];

    expect(mocks.authService.logout).toHaveBeenCalled();
    expect(setCookie).toContain("next_bff_session=");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("Secure");
  });
});

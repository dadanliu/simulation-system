import {
  HttpException,
  HttpStatus,
  type INestApplication
} from "@nestjs/common";
import request = require("supertest");
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../common/http/csrf-token";
import type { AuthUser } from "../user/user.types";
import {
  createBffTestApp,
  createTestAppMocks,
  type TestAppMocks
} from "../test/app-test-utils";

describe("AuthController e2e", () => {
  let app: INestApplication;
  let mocks: TestAppMocks;

  const adminUser: AuthUser = {
    id: "u_admin_001",
    permissions: [
      "audit:read",
      "commodity:create",
      "commodity:delete",
      "commodity:read",
      "commodity:update",
      "permission:manage",
      "role:manage",
      "user:manage"
    ],
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

  function getSetCookies(response: request.Response) {
    const setCookieHeader = response.headers["set-cookie"];

    if (Array.isArray(setCookieHeader)) {
      return setCookieHeader;
    }

    return typeof setCookieHeader === "string" ? [setCookieHeader] : [];
  }

  async function issueCsrfToken() {
    const response = await request(app.getHttpServer())
      .get("/api/auth/csrf")
      .expect(200);
    const setCookie = getSetCookies(response).find((value) =>
      value.startsWith(`${CSRF_COOKIE_NAME}=`)
    );

    expect(setCookie).toBeDefined();

    const rawCookie = setCookie!.split(";", 1)[0];
    const token = decodeURIComponent(rawCookie.split("=", 2)[1] ?? "");

    expect(token).not.toBe("");

    return {
      cookie: rawCookie,
      token
    };
  }

  it("rejects login without a CSRF token using a unified 403 response", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("x-trace-id", "trace-login-csrf")
      .send({
        password: "admin123",
        username: "admin"
      })
      .expect(403);

    expect(response.body).toMatchObject({
      message: `CSRF token invalid: expected ${CSRF_HEADER_NAME}`,
      path: "/api/auth/login",
      statusCode: 403,
      success: false,
      traceId: "trace-login-csrf"
    });
    expect(mocks.authService.login).not.toHaveBeenCalled();
  });

  it("logs in successfully and writes a local HTTP compatible HttpOnly cookie", async () => {
    mockLoginSuccess();
    mocks.authService.getSessionTtlSeconds.mockReturnValue(3600);
    const csrf = await issueCsrfToken();

    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("Cookie", csrf.cookie)
      .set(CSRF_HEADER_NAME, csrf.token)
      .set("x-trace-id", "trace-login")
      .set("user-agent", "jest")
      .send({
        password: "admin123",
        username: "admin"
      })
      .expect(201);
    const setCookie = getSetCookies(response).find((value) =>
      value.startsWith("next_bff_session=")
    );

    expect(setCookie).toBeDefined();
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
        traceId: "trace-login",
        userAgent: expect.any(String)
      })
    );
  });

  it("returns a unified 429 response when login is rate limited", async () => {
    mocks.authService.login.mockRejectedValue(
      new HttpException(
        "too many login attempts, try again in 60s",
        HttpStatus.TOO_MANY_REQUESTS
      )
    );
    const csrf = await issueCsrfToken();

    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("Cookie", csrf.cookie)
      .set(CSRF_HEADER_NAME, csrf.token)
      .set("x-trace-id", "trace-login-rate-limit")
      .send({
        password: "admin123",
        username: "admin"
      })
      .expect(429);

    expect(response.body).toMatchObject({
      message: "too many login attempts, try again in 60s",
      path: "/api/auth/login",
      statusCode: 429,
      success: false,
      traceId: "trace-login-rate-limit"
    });
  });

  it("adds Secure in production when COOKIE_SECURE is not explicitly configured", async () => {
    await app.close();
    app = await createBffTestApp(mocks, {
      config: {
        NODE_ENV: "production"
      }
    });
    mockLoginSuccess();
    const csrf = await issueCsrfToken();

    const response = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("Cookie", csrf.cookie)
      .set(CSRF_HEADER_NAME, csrf.token)
      .set("user-agent", "jest")
      .send({
        password: "admin123",
        username: "admin"
      })
      .expect(201);

    const sessionCookie = getSetCookies(response).find((value) =>
      value.startsWith("next_bff_session=")
    );

    expect(sessionCookie).toContain("Secure");
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
    let csrf = await issueCsrfToken();

    const secureResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("Cookie", csrf.cookie)
      .set(CSRF_HEADER_NAME, csrf.token)
      .set("user-agent", "jest")
      .send({
        password: "admin123",
        username: "admin"
      })
      .expect(201);

    const secureSessionCookie = getSetCookies(secureResponse).find((value) =>
      value.startsWith("next_bff_session=")
    );

    expect(secureSessionCookie).toContain("Secure");

    await app.close();
    app = await createBffTestApp(mocks, {
      config: {
        COOKIE_SECURE: "false",
        NODE_ENV: "production"
      }
    });
    mockLoginSuccess();
    csrf = await issueCsrfToken();

    const insecureResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .set("Cookie", csrf.cookie)
      .set(CSRF_HEADER_NAME, csrf.token)
      .set("user-agent", "jest")
      .send({
        password: "admin123",
        username: "admin"
      })
      .expect(201);

    const insecureSessionCookie = getSetCookies(insecureResponse).find(
      (value) => value.startsWith("next_bff_session=")
    );

    expect(insecureSessionCookie).not.toContain("Secure");
  });

  it("clears the cookie on logout with the same security attributes", async () => {
    await app.close();
    app = await createBffTestApp(mocks, {
      config: {
        COOKIE_SECURE: "true"
      }
    });
    const csrf = await issueCsrfToken();

    const response = await request(app.getHttpServer())
      .post("/api/auth/logout")
      .set("Cookie", ["next_bff_session=session-admin", csrf.cookie])
      .set(CSRF_HEADER_NAME, csrf.token)
      .expect(200);
    const setCookie = getSetCookies(response).find((value) =>
      value.startsWith("next_bff_session=")
    );

    expect(mocks.authService.logout).toHaveBeenCalled();
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain("next_bff_session=");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("Secure");
  });

  it("lists login logs with audit permission and query filters", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(adminUser);
    mocks.permissionService.hasAllPermissionsByRoleCodes.mockResolvedValue(
      true
    );
    mocks.authService.listLoginLogs.mockResolvedValue({
      list: [
        {
          createdAt: "2026-05-04T10:00:00.000Z",
          ip: "127.0.0.1",
          outcome: "success",
          reason: null,
          traceId: "trace-log",
          userAgent: "jest",
          userId: "u_admin_001",
          username: "admin"
        }
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1
      }
    });

    const response = await request(app.getHttpServer())
      .get("/api/auth/login-logs")
      .query({
        createdFrom: "2026-05-04T00:00:00.000Z",
        createdTo: "2026-05-04T23:59:59.999Z",
        username: "admin"
      })
      .set("Cookie", "next_bff_session=session-admin")
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        list: [
          {
            outcome: "success",
            username: "admin"
          }
        ],
        pagination: {
          page: 1,
          total: 1
        }
      },
      message: "ok",
      success: true
    });
    expect(mocks.authService.listLoginLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        createdFrom: "2026-05-04T00:00:00.000Z",
        createdTo: "2026-05-04T23:59:59.999Z",
        username: "admin"
      })
    );
  });
});

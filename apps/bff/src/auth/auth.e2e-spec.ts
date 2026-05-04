import type { INestApplication } from "@nestjs/common";
import request = require("supertest");
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../common/http/csrf-token";
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

  function getSetCookies(response: request.Response) {
    const setCookieHeader = response.headers["set-cookie"];

    if (Array.isArray(setCookieHeader)) {
      return setCookieHeader;
    }

    return typeof setCookieHeader === "string" ? [setCookieHeader] : [];
  }

  async function issueCsrfToken() {
    const response = await request(app.getHttpServer()).get("/api/auth/csrf").expect(200);
    const setCookie = getSetCookies(response).find((value) => value.startsWith(`${CSRF_COOKIE_NAME}=`));

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
    const setCookie = getSetCookies(response).find((value) => value.startsWith("next_bff_session="));

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

    const sessionCookie = getSetCookies(response).find((value) => value.startsWith("next_bff_session="));

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

    const insecureSessionCookie = getSetCookies(insecureResponse).find((value) =>
      value.startsWith("next_bff_session=")
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
    const setCookie = getSetCookies(response).find((value) => value.startsWith("next_bff_session="));

    expect(mocks.authService.logout).toHaveBeenCalled();
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain("next_bff_session=");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Max-Age=0");
    expect(setCookie).toContain("Secure");
  });
});

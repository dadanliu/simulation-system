import {
  HttpException,
  HttpStatus,
  UnauthorizedException
} from "@nestjs/common";
import { AuthService } from "./auth.service";

describe("AuthService", () => {
  const user = {
    id: "u_admin_001",
    roles: ["admin"],
    tenantId: "tenant_demo",
    username: "admin"
  };

  function createService() {
    const loginAuditLogService = {
      listLogs: jest.fn(),
      recordBlocked: jest.fn(),
      recordFailure: jest.fn(),
      recordSuccess: jest.fn()
    };
    const loginRiskService = {
      assertLoginAllowed: jest.fn(),
      isRateLimitError: jest.fn(
        (error: unknown) =>
          error instanceof HttpException &&
          error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
      ),
      recordFailure: jest.fn(),
      reset: jest.fn()
    };
    const sessionStoreService = {
      createSession: jest.fn(),
      deleteSession: jest.fn(),
      getSessionTtlSeconds: jest.fn().mockReturnValue(86400),
      listUserSessions: jest.fn()
    };
    const userService = {
      findUserByCredentials: jest.fn()
    };

    return {
      loginAuditLogService,
      loginRiskService,
      service: new AuthService(
        loginAuditLogService as never,
        loginRiskService as never,
        sessionStoreService as never,
        userService as never
      ),
      sessionStoreService,
      userService
    };
  }

  it("creates a session, resets failure counters and records a success log on valid login", async () => {
    const {
      loginAuditLogService,
      loginRiskService,
      service,
      sessionStoreService,
      userService
    } = createService();

    userService.findUserByCredentials.mockResolvedValue(user);
    sessionStoreService.createSession.mockResolvedValue("session-admin");

    await expect(
      service.login("Admin", "admin123", {
        ip: "127.0.0.1",
        traceId: "trace-login",
        userAgent: "jest"
      })
    ).resolves.toEqual({
      sessionId: "session-admin",
      user
    });

    expect(loginRiskService.assertLoginAllowed).toHaveBeenCalledWith({
      ip: "127.0.0.1",
      username: "admin"
    });
    expect(loginRiskService.reset).toHaveBeenCalledWith({
      ip: "127.0.0.1",
      username: "admin"
    });
    expect(loginAuditLogService.recordSuccess).toHaveBeenCalledWith(
      "admin",
      "u_admin_001",
      expect.objectContaining({
        ip: "127.0.0.1",
        traceId: "trace-login",
        userAgent: "jest"
      })
    );
  });

  it("records a failure log and returns 401 for invalid credentials before lock threshold", async () => {
    const { loginAuditLogService, loginRiskService, service, userService } =
      createService();

    userService.findUserByCredentials.mockResolvedValue(null);
    loginRiskService.recordFailure.mockRejectedValue(
      new UnauthorizedException("invalid username or password")
    );

    await expect(
      service.login("admin", "bad-password", { ip: "127.0.0.1" })
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(loginAuditLogService.recordFailure).toHaveBeenCalledWith(
      "admin",
      expect.objectContaining({ ip: "127.0.0.1" })
    );
  });

  it("records a blocked log and returns 429 after lock threshold", async () => {
    const { loginAuditLogService, loginRiskService, service, userService } =
      createService();

    userService.findUserByCredentials.mockResolvedValue(null);
    loginRiskService.recordFailure.mockRejectedValue(
      new HttpException("too many login attempts", HttpStatus.TOO_MANY_REQUESTS)
    );

    await expect(
      service.login("admin", "bad-password", { ip: "127.0.0.1" })
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS
    });

    expect(loginAuditLogService.recordBlocked).toHaveBeenCalledWith(
      "admin",
      expect.objectContaining({ ip: "127.0.0.1" })
    );
  });
});

import type { ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/auth-request";
import {
  createBffThrottlerOptions,
  getLoginUsernameTracker,
  getTenantTracker,
  getUserTracker,
  isAuditExportRequest,
  isLoginRequest,
  isUploadRequest,
  shouldResolveCurrentUserForRateLimit
} from "./rate-limit.config";

function createContext(
  method: string,
  originalUrl: string,
  request: Partial<AuthenticatedRequest> = {}
) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: {},
        ip: "127.0.0.1",
        method,
        originalUrl,
        url: originalUrl,
        ...request
      })
    })
  } as unknown as ExecutionContext;
}

describe("rate-limit config", () => {
  it("registers the expected throttler policies", () => {
    const options = createBffThrottlerOptions();
    const throttlers = Array.isArray(options) ? options : options.throttlers;

    expect(throttlers.map((throttler) => throttler.name)).toEqual([
      "default",
      "loginIp",
      "loginUsername",
      "uploadUser",
      "uploadTenant",
      "userCreate",
      "sensitiveAuthMutation",
      "auditExportUser"
    ]);
  });

  it("matches login, upload, and audit endpoints", () => {
    expect(isLoginRequest(createContext("POST", "/api/auth/login"))).toBe(true);
    expect(isUploadRequest(createContext("POST", "/api/upload"))).toBe(true);
    expect(
      isAuditExportRequest(createContext("GET", "/api/commodity/audit-logs"))
    ).toBe(true);
    expect(
      shouldResolveCurrentUserForRateLimit(
        createContext("GET", "/api/commodity/audit-logs?page=1")
      )
    ).toBe(true);
  });

  it("normalizes login username trackers", () => {
    expect(
      getLoginUsernameTracker({
        body: { username: " Admin " },
        headers: {},
        ip: "127.0.0.1"
      } as unknown as AuthenticatedRequest)
    ).toBe("username:admin");
  });

  it("uses authenticated user and tenant trackers when present", () => {
    const request = {
      currentUser: {
        id: "u_001",
        permissions: [],
        roles: [],
        tenantId: "tenant_demo",
        username: "admin"
      },
      headers: {},
      ip: "127.0.0.1"
    } as unknown as AuthenticatedRequest;

    expect(getUserTracker(request)).toBe("user:u_001");
    expect(getTenantTracker(request)).toBe("tenant:tenant_demo");
  });
});

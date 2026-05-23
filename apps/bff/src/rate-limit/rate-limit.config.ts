import type { ExecutionContext } from "@nestjs/common";
import type {
  ThrottlerGetTrackerFunction,
  ThrottlerModuleOptions
} from "@nestjs/throttler";
import type { Request } from "express";
import type { AuthenticatedRequest } from "../auth/auth-request";

type RateLimitRequest = AuthenticatedRequest &
  Request & {
    body?: {
      username?: unknown;
    };
  };

const ONE_MINUTE_MS = 60_000;
const FIVE_MINUTES_MS = 5 * ONE_MINUTE_MS;

const DEFAULT_LIMIT = 120;
const LOGIN_IP_LIMIT = 10;
const LOGIN_USERNAME_LIMIT = 5;
const UPLOAD_USER_LIMIT = 20;
const UPLOAD_TENANT_LIMIT = 100;
const USER_CREATE_LIMIT = 10;
const AUDIT_EXPORT_USER_LIMIT = 5;

// 当前仓库还没有恢复审计导出任务接口，先把高成本审计读取入口纳入同一类用户级限流。
const AUDIT_EXPORT_PATHS = new Set([
  "/api/auth/login-logs",
  "/api/auth/login-risk-daily-stats",
  "/api/commodity/audit-logs"
]);

const UNTHROTTLED_PATHS = new Set(["/api/health", "/api/test/reset"]);

function getRequest(context: ExecutionContext) {
  return context.switchToHttp().getRequest<RateLimitRequest>();
}

export function getRequestPath(request: Pick<Request, "originalUrl" | "url">) {
  return (request.originalUrl || request.url || "").split("?", 1)[0] || "/";
}

export function isRequestMatch(
  context: ExecutionContext,
  method: string,
  path: string
) {
  const request = getRequest(context);

  return request.method === method && getRequestPath(request) === path;
}

export function isAuditExportRequest(context: ExecutionContext) {
  const request = getRequest(context);

  return request.method === "GET" && AUDIT_EXPORT_PATHS.has(getRequestPath(request));
}

export function isLoginRequest(context: ExecutionContext) {
  return isRequestMatch(context, "POST", "/api/auth/login");
}

export function isUploadRequest(context: ExecutionContext) {
  return isRequestMatch(context, "POST", "/api/upload");
}

export function isUserCreateRequest(context: ExecutionContext) {
  return isRequestMatch(context, "POST", "/api/users");
}

export function isSensitiveAuthMutationRequest(context: ExecutionContext) {
  const request = getRequest(context);
  const path = getRequestPath(request);

  return (
    request.method === "POST" &&
    (path === "/api/auth/reset-password" ||
      path === "/api/auth/send-verification-code")
  );
}

export function shouldResolveCurrentUserForRateLimit(context: ExecutionContext) {
  return (
    isUploadRequest(context) ||
    isUserCreateRequest(context) ||
    isAuditExportRequest(context) ||
    isSensitiveAuthMutationRequest(context)
  );
}

export function shouldSkipDefaultRateLimit(context: ExecutionContext) {
  return UNTHROTTLED_PATHS.has(getRequestPath(getRequest(context)));
}

export function getClientIp(request: RateLimitRequest) {
  return request.ip || "unknown-ip";
}

export function getIpTracker(request: RateLimitRequest) {
  return `ip:${getClientIp(request)}`;
}

export function getLoginUsernameTracker(request: RateLimitRequest) {
  const username =
    typeof request.body?.username === "string"
      ? request.body.username.trim().toLowerCase()
      : "";

  return username ? `username:${username}` : `${getIpTracker(request)}:username:missing`;
}

export function getUserTracker(request: RateLimitRequest) {
  return request.currentUser?.id
    ? `user:${request.currentUser.id}`
    : getIpTracker(request);
}

export function getTenantTracker(request: RateLimitRequest) {
  return request.currentUser?.tenantId
    ? `tenant:${request.currentUser.tenantId}`
    : getIpTracker(request);
}

const getIpTrackerForThrottler: ThrottlerGetTrackerFunction = (request) =>
  getIpTracker(request as RateLimitRequest);

const getLoginUsernameTrackerForThrottler: ThrottlerGetTrackerFunction = (
  request
) => getLoginUsernameTracker(request as RateLimitRequest);

const getUserTrackerForThrottler: ThrottlerGetTrackerFunction = (request) =>
  getUserTracker(request as RateLimitRequest);

const getTenantTrackerForThrottler: ThrottlerGetTrackerFunction = (request) =>
  getTenantTracker(request as RateLimitRequest);

export function createBffThrottlerOptions(): ThrottlerModuleOptions {
  return {
    errorMessage: "too many requests",
    throttlers: [
      {
        getTracker: getIpTrackerForThrottler,
        limit: DEFAULT_LIMIT,
        name: "default",
        skipIf: shouldSkipDefaultRateLimit,
        ttl: ONE_MINUTE_MS
      },
      {
        blockDuration: ONE_MINUTE_MS,
        getTracker: getIpTrackerForThrottler,
        limit: LOGIN_IP_LIMIT,
        name: "loginIp",
        skipIf: (context) => !isLoginRequest(context),
        ttl: ONE_MINUTE_MS
      },
      {
        blockDuration: ONE_MINUTE_MS,
        getTracker: getLoginUsernameTrackerForThrottler,
        limit: LOGIN_USERNAME_LIMIT,
        name: "loginUsername",
        skipIf: (context) => !isLoginRequest(context),
        ttl: ONE_MINUTE_MS
      },
      {
        blockDuration: ONE_MINUTE_MS,
        getTracker: getUserTrackerForThrottler,
        limit: UPLOAD_USER_LIMIT,
        name: "uploadUser",
        skipIf: (context) => !isUploadRequest(context),
        ttl: ONE_MINUTE_MS
      },
      {
        blockDuration: ONE_MINUTE_MS,
        getTracker: getTenantTrackerForThrottler,
        limit: UPLOAD_TENANT_LIMIT,
        name: "uploadTenant",
        skipIf: (context) => !isUploadRequest(context),
        ttl: ONE_MINUTE_MS
      },
      {
        blockDuration: FIVE_MINUTES_MS,
        getTracker: getUserTrackerForThrottler,
        limit: USER_CREATE_LIMIT,
        name: "userCreate",
        skipIf: (context) => !isUserCreateRequest(context),
        ttl: FIVE_MINUTES_MS
      },
      {
        blockDuration: FIVE_MINUTES_MS,
        getTracker: getUserTrackerForThrottler,
        limit: USER_CREATE_LIMIT,
        name: "sensitiveAuthMutation",
        skipIf: (context) => !isSensitiveAuthMutationRequest(context),
        ttl: FIVE_MINUTES_MS
      },
      {
        blockDuration: FIVE_MINUTES_MS,
        getTracker: getUserTrackerForThrottler,
        limit: AUDIT_EXPORT_USER_LIMIT,
        name: "auditExportUser",
        skipIf: (context) => !isAuditExportRequest(context),
        ttl: FIVE_MINUTES_MS
      }
    ]
  };
}

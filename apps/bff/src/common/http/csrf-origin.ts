import type { NextFunction, Request, Response } from "express";
import { CSRF_HEADER_NAME, getCsrfTokenFromRequest } from "./csrf-token";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_EXEMPT_PATHS = new Set(["/api/auth/csrf", "/api/test/reset"]);

type RequestWithTraceId = Request & {
  traceId?: string;
};

function normalizeAllowedOrigins(value = "") {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getHeaderOrigin(request: Request) {
  const origin = request.headers.origin;

  if (typeof origin === "string" && origin) {
    return origin;
  }

  const referer = request.headers.referer;

  if (typeof referer !== "string" || !referer) {
    return "";
  }

  try {
    return new URL(referer).origin;
  } catch {
    return "";
  }
}

export function createCsrfOriginMiddleware(allowedOrigins: string[]) {
  const allowedOriginSet = new Set(allowedOrigins);

  return function csrfOriginMiddleware(
    request: Request,
    response: Response,
    next: NextFunction
  ) {
    if (SAFE_METHODS.has(request.method.toUpperCase())) {
      next();
      return;
    }

    if (CSRF_EXEMPT_PATHS.has(request.path)) {
      next();
      return;
    }

    const requestOrigin = getHeaderOrigin(request);

    // Non-browser callers may not send Origin/Referer. Browser CSRF requests do, so only reject explicit mismatches.
    if (requestOrigin && !allowedOriginSet.has(requestOrigin)) {
      response.status(403).json({
        success: false,
        message: "CSRF origin denied",
        path: request.originalUrl,
        traceId: (request as RequestWithTraceId).traceId,
        statusCode: 403,
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { cookieToken, headerToken } = getCsrfTokenFromRequest(request);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      response.status(403).json({
        success: false,
        message: `CSRF token invalid: expected ${CSRF_HEADER_NAME}`,
        path: request.originalUrl,
        traceId: (request as RequestWithTraceId).traceId,
        statusCode: 403,
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
}

export function getConfiguredCsrfAllowedOrigins() {
  return normalizeAllowedOrigins("http://localhost:3000");
}

import type { NextFunction, Request, Response } from "express";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

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

  return function csrfOriginMiddleware(request: Request, response: Response, next: NextFunction) {
    if (SAFE_METHODS.has(request.method.toUpperCase())) {
      next();
      return;
    }

    const requestOrigin = getHeaderOrigin(request);

    // Non-browser callers may not send Origin/Referer. Browser CSRF requests do, so only reject explicit mismatches.
    if (!requestOrigin || allowedOriginSet.has(requestOrigin)) {
      next();
      return;
    }

    response.status(403).json({
      success: false,
      message: "CSRF origin denied",
      path: request.originalUrl,
      traceId: (request as RequestWithTraceId).traceId,
      statusCode: 403,
      timestamp: new Date().toISOString()
    });
  };
}

export function getConfiguredCsrfAllowedOrigins() {
  return normalizeAllowedOrigins(process.env.CSRF_ALLOWED_ORIGINS ?? "http://localhost:3000");
}

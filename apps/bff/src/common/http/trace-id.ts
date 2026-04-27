import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

export const TRACE_ID_HEADER = "x-trace-id";

type RequestWithTraceId = Request & {
  traceId?: string;
};

function readHeaderValue(value: string | string[] | undefined) {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value) && value[0]?.trim()) {
    return value[0].trim();
  }

  return undefined;
}

export function resolveTraceId(request: Request) {
  return readHeaderValue(request.headers[TRACE_ID_HEADER]) ?? randomUUID();
}

export function traceIdMiddleware(request: Request, response: Response, next: NextFunction) {
  const requestWithTraceId = request as RequestWithTraceId;
  const traceId = resolveTraceId(request);

  requestWithTraceId.traceId = traceId;
  response.setHeader(TRACE_ID_HEADER, traceId);
  next();
}

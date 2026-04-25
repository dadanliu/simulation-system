import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import { randomUUID } from "node:crypto";

type BuildHeadersOptions = {
  userId?: string;
  traceId?: string;
};

@Injectable()
export class RequestHeadersService {
  build(request: Request, options: BuildHeadersOptions = {}) {
    const traceId = options.traceId ?? this.getTraceId(request);
    const headers: Record<string, string> = {
      "x-trace-id": traceId
    };

    if (options.userId) {
      headers["x-user-id"] = options.userId;
    }

    return headers;
  }

  getTraceId(request: Request) {
    const headerTraceId = request.headers["x-trace-id"];

    if (typeof headerTraceId === "string" && headerTraceId.trim()) {
      return headerTraceId.trim();
    }

    if (Array.isArray(headerTraceId) && headerTraceId[0]?.trim()) {
      return headerTraceId[0].trim();
    }

    return randomUUID();
  }
}

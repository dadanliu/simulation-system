import { Injectable, Logger } from "@nestjs/common";
import type { Request } from "express";
import { RequestHeadersService } from "./request-headers.service";
import { ResponseHandlerService } from "./response-handler.service";

type RequestOptions = {
  body?: unknown;
  formData?: FormData;
  headers?: Record<string, string>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  traceId?: string;
  userId?: string;
};

@Injectable()
export class ApiClientService {
  private readonly backendBaseUrl = process.env.BACKEND_BASE_URL ?? "http://localhost:3002";
  private readonly logger = new Logger(ApiClientService.name);

  constructor(
    private readonly requestHeadersService: RequestHeadersService,
    private readonly responseHandlerService: ResponseHandlerService
  ) {}

  async request<T>(request: Request, path: string, options: RequestOptions = {}) {
    const headers = this.requestHeadersService.build(request, {
      traceId: options.traceId,
      userId: options.userId
    });
    const method = options.method ?? "GET";
    const url = this.buildUrl(path);
    const traceId = headers["x-trace-id"] ?? "";
    const startedAt = Date.now();

    this.logger.log(`backend request started method=${method} path=${path} traceId=${traceId}`);

    const response = await fetch(url, {
      method,
      headers: {
        ...headers,
        ...options.headers,
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" })
      },
      body:
        options.formData ??
        (options.body === undefined ? undefined : JSON.stringify(options.body))
    });

    this.logger.log(
      `backend request completed method=${method} path=${path} status=${response.status} durationMs=${Date.now() - startedAt} traceId=${traceId}`
    );

    return this.responseHandlerService.handleFetchResponse<T>(response);
  }

  private buildUrl(path: string) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.backendBaseUrl}${normalizedPath}`;
  }
}

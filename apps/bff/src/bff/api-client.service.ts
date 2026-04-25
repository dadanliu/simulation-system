import { Injectable } from "@nestjs/common";
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

  constructor(
    private readonly requestHeadersService: RequestHeadersService,
    private readonly responseHandlerService: ResponseHandlerService
  ) {}

  async request<T>(request: Request, path: string, options: RequestOptions = {}) {
    const headers = this.requestHeadersService.build(request, {
      traceId: options.traceId,
      userId: options.userId
    });

    const response = await fetch(this.buildUrl(path), {
      method: options.method ?? "GET",
      headers: {
        ...headers,
        ...options.headers,
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" })
      },
      body:
        options.formData ??
        (options.body === undefined ? undefined : JSON.stringify(options.body))
    });

    return this.responseHandlerService.handleFetchResponse<T>(response);
  }

  private buildUrl(path: string) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.backendBaseUrl}${normalizedPath}`;
  }
}

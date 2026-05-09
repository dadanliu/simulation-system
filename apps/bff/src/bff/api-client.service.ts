import { SpanKind } from "@opentelemetry/api";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import {
  getErrorLogFields,
  writeStructuredLog
} from "../common/logging/structured-log";
import {
  injectActiveTraceHeaders,
  runObservedSpan
} from "../common/tracing/observed-span";
import { BackendRequestException } from "./errors";
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
  constructor(
    private readonly configService: ConfigService,
    private readonly requestHeadersService: RequestHeadersService,
    private readonly responseHandlerService: ResponseHandlerService
  ) {}

  async request<T>(
    request: Request,
    path: string,
    options: RequestOptions = {}
  ) {
    const response = await this.requestRaw(request, path, options);
    return this.responseHandlerService.handleFetchResponse<T>(response);
  }

  async requestRaw(
    request: Request,
    path: string,
    options: RequestOptions = {}
  ) {
    const method = options.method ?? "GET";
    const backendBaseUrl =
      this.configService.getOrThrow<string>("BACKEND_BASE_URL");
    const url = this.buildUrl(path);

    return runObservedSpan(
      "BFF -> backend",
      {
        "http.request.method": method,
        "server.address": backendBaseUrl,
        "url.path": path
      },
      async (span) => {
        const headers = injectActiveTraceHeaders(
          this.requestHeadersService.build(request, {
            traceId: options.traceId,
            userId: options.userId
          })
        );
        const traceId = headers["x-trace-id"] ?? "";
        const startedAt = Date.now();

        span.setAttribute("app.trace_id", traceId);

        writeStructuredLog({
          context: ApiClientService.name,
          event: "backend_request_started",
          fields: {
            backendBaseUrl,
            method,
            path,
            traceId
          },
          level: "info"
        });

        const response = await this.fetchBackend(
          url,
          {
            method,
            headers: {
              ...headers,
              ...options.headers,
              ...(options.body === undefined
                ? {}
                : { "Content-Type": "application/json" })
            },
            body:
              options.formData ??
              (options.body === undefined
                ? undefined
                : JSON.stringify(options.body))
          },
          {
            backendBaseUrl,
            method,
            path,
            traceId
          }
        );

        span.setAttribute("http.response.status_code", response.status);

        writeStructuredLog({
          context: ApiClientService.name,
          event: "backend_request_completed",
          fields: {
            durationMs: Date.now() - startedAt,
            method,
            path,
            status: response.status,
            traceId
          },
          level: "info"
        });

        return response;
      },
      SpanKind.CLIENT
    );
  }

  private buildUrl(path: string) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.configService.getOrThrow<string>("BACKEND_BASE_URL")}${normalizedPath}`;
  }

  private async fetchBackend(
    url: string,
    init: RequestInit,
    context: {
      backendBaseUrl: string;
      method: string;
      path: string;
      traceId: string;
    }
  ) {
    try {
      return await fetch(url, init);
    } catch (error) {
      const errorFields = getErrorLogFields(error);

      writeStructuredLog({
        context: ApiClientService.name,
        event: "backend_request_failed",
        fields: {
          backendBaseUrl: context.backendBaseUrl,
          method: context.method,
          path: context.path,
          traceId: context.traceId,
          ...errorFields
        },
        level: "error",
        message: errorFields.errorMessage
      });
      throw new BackendRequestException(
        `Backend request failed. Check BACKEND_BASE_URL=${context.backendBaseUrl}`
      );
    }
  }
}

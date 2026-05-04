import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
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
  private readonly logger = new Logger(ApiClientService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly requestHeadersService: RequestHeadersService,
    private readonly responseHandlerService: ResponseHandlerService
  ) {}

  async request<T>(request: Request, path: string, options: RequestOptions = {}) {
    const headers = this.requestHeadersService.build(request, {
      traceId: options.traceId,
      userId: options.userId
    });
    const method = options.method ?? "GET";
    const backendBaseUrl = this.configService.getOrThrow<string>("BACKEND_BASE_URL");
    const url = this.buildUrl(path);
    const traceId = headers["x-trace-id"] ?? "";
    const startedAt = Date.now();

    this.logger.log(`backend request started method=${method} baseUrl=${backendBaseUrl} path=${path} traceId=${traceId}`);

    const response = await this.fetchBackend(url, {
      method,
      headers: {
        ...headers,
        ...options.headers,
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" })
      },
      body: options.formData ?? (options.body === undefined ? undefined : JSON.stringify(options.body))
    }, {
      backendBaseUrl,
      method,
      path,
      traceId
    });

    this.logger.log(
      `backend request completed method=${method} path=${path} status=${response.status} durationMs=${Date.now() - startedAt} traceId=${traceId}`
    );

    return this.responseHandlerService.handleFetchResponse<T>(response);
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
      const message = error instanceof Error ? error.message : String(error);

      this.logger.error(
        `backend request failed method=${context.method} baseUrl=${context.backendBaseUrl} path=${context.path} traceId=${context.traceId} error=${message}`
      );
      throw new BackendRequestException(`Backend request failed. Check BACKEND_BASE_URL=${context.backendBaseUrl}`);
    }
  }
}

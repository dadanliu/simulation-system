import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { tap, type Observable } from "rxjs";

type RequestWithTraceId = {
  method?: string;
  originalUrl?: string;
  requestStartedAt?: number;
  traceId?: string;
};

type ResponseWithStatusCode = {
  statusCode?: number;
};

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithTraceId>();
    const response = http.getResponse<ResponseWithStatusCode>();
    const startedAt = request.requestStartedAt ?? Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        const method = request.method ?? "UNKNOWN";
        const path = request.originalUrl ?? "";
        const statusCode = response.statusCode ?? 200;
        const traceId = request.traceId ?? "";

        this.logger.log(
          `request completed method=${method} path=${path} status=${statusCode} durationMs=${durationMs} traceId=${traceId}`
        );
      })
    );
  }
}

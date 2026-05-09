import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { tap, type Observable } from "rxjs";
import { writeStructuredLog } from "../logging/structured-log";
import { recordHttpRequestMetric } from "../metrics/http-metrics";

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
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithTraceId>();
    const response = http.getResponse<ResponseWithStatusCode>();
    const startedAt = request.requestStartedAt ?? Date.now();

    const writeRequestTelemetry = (statusCode: number) => {
      const durationMs = Date.now() - startedAt;
      const method = request.method ?? "UNKNOWN";
      const path = request.originalUrl ?? "";
      const traceId = request.traceId ?? "";

      writeStructuredLog({
        context: RequestLoggingInterceptor.name,
        event: "http_request_completed",
        fields: {
          durationMs,
          method,
          path,
          status: statusCode,
          traceId
        },
        level: statusCode >= 500 ? "warn" : "info"
      });

      recordHttpRequestMetric({
        durationMs,
        method,
        path,
        status: statusCode,
        traceId
      });
    };

    return next.handle().pipe(
      tap({
        error: (error: unknown) => {
          const statusCode =
            error instanceof HttpException ? error.getStatus() : 500;
          writeRequestTelemetry(statusCode);
        },
        next: () => {
          writeRequestTelemetry(response.statusCode ?? 200);
        }
      })
    );
  }
}

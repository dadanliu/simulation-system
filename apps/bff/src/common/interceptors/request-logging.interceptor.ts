import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from "@nestjs/common";
import { tap, type Observable } from "rxjs";
import { writeStructuredLog } from "../logging/structured-log";

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

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        const method = request.method ?? "UNKNOWN";
        const path = request.originalUrl ?? "";
        const statusCode = response.statusCode ?? 200;
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
          level: "info"
        });
      })
    );
  }
}

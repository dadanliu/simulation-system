import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Request, Response } from "express";
import { resolveTraceId } from "../http/trace-id";

type HttpExceptionPayload = {
  message?: string | string[];
};

function isHttpExceptionPayload(value: unknown): value is HttpExceptionPayload {
  return typeof value === "object" && value !== null;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request & { requestStartedAt?: number; traceId?: string }>();
    const response = context.getResponse<Response>();
    const traceId = request.traceId ?? resolveTraceId(request);
    const path = request.originalUrl ?? request.url;
    const method = request.method;
    const durationMs = Date.now() - (request.requestStartedAt ?? Date.now());

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === "string"
          ? payload
          : isHttpExceptionPayload(payload)
            ? Array.isArray(payload.message)
              ? payload.message.join(", ")
              : payload.message ?? exception.message
            : exception.message;

      this.logger.warn(
        `request failed method=${method} path=${path} status=${status} durationMs=${durationMs} traceId=${traceId} message=${message}`
      );
      response.status(status).json(payload);
      return;
    }

    if (exception instanceof Error) {
      this.logger.error(
        `request failed method=${method} path=${path} status=500 durationMs=${durationMs} traceId=${traceId} error=${exception.name}: ${exception.message}`,
        exception.stack
      );
    } else {
      this.logger.error(
        `request failed method=${method} path=${path} status=500 durationMs=${durationMs} traceId=${traceId} error=${JSON.stringify(exception)}`
      );
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: "internal server error",
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      traceId
    });
  }
}

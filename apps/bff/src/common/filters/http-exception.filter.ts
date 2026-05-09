import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import type { Request, Response } from "express";
import { resolveTraceId } from "../http/trace-id";
import {
  getErrorLogFields,
  writeStructuredLog
} from "../logging/structured-log";

type HttpExceptionPayload = {
  message?: string | string[];
};

function isHttpExceptionPayload(value: unknown): value is HttpExceptionPayload {
  return typeof value === "object" && value !== null;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<
      Request & { requestStartedAt?: number; traceId?: string }
    >();
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
              : (payload.message ?? exception.message)
            : exception.message;

      writeStructuredLog({
        context: HttpExceptionFilter.name,
        event: "http_request_failed",
        fields: {
          durationMs,
          method,
          path,
          status,
          traceId,
          ...getErrorLogFields(exception)
        },
        level: "warn",
        message
      });
      response.status(status).json({
        success: false,
        message,
        path,
        traceId,
        statusCode: status,
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (exception instanceof Error) {
      writeStructuredLog({
        context: HttpExceptionFilter.name,
        event: "http_request_failed",
        fields: {
          durationMs,
          method,
          path,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          traceId,
          ...getErrorLogFields(exception)
        },
        level: "error",
        message: exception.message
      });
    } else {
      const errorFields = getErrorLogFields(exception);

      writeStructuredLog({
        context: HttpExceptionFilter.name,
        event: "http_request_failed",
        fields: {
          durationMs,
          method,
          path,
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          traceId,
          ...errorFields
        },
        level: "error",
        message: errorFields.errorMessage
      });
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "internal server error",
      path,
      traceId,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString()
    });
  }
}

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
    const request = context.getRequest<Request & { traceId?: string }>();
    const response = context.getResponse<Response>();
    const traceId = request.traceId ?? resolveTraceId(request);
    const path = request.originalUrl ?? request.url;

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
      this.logger.error(`${exception.name}: ${exception.message}`, exception.stack);
    } else {
      this.logger.error("Unhandled non-Error exception", JSON.stringify(exception));
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

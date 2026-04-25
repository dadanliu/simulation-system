import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";

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
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

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
        path: request.url,
        statusCode: status,
        timestamp: new Date().toISOString()
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "internal server error",
      path: request.url,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString()
    });
  }
}

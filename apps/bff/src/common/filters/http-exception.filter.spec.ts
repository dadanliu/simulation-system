import type { ArgumentsHost } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { HttpExceptionFilter } from "./http-exception.filter";

describe("HttpExceptionFilter", () => {
  it("formats throttler 429 errors with the unified error envelope", () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const request = {
      headers: {},
      method: "POST",
      originalUrl: "/api/auth/login",
      traceId: "trace-throttle",
      url: "/api/auth/login"
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response
      })
    } as unknown as ArgumentsHost;

    new HttpExceptionFilter().catch(
      new ThrottlerException("too many requests"),
      host
    );

    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "too many requests",
        path: "/api/auth/login",
        statusCode: 429,
        success: false,
        traceId: "trace-throttle"
      })
    );
  });
});

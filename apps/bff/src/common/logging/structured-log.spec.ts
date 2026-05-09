import { getErrorLogFields, writeStructuredLog } from "./structured-log";

describe("structured log", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("writes searchable JSON log fields", () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation();

    writeStructuredLog({
      context: "RequestLoggingInterceptor",
      event: "http_request_completed",
      fields: {
        durationMs: 12,
        method: "POST",
        path: "/api/commodity/create",
        status: 201,
        traceId: "trace-create"
      },
      level: "info"
    });

    expect(logSpy).toHaveBeenCalledTimes(1);
    expect(JSON.parse(logSpy.mock.calls[0][0] as string)).toEqual(
      expect.objectContaining({
        context: "RequestLoggingInterceptor",
        durationMs: 12,
        event: "http_request_completed",
        level: "info",
        method: "POST",
        path: "/api/commodity/create",
        service: "bff",
        status: 201,
        traceId: "trace-create"
      })
    );
  });

  it("keeps error name, message and stack", () => {
    const error = new TypeError("boom");
    const fields = getErrorLogFields(error);

    expect(fields).toEqual({
      errorMessage: "boom",
      errorName: "TypeError",
      stack: expect.stringContaining("TypeError: boom")
    });
  });
});

import {
  recordHttpRequestMetric,
  resetHttpMetricsForTest
} from "./http-metrics";

describe("http metrics", () => {
  beforeEach(() => {
    resetHttpMetricsForTest();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("records route p95 and p99 for commodity list", () => {
    jest.spyOn(console, "log").mockImplementation();

    const firstSnapshot = recordHttpRequestMetric({
      durationMs: 20,
      method: "GET",
      path: "/api/commodity/list?page=1",
      status: 200,
      traceId: "trace-list-1"
    });
    const secondSnapshot = recordHttpRequestMetric({
      durationMs: 80,
      method: "GET",
      path: "/api/commodity/list?page=2",
      status: 200,
      traceId: "trace-list-2"
    });

    expect(firstSnapshot).toEqual(
      expect.objectContaining({
        p95Ms: 20,
        routeKey: "GET /api/commodity/list"
      })
    );
    expect(secondSnapshot).toEqual(
      expect.objectContaining({
        p95Ms: 80,
        p99Ms: 80,
        requestCount: 2,
        routeKey: "GET /api/commodity/list",
        serverErrorRate: 0
      })
    );
  });

  it("writes a core api 5xx error rate alert with cooldown control", () => {
    jest.spyOn(console, "log").mockImplementation();
    const warnSpy = jest.spyOn(console, "warn").mockImplementation();

    for (let index = 0; index < 5; index += 1) {
      recordHttpRequestMetric({
        durationMs: 30,
        method: "GET",
        path: "/api/commodity/list",
        status: index === 4 ? 500 : 200,
        traceId: `trace-${index}`
      });
    }

    const warningEvents = warnSpy.mock.calls.map(([line]) =>
      JSON.parse(line as string)
    );

    expect(warningEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event: "alert_core_api_error_rate_high",
          route: "GET /api/commodity/list",
          severity: "critical",
          serverErrorRate: 0.2
        })
      ])
    );
  });
});

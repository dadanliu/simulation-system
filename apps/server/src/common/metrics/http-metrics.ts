import { writeStructuredLog } from "../logging/structured-log";

type HttpMetricInput = {
  durationMs: number;
  method: string;
  path: string;
  status: number;
  traceId: string;
};

type HttpMetricSample = {
  durationMs: number;
  status: number;
  timestamp: number;
};

type RouteWindow = {
  samples: HttpMetricSample[];
};

const MAX_SAMPLES_PER_ROUTE = 200;
const WINDOW_MS = 5 * 60 * 1000;
const routeWindows = new Map<string, RouteWindow>();

function normalizePath(path: string) {
  const pathname = path.split("?")[0] || "/";

  return pathname
    .replace(/\/api\/mock\/commodities\/[^/]+$/u, "/api/mock/commodities/:id")
    .replace(
      /\/api\/mock\/commodities\/[^/]+\/status$/u,
      "/api/mock/commodities/:id/status"
    )
    .replace(
      /\/api\/mock\/commodities\/[^/]+\/restore$/u,
      "/api/mock/commodities/:id/restore"
    );
}

function readRouteKey(method: string, path: string) {
  return `${method.toUpperCase()} ${normalizePath(path)}`;
}

function percentile(values: number[], percentileValue: number) {
  if (!values.length) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(
    0,
    Math.ceil((percentileValue / 100) * sorted.length) - 1
  );

  return sorted[index];
}

function readRouteWindow(routeKey: string) {
  const existingWindow = routeWindows.get(routeKey);

  if (existingWindow) {
    return existingWindow;
  }

  const createdWindow: RouteWindow = {
    samples: []
  };

  routeWindows.set(routeKey, createdWindow);
  return createdWindow;
}

function trimWindow(window: RouteWindow, now: number) {
  const windowStart = now - WINDOW_MS;
  window.samples = window.samples
    .filter((sample) => sample.timestamp >= windowStart)
    .slice(-MAX_SAMPLES_PER_ROUTE);
}

export function recordHttpRequestMetric(input: HttpMetricInput) {
  const now = Date.now();
  const routeKey = readRouteKey(input.method, input.path);
  const window = readRouteWindow(routeKey);

  window.samples.push({
    durationMs: input.durationMs,
    status: input.status,
    timestamp: now
  });
  trimWindow(window, now);

  const requestCount = window.samples.length;
  const serverErrorCount = window.samples.filter(
    (sample) => sample.status >= 500
  ).length;
  const durations = window.samples.map((sample) => sample.durationMs);

  writeStructuredLog({
    context: "HttpMetrics",
    event: "http_request_metric",
    fields: {
      durationMs: input.durationMs,
      method: input.method,
      p95Ms: percentile(durations, 95),
      p99Ms: percentile(durations, 99),
      requestCount,
      route: routeKey,
      serverErrorCount,
      serverErrorRate: requestCount ? serverErrorCount / requestCount : 0,
      status: input.status,
      traceId: input.traceId
    },
    level: input.status >= 500 ? "warn" : "info"
  });
}

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

type AlertPolicy = {
  cooldownMs: number;
  errorRateThreshold: number;
  minSamples: number;
  p95ThresholdMs: number;
};

type RouteWindow = {
  lastErrorRateAlertAt: number;
  lastLatencyAlertAt: number;
  samples: HttpMetricSample[];
};

const MAX_SAMPLES_PER_ROUTE = 200;
const WINDOW_MS = 5 * 60 * 1000;

const coreApiPolicies = new Map<string, AlertPolicy>([
  [
    "GET /api/commodity/list",
    {
      cooldownMs: 60 * 1000,
      errorRateThreshold: 0.05,
      minSamples: 5,
      p95ThresholdMs: 1000
    }
  ]
]);

const routeWindows = new Map<string, RouteWindow>();

function normalizePath(path: string) {
  const pathname = path.split("?")[0] || "/";

  if (pathname === "/api/commodity/list") {
    return pathname;
  }

  return pathname
    .replace(/\/api\/commodity\/[^/]+$/u, "/api/commodity/:id")
    .replace(/\/api\/commodity\/[^/]+\/restore$/u, "/api/commodity/:id/restore")
    .replace(/\/api\/commodity\/[^/]+\/status$/u, "/api/commodity/:id/status");
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
    lastErrorRateAlertAt: 0,
    lastLatencyAlertAt: 0,
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

function readSnapshot(routeKey: string, window: RouteWindow) {
  const requestCount = window.samples.length;
  const serverErrorCount = window.samples.filter(
    (sample) => sample.status >= 500
  ).length;
  const durations = window.samples.map((sample) => sample.durationMs);

  return {
    p95Ms: percentile(durations, 95),
    p99Ms: percentile(durations, 99),
    requestCount,
    routeKey,
    serverErrorCount,
    serverErrorRate: requestCount ? serverErrorCount / requestCount : 0
  };
}

function maybeWriteAlerts(
  input: HttpMetricInput,
  snapshot: ReturnType<typeof readSnapshot>,
  window: RouteWindow,
  now: number
) {
  const policy = coreApiPolicies.get(snapshot.routeKey);

  if (!policy || snapshot.requestCount < policy.minSamples) {
    return;
  }

  const canAlertErrorRate =
    snapshot.serverErrorRate >= policy.errorRateThreshold &&
    now - window.lastErrorRateAlertAt >= policy.cooldownMs;

  if (canAlertErrorRate) {
    window.lastErrorRateAlertAt = now;
    writeStructuredLog({
      context: "HttpMetrics",
      event: "alert_core_api_error_rate_high",
      fields: {
        alertKey: `${snapshot.routeKey}:5xx_error_rate`,
        durationMs: input.durationMs,
        errorRateThreshold: policy.errorRateThreshold,
        method: input.method,
        p95Ms: snapshot.p95Ms,
        requestCount: snapshot.requestCount,
        route: snapshot.routeKey,
        serverErrorCount: snapshot.serverErrorCount,
        serverErrorRate: snapshot.serverErrorRate,
        severity: "critical",
        status: input.status,
        traceId: input.traceId
      },
      level: "warn",
      message: "Core API 5xx error rate is above threshold"
    });
  }

  const canAlertLatency =
    snapshot.p95Ms >= policy.p95ThresholdMs &&
    now - window.lastLatencyAlertAt >= policy.cooldownMs;

  if (canAlertLatency) {
    window.lastLatencyAlertAt = now;
    writeStructuredLog({
      context: "HttpMetrics",
      event: "alert_core_api_latency_high",
      fields: {
        alertKey: `${snapshot.routeKey}:p95_latency`,
        durationMs: input.durationMs,
        method: input.method,
        p95Ms: snapshot.p95Ms,
        p95ThresholdMs: policy.p95ThresholdMs,
        requestCount: snapshot.requestCount,
        route: snapshot.routeKey,
        severity: "warning",
        status: input.status,
        traceId: input.traceId
      },
      level: "warn",
      message: "Core API P95 latency is above threshold"
    });
  }
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

  const snapshot = readSnapshot(routeKey, window);

  writeStructuredLog({
    context: "HttpMetrics",
    event: "http_request_metric",
    fields: {
      durationMs: input.durationMs,
      method: input.method,
      p95Ms: snapshot.p95Ms,
      p99Ms: snapshot.p99Ms,
      requestCount: snapshot.requestCount,
      route: snapshot.routeKey,
      serverErrorCount: snapshot.serverErrorCount,
      serverErrorRate: snapshot.serverErrorRate,
      status: input.status,
      traceId: input.traceId
    },
    level: input.status >= 500 ? "warn" : "info"
  });

  maybeWriteAlerts(input, snapshot, window, now);

  return snapshot;
}

export function resetHttpMetricsForTest() {
  routeWindows.clear();
}

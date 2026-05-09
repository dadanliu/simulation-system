import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { writeStructuredLog } from "../logging/structured-log";

const serviceName = process.env.OTEL_SERVICE_NAME || "next-bff-bff";
const tracesEndpoint =
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
  (process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/u, "")}/v1/traces`
    : "");

process.env.OTEL_SERVICE_NAME = serviceName;

const tracingEnabled =
  process.env.OTEL_TRACING_ENABLED === "true" || Boolean(tracesEndpoint);

if (tracingEnabled) {
  const sdk = new NodeSDK({
    instrumentations: [getNodeAutoInstrumentations()],
    traceExporter: new OTLPTraceExporter(
      tracesEndpoint ? { url: tracesEndpoint } : {}
    )
  });

  sdk.start();

  writeStructuredLog({
    context: "OpenTelemetry",
    event: "otel_tracing_started",
    fields: {
      otelServiceName: serviceName,
      tracesEndpoint: tracesEndpoint || "default"
    },
    level: "info"
  });

  process.on("SIGTERM", () => {
    void sdk.shutdown().catch((error: unknown) => {
      writeStructuredLog({
        context: "OpenTelemetry",
        event: "otel_tracing_shutdown_failed",
        fields: {
          errorMessage: error instanceof Error ? error.message : String(error)
        },
        level: "error"
      });
    });
  });
}

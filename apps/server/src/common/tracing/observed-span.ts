import {
  SpanKind,
  SpanStatusCode,
  trace,
  type Attributes,
  type Span
} from "@opentelemetry/api";

const tracer = trace.getTracer("next-bff-backend");

function readErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function runObservedSpan<T>(
  name: string,
  attributes: Attributes,
  operation: (span: Span) => Promise<T>,
  kind = SpanKind.INTERNAL
) {
  return tracer.startActiveSpan(
    name,
    {
      attributes,
      kind
    },
    async (span) => {
      try {
        const result = await operation(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: readErrorMessage(error)
        });
        throw error;
      } finally {
        span.end();
      }
    }
  );
}

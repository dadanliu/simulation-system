type StructuredLogLevel = "info" | "warn" | "error";

type StructuredLogInput = {
  context: string;
  event: string;
  fields?: Record<string, unknown>;
  level: StructuredLogLevel;
  message?: string;
};

function compactFields(fields: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined)
  );
}

function stringifyUnknown(value: unknown) {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function getErrorLogFields(error: unknown) {
  if (error instanceof Error) {
    return {
      errorMessage: error.message,
      errorName: error.name,
      stack: error.stack
    };
  }

  return {
    errorMessage: stringifyUnknown(error),
    errorName: "NonError"
  };
}

export function writeStructuredLog(input: StructuredLogInput) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: input.level,
    service: "bff",
    context: input.context,
    event: input.event,
    ...(input.message ? { message: input.message } : {}),
    ...compactFields(input.fields)
  };
  const line = JSON.stringify(entry);

  if (input.level === "error") {
    console.error(line);
    return;
  }

  if (input.level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

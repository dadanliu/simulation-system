const APP_ERROR_PREFIX = "__APP_ERROR__";

export type AppErrorDetails = {
  message: string;
  path?: string;
  status: number;
  traceId?: string;
};

export function createAppError(details: AppErrorDetails) {
  return new Error(`${APP_ERROR_PREFIX}${JSON.stringify(details)}`);
}

export function parseAppError(input: Error | string) {
  const message = typeof input === "string" ? input : input.message;

  if (!message.startsWith(APP_ERROR_PREFIX)) {
    return null;
  }

  try {
    return JSON.parse(message.slice(APP_ERROR_PREFIX.length)) as AppErrorDetails;
  } catch {
    return null;
  }
}

export type ApiEnvelope<T> = {
  data?: T;
  message?: string;
  path?: string;
  success: boolean;
  statusCode?: number;
  timestamp?: string;
  traceId?: string;
};

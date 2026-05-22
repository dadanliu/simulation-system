export const IMAGE_PROCESSING_QUEUE = "image-processing";
export const COMMODITY_IMPORT_QUEUE = "commodity-import";
export const AUDIT_EXPORT_QUEUE = "audit-export";

export const TASK_QUEUE_NAMES = [
  IMAGE_PROCESSING_QUEUE,
  COMMODITY_IMPORT_QUEUE,
  AUDIT_EXPORT_QUEUE
] as const;

export type TaskQueueName = (typeof TASK_QUEUE_NAMES)[number];

export const IMAGE_PROCESSING_JOB = "image.process";
export const COMMODITY_IMPORT_JOB = "commodity.import";
export const AUDIT_EXPORT_JOB = "audit.export";


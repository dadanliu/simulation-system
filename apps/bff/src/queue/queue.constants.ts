export const COMMODITY_IMPORT_QUEUE = "commodity-import";

export const TASK_QUEUE_NAMES = [COMMODITY_IMPORT_QUEUE] as const;

export type TaskQueueName = (typeof TASK_QUEUE_NAMES)[number];

export const COMMODITY_IMPORT_JOB = "commodity.import";

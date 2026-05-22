import type { CreateCommodityDto } from "../commodity/dto/create-commodity.dto";
import type { TaskQueueName } from "./queue.constants";

export type TaskJobDataBase = {
  requestedBy: string;
  tenantId?: string;
  traceId: string;
};

export type CommodityImportJobData = TaskJobDataBase & {
  dryRun: boolean;
  items: CreateCommodityDto[];
};

export type CommodityImportResult = {
  created: Array<{
    id: string;
    name: string;
  }>;
  dryRun: boolean;
  failed: Array<{
    index: number;
    message: string;
    name?: string;
  }>;
  total: number;
};

export type TaskJobData = CommodityImportJobData;

export type TaskStatusState =
  | "completed"
  | "delayed"
  | "failed"
  | "queued"
  | "running"
  | "unknown";

export type TaskStatus = {
  attemptsMade: number;
  createdAt: string | null;
  failedReason?: string;
  finishedAt: string | null;
  jobId: string;
  name: string;
  processedAt: string | null;
  progress: unknown;
  queue: TaskQueueName;
  result?: unknown;
  state: TaskStatusState;
  taskId: string;
};

import type { CreateCommodityDto } from "../commodity/dto/create-commodity.dto";
import type { QueryAuditLogDto } from "../commodity/dto/query-audit-log.dto";
import type { TaskQueueName } from "./queue.constants";

export type TaskJobDataBase = {
  requestedBy: string;
  tenantId?: string;
  traceId: string;
};

export type ImageProcessingJobData = TaskJobDataBase & {
  fileId: string;
  mimeType: string;
  scene: string;
  size: number;
};

export type ProcessedImageVariant = {
  fileId: string;
  mimeType: string;
  scene: string;
  size: number;
  type: "compressed" | "thumbnail";
  url: string;
};

export type ImageProcessingResult = {
  compressed: ProcessedImageVariant;
  original: {
    fileId: string;
    mimeType: string;
    scene: string;
    size: number;
  };
  scanStatus: "passed";
  thumbnail: ProcessedImageVariant;
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

export type AuditExportJobData = TaskJobDataBase & {
  filters: Pick<
    QueryAuditLogDto,
    "action" | "createdFrom" | "createdTo" | "operator" | "targetId"
  >;
  maxRows: number;
};

export type AuditExportResult = {
  content: string;
  contentType: "text/csv";
  fileName: string;
  rowCount: number;
};

export type TaskJobData =
  | AuditExportJobData
  | CommodityImportJobData
  | ImageProcessingJobData;

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


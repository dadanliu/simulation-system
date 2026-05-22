import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import type { Job, Queue } from "bullmq";
import { randomUUID } from "node:crypto";
import {
  COMMODITY_IMPORT_JOB,
  COMMODITY_IMPORT_QUEUE,
  type TaskQueueName
} from "./queue.constants";
import type {
  CommodityImportJobData,
  TaskJobData,
  TaskStatus,
  TaskStatusState
} from "./queue.types";

@Injectable()
export class TaskQueueService {
  constructor(
    @InjectQueue(COMMODITY_IMPORT_QUEUE)
    private readonly commodityImportQueue: Queue<CommodityImportJobData>
  ) {}

  async enqueueCommodityImport(data: CommodityImportJobData) {
    const job = await this.commodityImportQueue.add(
      COMMODITY_IMPORT_JOB,
      data,
      this.createJobOptions()
    );

    return this.toTaskStatus(COMMODITY_IMPORT_QUEUE, job);
  }

  async getTask(taskId: string) {
    const { jobId, queueName } = this.parseTaskId(taskId);
    const job = await this.commodityImportQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException("task not found");
    }

    return this.toTaskStatus(queueName, job);
  }

  async getTaskData(taskId: string) {
    const { jobId, queueName } = this.parseTaskId(taskId);
    const job = await this.commodityImportQueue.getJob(jobId);

    if (!job) {
      throw new NotFoundException("task not found");
    }

    return {
      data: job.data,
      status: await this.toTaskStatus(queueName, job)
    };
  }

  buildTaskId(queueName: TaskQueueName, jobId: string) {
    return `${queueName}:${jobId}`;
  }

  parseTaskId(taskId: string) {
    const [queueName, ...jobIdParts] = taskId.split(":");
    const jobId = jobIdParts.join(":");

    if (!this.isTaskQueueName(queueName) || !jobId) {
      throw new NotFoundException("task not found");
    }

    return {
      jobId,
      queueName
    };
  }

  private createJobOptions() {
    return {
      attempts: 2,
      backoff: {
        delay: 1000,
        type: "exponential"
      },
      jobId: randomUUID(),
      removeOnComplete: {
        age: 24 * 60 * 60,
        count: 1000
      },
      removeOnFail: {
        age: 7 * 24 * 60 * 60,
        count: 5000
      }
    };
  }

  private isTaskQueueName(queueName: string): queueName is TaskQueueName {
    return queueName === COMMODITY_IMPORT_QUEUE;
  }

  private mapState(state: string): TaskStatusState {
    if (state === "active") {
      return "running";
    }

    if (
      state === "waiting" ||
      state === "waiting-children" ||
      state === "prioritized" ||
      state === "paused"
    ) {
      return "queued";
    }

    if (state === "completed" || state === "delayed" || state === "failed") {
      return state;
    }

    return "unknown";
  }

  private toDateString(timestamp?: number) {
    return timestamp ? new Date(timestamp).toISOString() : null;
  }

  private async toTaskStatus(
    queueName: TaskQueueName,
    job: Job<TaskJobData>
  ): Promise<TaskStatus> {
    const state = await job.getState();
    const jobId = job.id ?? "";

    return {
      attemptsMade: job.attemptsMade,
      createdAt: this.toDateString(job.timestamp),
      failedReason: job.failedReason || undefined,
      finishedAt: this.toDateString(job.finishedOn),
      jobId,
      name: job.name,
      processedAt: this.toDateString(job.processedOn),
      progress: job.progress,
      queue: queueName,
      result: job.returnvalue,
      state: this.mapState(state),
      taskId: this.buildTaskId(queueName, jobId)
    };
  }
}

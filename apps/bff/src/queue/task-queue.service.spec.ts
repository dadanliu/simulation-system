import { NotFoundException } from "@nestjs/common";
import type { Job, Queue } from "bullmq";
import { COMMODITY_IMPORT_QUEUE } from "./queue.constants";
import { TaskStreamConnectionRegistry } from "./task-stream-connection-registry.service";
import { TaskQueueService } from "./task-queue.service";
import type { CommodityImportJobData } from "./queue.types";

function createQueueMock(job: Partial<Job<CommodityImportJobData>> | null) {
  return {
    getJob: jest.fn().mockResolvedValue(job)
  } as unknown as Queue<CommodityImportJobData>;
}

describe("TaskQueueService", () => {
  function createService(job: Partial<Job<CommodityImportJobData>> | null) {
    const registry = new TaskStreamConnectionRegistry();
    const service = new TaskQueueService(createQueueMock(job), registry);

    return {
      registry,
      service
    };
  }

  it("builds and parses stable task IDs", () => {
    const { service } = createService(null);

    const taskId = service.buildTaskId(COMMODITY_IMPORT_QUEUE, "job-001");

    expect(taskId).toBe("commodity-import:job-001");
    expect(service.parseTaskId(taskId)).toEqual({
      jobId: "job-001",
      queueName: COMMODITY_IMPORT_QUEUE
    });
  });

  it("returns a normalized task status from BullMQ job state", async () => {
    const job = {
      attemptsMade: 1,
      data: {
        dryRun: true,
        items: [],
        requestedBy: "u_001",
        traceId: "trace-001"
      },
      failedReason: "",
      finishedOn: undefined,
      getState: jest.fn().mockResolvedValue("active"),
      id: "job-001",
      name: "commodity.import",
      processedOn: 1760000000001,
      progress: { percent: 50 },
      returnvalue: undefined,
      timestamp: 1760000000000
    } as unknown as Job<CommodityImportJobData>;
    const commodityQueue = createQueueMock(job);
    const registry = new TaskStreamConnectionRegistry();
    const service = new TaskQueueService(commodityQueue, registry);

    await expect(
      service.getTaskData("commodity-import:job-001")
    ).resolves.toEqual({
      data: job.data,
      status: {
        attemptsMade: 1,
        createdAt: "2025-10-09T08:53:20.000Z",
        failedReason: undefined,
        finishedAt: null,
        jobId: "job-001",
        name: "commodity.import",
        processedAt: "2025-10-09T08:53:20.001Z",
        progress: { percent: 50 },
        queue: COMMODITY_IMPORT_QUEUE,
        result: undefined,
        state: "running",
        taskId: "commodity-import:job-001"
      }
    });
  });

  it("emits and completes the task status stream on terminal state", async () => {
    const { service } = createService(null);
    const status = {
      attemptsMade: 1,
      createdAt: "2025-10-09T08:53:20.000Z",
      failedReason: undefined,
      finishedAt: "2025-10-09T08:53:30.000Z",
      jobId: "job-001",
      name: "commodity.import",
      processedAt: "2025-10-09T08:53:20.001Z",
      progress: { percent: 100 },
      queue: COMMODITY_IMPORT_QUEUE,
      result: { created: [], dryRun: true, failed: [], total: 0 },
      state: "completed",
      taskId: "commodity-import:job-001"
    } as const;
    const events: unknown[] = [];

    await new Promise<void>((resolve, reject) => {
      service
        .streamTaskStatus("commodity-import:job-001", {
          initialStatus: status,
          intervalMs: 10
        })
        .subscribe({
          complete: resolve,
          error: reject,
          next: (event) => events.push(event)
        });
    });

    expect(events).toEqual([
      {
        status,
        type: "task.completed"
      }
    ]);
  });

  it("groups active task streams by user, tenant, and task", async () => {
    const { registry, service } = createService(null);
    const status = {
      attemptsMade: 0,
      createdAt: "2025-10-09T08:53:20.000Z",
      failedReason: undefined,
      finishedAt: null,
      jobId: "job-001",
      name: "commodity.import",
      processedAt: null,
      progress: 0,
      queue: COMMODITY_IMPORT_QUEUE,
      result: undefined,
      state: "queued",
      taskId: "commodity-import:job-001"
    } as const;

    const subscription = service
      .streamTaskStatus("commodity-import:job-001", {
        connection: {
          taskId: "commodity-import:job-001",
          tenantId: "tenant_demo",
          userId: "u_001"
        },
        initialStatus: status,
        intervalMs: 10
      })
      .subscribe();

    expect(registry.snapshot()).toEqual({
      byTaskId: { "commodity-import:job-001": 1 },
      byTenantId: { tenant_demo: 1 },
      byUserId: { u_001: 1 },
      total: 1
    });

    subscription.unsubscribe();

    await Promise.resolve();

    expect(registry.snapshot()).toEqual({
      byTaskId: {},
      byTenantId: {},
      byUserId: {},
      total: 0
    });
  });

  it("rejects unknown queues", () => {
    const { service } = createService(null);

    expect(() => service.parseTaskId("unknown:job-001")).toThrow(
      NotFoundException
    );
  });
});

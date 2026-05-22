import { NotFoundException } from "@nestjs/common";
import type { Job, Queue } from "bullmq";
import { COMMODITY_IMPORT_QUEUE } from "./queue.constants";
import { TaskQueueService } from "./task-queue.service";
import type { CommodityImportJobData } from "./queue.types";

function createQueueMock(job: Partial<Job<CommodityImportJobData>> | null) {
  return {
    getJob: jest.fn().mockResolvedValue(job)
  } as unknown as Queue<CommodityImportJobData>;
}

describe("TaskQueueService", () => {
  it("builds and parses stable task IDs", () => {
    const service = new TaskQueueService(createQueueMock(null));

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
    const service = new TaskQueueService(commodityQueue);

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

  it("rejects unknown queues", () => {
    const service = new TaskQueueService(createQueueMock(null));

    expect(() => service.parseTaskId("unknown:job-001")).toThrow(
      NotFoundException
    );
  });
});

import { ForbiddenException } from "@nestjs/common";
import { firstValueFrom, of } from "rxjs";
import { COMMODITY_IMPORT_QUEUE } from "./queue.constants";
import { QueueController } from "./queue.controller";
import { TaskQueueService } from "./task-queue.service";
import type { AuthUser } from "../user/user.types";
import type { CommodityImportJobData, TaskStatus } from "./queue.types";

const taskData: CommodityImportJobData = {
  dryRun: true,
  items: [],
  requestedBy: "u_owner",
  tenantId: "tenant_a",
  traceId: "trace-001"
};

const taskStatus: TaskStatus = {
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
};

function createUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "u_owner",
    permissions: [],
    roles: [],
    tenantId: "tenant_a",
    username: "owner",
    ...overrides
  };
}

function createController(data: CommodityImportJobData = taskData) {
  const taskQueueService = {
    getTaskData: jest.fn().mockResolvedValue({
      data,
      status: taskStatus
    }),
    streamTaskStatus: jest.fn().mockReturnValue(
      of({
        status: taskStatus,
        type: "task.progress"
      })
    )
  } as unknown as jest.Mocked<TaskQueueService>;

  return {
    controller: new QueueController(taskQueueService),
    taskQueueService
  };
}

describe("QueueController", () => {
  it("allows task owners to query their own task status", async () => {
    const { controller } = createController();

    await expect(
      controller.getTask(createUser(), "commodity-import:job-001")
    ).resolves.toBe(taskStatus);
  });

  it("rejects same-role admins from another tenant", async () => {
    const { controller } = createController();

    await expect(
      controller.getTask(
        createUser({
          id: "u_admin",
          roles: ["admin"],
          tenantId: "tenant_b"
        }),
        "commodity-import:job-001"
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it("registers SSE streams with user, tenant, and task scope", async () => {
    const { controller, taskQueueService } = createController();

    await expect(
      firstValueFrom(
        controller.taskEvents(
          createUser({
            id: "u_admin",
            roles: ["admin"]
          }),
          "commodity-import:job-001"
        )
      )
    ).resolves.toEqual({
      data: taskStatus,
      id: "commodity-import:job-001",
      retry: 1000,
      type: "task.progress"
    });

    expect(taskQueueService.streamTaskStatus).toHaveBeenCalledWith(
      "commodity-import:job-001",
      {
        connection: {
          taskId: "commodity-import:job-001",
          tenantId: "tenant_a",
          userId: "u_admin"
        },
        initialStatus: taskStatus
      }
    );
  });
});

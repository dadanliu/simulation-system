import { NotFoundException } from "@nestjs/common";
import { BffBusinessException } from "../bff/errors";
import type { ApiClientService } from "../bff/api-client.service";
import type { AuthUser } from "../user/user.types";
import type { AuditLogService } from "./audit-log.service";
import { CommodityService } from "./commodity.service";
import type { Commodity } from "./commodity.types";

describe("CommodityService", () => {
  let apiClientService: {
    request: jest.Mock;
  };
  let auditLogService: {
    recordCommodityDelete: jest.Mock;
    recordCommodityStatusChange: jest.Mock;
    recordCommodityUpdate: jest.Mock;
  };
  let service: CommodityService;

  const user: AuthUser = {
    id: "u_admin_001",
    roles: ["admin"],
    username: "admin"
  };

  const commodity: Commodity = {
    createdAt: "2026-04-29T00:00:00.000Z",
    createdBy: "u_admin_001",
    deletedAt: "2026-04-29T01:00:00.000Z",
    deletedBy: "u_admin_001",
    description: "测试商品",
    id: "10099",
    imageFileId: "",
    imageUrl: "",
    name: "测试键盘",
    price: 299,
    status: "offline",
    stock: 10,
    updatedAt: "2026-04-29T01:00:00.000Z"
  };

  beforeEach(() => {
    apiClientService = {
      request: jest.fn()
    };
    auditLogService = {
      recordCommodityDelete: jest.fn(),
      recordCommodityStatusChange: jest.fn(),
      recordCommodityUpdate: jest.fn()
    };
    service = new CommodityService(
      apiClientService as unknown as ApiClientService,
      auditLogService as unknown as AuditLogService
    );
  });

  it("soft deletes commodity through backend and records audit log", async () => {
    apiClientService.request.mockResolvedValue(commodity);
    auditLogService.recordCommodityDelete.mockResolvedValue({
      action: "delete",
      operator: user.id,
      target: {
        id: commodity.id,
        type: "commodity"
      },
      traceId: "trace-delete"
    });

    await expect(service.deleteCommodity({ traceId: "trace-delete" } as never, user, commodity.id)).resolves.toEqual({
      auditLog: {
        action: "delete",
        operator: user.id,
        target: {
          id: commodity.id,
          type: "commodity"
        },
        traceId: "trace-delete"
      },
      commodity
    });
    expect(apiClientService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace-delete"
      }),
      "/api/commodity/10099",
      {
        body: {
          deletedBy: user.id
        },
        method: "DELETE",
        userId: user.id
      }
    );
    expect(auditLogService.recordCommodityDelete).toHaveBeenCalledWith(user.id, commodity.id, "trace-delete");
  });

  it("maps backend commodity-not-found error to Nest NotFoundException", async () => {
    apiClientService.request.mockRejectedValue(new BffBusinessException("commodity not found", 20001));

    await expect(service.deleteCommodity({ traceId: "trace-delete" } as never, user, "missing-id")).rejects.toBeInstanceOf(
      NotFoundException
    );
    expect(auditLogService.recordCommodityDelete).not.toHaveBeenCalled();
  });

  it("updates commodity through backend and records before-after audit log", async () => {
    const before = {
      ...commodity,
      name: "旧商品",
      price: 199,
      stock: 3
    };
    const after = {
      ...commodity,
      deletedAt: null,
      deletedBy: null,
      name: "新商品",
      price: 299,
      stock: 8
    };

    apiClientService.request.mockResolvedValue({ after, before });
    auditLogService.recordCommodityUpdate.mockResolvedValue({
      action: "update",
      operator: user.id,
      target: {
        id: commodity.id,
        type: "commodity"
      },
      traceId: "trace-update"
    });

    await expect(
      service.updateCommodity({ traceId: "trace-update" } as never, user, commodity.id, {
        description: "更新描述",
        imageFileId: "file_1",
        imageUrl: "/uploads/commodity/file_1.png",
        name: "新商品",
        price: 299,
        stock: 8
      })
    ).resolves.toEqual({
      auditLog: {
        action: "update",
        operator: user.id,
        target: {
          id: commodity.id,
          type: "commodity"
        },
        traceId: "trace-update"
      },
      commodity: after
    });
    expect(apiClientService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace-update"
      }),
      "/api/commodity/10099",
      {
        body: {
          description: "更新描述",
          imageFileId: "file_1",
          imageUrl: "/uploads/commodity/file_1.png",
          name: "新商品",
          price: 299,
          stock: 8,
          updatedBy: user.id
        },
        method: "PATCH",
        userId: user.id
      }
    );
    expect(auditLogService.recordCommodityUpdate).toHaveBeenCalledWith(
      user.id,
      commodity.id,
      before,
      after,
      "trace-update"
    );
  });

  it("records before-after status audit log with reason", async () => {
    const before = {
      ...commodity,
      deletedAt: null,
      deletedBy: null,
      status: "pending" as const
    };
    const after = {
      ...before,
      status: "on_sale" as const
    };

    apiClientService.request.mockResolvedValue({ after, before });
    auditLogService.recordCommodityStatusChange.mockResolvedValue({
      action: "status_change",
      after: {
        status: "on_sale"
      },
      before: {
        status: "pending"
      },
      operator: user.id,
      reason: "审核通过",
      target: {
        id: commodity.id,
        type: "commodity"
      },
      traceId: "trace-status"
    });

    await expect(
      service.updateCommodityStatus({ traceId: "trace-status" } as never, user, commodity.id, {
        reason: "审核通过",
        status: "on_sale"
      })
    ).resolves.toMatchObject({
      auditLog: {
        action: "status_change",
        after: {
          status: "on_sale"
        },
        before: {
          status: "pending"
        },
        reason: "审核通过"
      },
      commodity: after
    });
    expect(apiClientService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace-status"
      }),
      "/api/commodity/10099/status",
      {
        body: {
          reason: "审核通过",
          status: "on_sale"
        },
        method: "PATCH",
        userId: user.id
      }
    );
    expect(auditLogService.recordCommodityStatusChange).toHaveBeenCalledWith(
      user.id,
      commodity.id,
      "pending",
      "on_sale",
      "审核通过",
      "trace-status"
    );
  });
});

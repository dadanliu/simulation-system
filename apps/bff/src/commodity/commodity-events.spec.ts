import type { AuditLogService } from "./audit-log.service";
import { CommodityAuditEventHandler } from "./commodity-audit.events";
import type { CommodityCacheService } from "./commodity-cache.service";
import { CommodityCacheEventHandler } from "./commodity-cache.events";
import {
  CommodityCreatedEvent,
  CommodityDeletedEvent,
  CommodityStatusChangedEvent,
  createCommodityAuditEventResult
} from "./commodity.events";
import type { Commodity } from "./commodity.types";

describe("commodity event handlers", () => {
  const commodity: Commodity = {
    createdAt: "2026-04-29T00:00:00.000Z",
    createdBy: "u_admin_001",
    deletedAt: null,
    deletedBy: null,
    description: "测试商品",
    id: "10099",
    imageFileId: "",
    imageUrl: "",
    name: "测试键盘",
    price: 299,
    status: "pending",
    stock: 10,
    updatedAt: "2026-04-29T01:00:00.000Z"
  };

  it("writes commodity create audit logs from events", async () => {
    const auditLog = {
      action: "create",
      operator: "u_admin_001",
      target: {
        id: commodity.id,
        type: "commodity" as const
      },
      traceId: "trace-create"
    };
    const recordCommodityCreate = jest.fn().mockResolvedValue(auditLog);
    const handler = new CommodityAuditEventHandler({
      recordCommodityCreate
    } as unknown as AuditLogService);

    await expect(
      handler.handleCommodityCreated(
        new CommodityCreatedEvent({
          commodity,
          operatorId: "u_admin_001",
          traceId: "trace-create"
        })
      )
    ).resolves.toEqual(createCommodityAuditEventResult(auditLog as never));
    expect(recordCommodityCreate).toHaveBeenCalledWith(
      "u_admin_001",
      commodity,
      "trace-create"
    );
  });

  it("writes commodity delete audit logs from events", async () => {
    const before = commodity;
    const after = {
      ...commodity,
      deletedAt: "2026-04-29T02:00:00.000Z",
      deletedBy: "u_admin_001"
    };
    const auditLog = {
      action: "delete",
      operator: "u_admin_001",
      reason: "重复创建",
      target: {
        id: commodity.id,
        type: "commodity" as const
      },
      traceId: "trace-delete"
    };
    const recordCommodityDelete = jest.fn().mockResolvedValue(auditLog);
    const handler = new CommodityAuditEventHandler({
      recordCommodityDelete
    } as unknown as AuditLogService);

    await expect(
      handler.handleCommodityDeleted(
        new CommodityDeletedEvent({
          after,
          before,
          commodityId: commodity.id,
          operatorId: "u_admin_001",
          reason: "重复创建",
          traceId: "trace-delete"
        })
      )
    ).resolves.toEqual(createCommodityAuditEventResult(auditLog as never));
    expect(recordCommodityDelete).toHaveBeenCalledWith(
      "u_admin_001",
      commodity.id,
      before,
      after,
      "重复创建",
      "trace-delete"
    );
  });

  it("writes commodity status audit logs from events", async () => {
    const before = commodity;
    const after = {
      ...commodity,
      status: "on_sale" as const
    };
    const auditLog = {
      action: "status_change",
      operator: "u_admin_001",
      reason: "审核通过",
      target: {
        id: commodity.id,
        type: "commodity" as const
      },
      traceId: "trace-status"
    };
    const recordCommodityStatusChange = jest.fn().mockResolvedValue(auditLog);
    const handler = new CommodityAuditEventHandler({
      recordCommodityStatusChange
    } as unknown as AuditLogService);

    await expect(
      handler.handleCommodityStatusChanged(
        new CommodityStatusChangedEvent({
          after,
          before,
          commodityId: commodity.id,
          operatorId: "u_admin_001",
          reason: "审核通过",
          traceId: "trace-status"
        })
      )
    ).resolves.toEqual(createCommodityAuditEventResult(auditLog as never));
    expect(recordCommodityStatusChange).toHaveBeenCalledWith(
      "u_admin_001",
      commodity.id,
      "pending",
      "on_sale",
      "审核通过",
      "trace-status"
    );
  });

  it("invalidates commodity list cache from mutation events", async () => {
    const invalidateCommodityList = jest.fn().mockResolvedValue(undefined);
    const handler = new CommodityCacheEventHandler({
      invalidateCommodityList
    } as unknown as CommodityCacheService);

    await handler.handleCommodityCreated(
      new CommodityCreatedEvent({
        commodity,
        operatorId: "u_admin_001",
        traceId: "trace-cache"
      })
    );

    expect(invalidateCommodityList).toHaveBeenCalledTimes(1);
  });

  it("does not reject the main event flow when cache invalidation fails", async () => {
    const invalidateCommodityList = jest
      .fn()
      .mockRejectedValue(new Error("redis down"));
    const handler = new CommodityCacheEventHandler({
      invalidateCommodityList
    } as unknown as CommodityCacheService);

    await expect(
      handler.handleCommodityCreated(
        new CommodityCreatedEvent({
          commodity,
          operatorId: "u_admin_001",
          traceId: "trace-cache"
        })
      )
    ).resolves.toBeUndefined();
  });
});

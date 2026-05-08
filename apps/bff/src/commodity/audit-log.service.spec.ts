import { AuditLogService } from "./audit-log.service";
import type { Commodity } from "./commodity.types";

describe("AuditLogService", () => {
  const commodity: Commodity = {
    createdAt: "2026-04-29T00:00:00.000Z",
    createdBy: "u_admin_001",
    deletedAt: null,
    deletedBy: null,
    description: "测试商品",
    id: "10099",
    imageFileId: "file_10099",
    imageUrl: "http://localhost:3002/uploads/commodity/file_10099.png",
    name: "测试键盘",
    price: 299,
    status: "pending",
    stock: 10,
    updatedAt: "2026-04-29T00:00:00.000Z"
  };

  it("records commodity create with filtered before/after fields", async () => {
    const create = jest.fn().mockResolvedValue({
      toObject: () => ({
        action: "create",
        after: {
          name: commodity.name,
          price: commodity.price,
          status: commodity.status,
          stock: commodity.stock
        },
        before: null,
        createdAt: "2026-04-29T00:00:00.000Z",
        operator: "u_admin_001",
        reason: null,
        resourceId: commodity.id,
        resourceType: "commodity",
        traceId: "trace-create"
      })
    });
    const service = new AuditLogService({ create } as never);

    const result = await service.recordCommodityCreate("u_admin_001", commodity, "trace-create");

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "create",
        after: {
          name: commodity.name,
          price: commodity.price,
          status: commodity.status,
          stock: commodity.stock
        },
        before: null,
        operator: "u_admin_001",
        resourceId: commodity.id,
        resourceType: "commodity",
        traceId: "trace-create"
      })
    );
    expect(result).toEqual({
      action: "create",
      after: {
        name: commodity.name,
        price: commodity.price,
        status: commodity.status,
        stock: commodity.stock
      },
      before: null,
      createdAt: "2026-04-29T00:00:00.000Z",
      operator: "u_admin_001",
      reason: null,
      target: {
        id: commodity.id,
        type: "commodity"
      },
      traceId: "trace-create"
    });
  });

  it("lists commodity logs with operator, action, targetId and time filters", async () => {
    const lean = jest.fn().mockResolvedValue([
      {
        action: "update",
        after: {
          price: 399
        },
        before: {
          price: 299
        },
        createdAt: "2026-04-29T01:30:00.000Z",
        operator: "u_admin_001",
        reason: null,
        resourceId: "10099",
        resourceType: "commodity",
        traceId: "trace-audit-list"
      }
    ]);
    const limit = jest.fn().mockReturnValue({ lean });
    const skip = jest.fn().mockReturnValue({ limit });
    const sort = jest.fn().mockReturnValue({ skip });
    const find = jest.fn().mockReturnValue({ sort });
    const countDocuments = jest.fn().mockResolvedValue(1);
    const service = new AuditLogService({ countDocuments, find } as never);

    const result = await service.listCommodityLogs({
      action: "update" as never,
      createdFrom: "2026-04-29T00:00:00.000Z",
      createdTo: "2026-04-29T23:59:59.999Z",
      operator: "u_admin_001",
      page: 2,
      pageSize: 5,
      targetId: "10099"
    });

    expect(find).toHaveBeenCalledWith({
      action: "update",
      createdAt: {
        $gte: new Date("2026-04-29T00:00:00.000Z"),
        $lte: new Date("2026-04-29T23:59:59.999Z")
      },
      operator: "u_admin_001",
      resourceId: "10099",
      resourceType: "commodity"
    });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1, resourceId: -1 });
    expect(skip).toHaveBeenCalledWith(5);
    expect(limit).toHaveBeenCalledWith(5);
    expect(countDocuments).toHaveBeenCalledWith({
      action: "update",
      createdAt: {
        $gte: new Date("2026-04-29T00:00:00.000Z"),
        $lte: new Date("2026-04-29T23:59:59.999Z")
      },
      operator: "u_admin_001",
      resourceId: "10099",
      resourceType: "commodity"
    });
    expect(result).toEqual({
      list: [
        {
          action: "update",
          after: {
            price: 399
          },
          before: {
            price: 299
          },
          createdAt: "2026-04-29T01:30:00.000Z",
          operator: "u_admin_001",
          reason: null,
          target: {
            id: "10099",
            type: "commodity"
          },
          traceId: "trace-audit-list"
        }
      ],
      pagination: {
        page: 2,
        pageSize: 5,
        total: 1
      }
    });
  });
});

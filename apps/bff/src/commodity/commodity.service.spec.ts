import { NotFoundException } from "@nestjs/common";
import { BffBusinessException } from "../bff/errors";
import type { ApiClientService } from "../bff/api-client.service";
import type { AuthUser } from "../user/user.types";
import type { AuditLogService } from "./audit-log.service";
import type { CommodityCacheService } from "./commodity-cache.service";
import { CommodityService } from "./commodity.service";
import type { Commodity } from "./commodity.types";

describe("CommodityService", () => {
  let apiClientService: {
    request: jest.Mock;
  };
  let auditLogService: {
    recordCommodityCreate: jest.Mock;
    recordCommodityDelete: jest.Mock;
    recordCommodityRestore: jest.Mock;
    recordCommodityStatusChange: jest.Mock;
    recordCommodityUpdate: jest.Mock;
  };
  let commodityCacheService: {
    invalidateCommodityList: jest.Mock;
    readCommodityList: jest.Mock;
    writeCommodityList: jest.Mock;
  };
  let service: CommodityService;

  const user: AuthUser = {
    id: "u_admin_001",
    permissions: [
      "audit:read",
      "commodity:create",
      "commodity:delete",
      "commodity:read",
      "commodity:update",
      "permission:manage",
      "role:manage",
      "user:manage"
    ],
    roles: ["admin"],
    tenantId: "tenant_demo",
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
      recordCommodityCreate: jest.fn(),
      recordCommodityDelete: jest.fn(),
      recordCommodityRestore: jest.fn(),
      recordCommodityStatusChange: jest.fn(),
      recordCommodityUpdate: jest.fn()
    };
    commodityCacheService = {
      invalidateCommodityList: jest.fn(),
      readCommodityList: jest.fn().mockResolvedValue({
        data: null,
        key: "commodity-list-cache-key",
        state: "miss"
      }),
      writeCommodityList: jest.fn()
    };
    service = new CommodityService(
      apiClientService as unknown as ApiClientService,
      auditLogService as unknown as AuditLogService,
      commodityCacheService as unknown as CommodityCacheService
    );
  });

  it("forwards combined list filters with stable sort query", async () => {
    const request = { traceId: "trace-list" } as never;

    apiClientService.request.mockResolvedValue({
      list: [commodity],
      pagination: {
        page: 2,
        pageSize: 20,
        total: 21
      }
    });

    await expect(
      service.listCommodities(request, user, {
        createdFrom: "2026-04-01T00:00:00.000Z",
        createdTo: "2026-04-30T23:59:59.999Z",
        keyword: "键盘",
        maxPrice: 1000,
        maxStock: 200,
        minPrice: 100,
        minStock: 1,
        page: 2,
        pageSize: 20,
        sortBy: "price" as never,
        sortOrder: "asc" as never,
        status: "on_sale"
      })
    ).resolves.toEqual({
      list: [commodity],
      pagination: {
        page: 2,
        pageSize: 20,
        total: 21
      }
    });

    expect(apiClientService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace-list"
      }),
      "/api/commodity/list?createdAtFrom=2026-04-01T00%3A00%3A00.000Z&createdAtTo=2026-04-30T23%3A59%3A59.999Z&keyword=%E9%94%AE%E7%9B%98&limit=20&offset=20&priceMax=1000&priceMin=100&sortDirection=asc&sortField=price&status=on_sale&stockMax=200&stockMin=1",
      {
        tenantId: user.tenantId,
        userId: user.id
      }
    );
    expect(commodityCacheService.readCommodityList).toHaveBeenCalledWith(
      user,
      "/api/commodity/list?createdAtFrom=2026-04-01T00%3A00%3A00.000Z&createdAtTo=2026-04-30T23%3A59%3A59.999Z&keyword=%E9%94%AE%E7%9B%98&limit=20&offset=20&priceMax=1000&priceMin=100&sortDirection=asc&sortField=price&status=on_sale&stockMax=200&stockMin=1"
    );
    expect(commodityCacheService.writeCommodityList).toHaveBeenCalledWith(
      "commodity-list-cache-key",
      {
        list: [commodity],
        pagination: {
          page: 2,
          pageSize: 20,
          total: 21
        }
      }
    );
    expect(request).toMatchObject({
      commodityListCacheDebug: {
        keyHash: expect.any(String),
        refresh: "none",
        source: "backend",
        state: "miss"
      }
    });
  });

  it("returns fresh cached commodity list without calling backend", async () => {
    const request = { traceId: "trace-cache" } as never;
    const cachedList = {
      list: [commodity],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 1
      }
    };

    commodityCacheService.readCommodityList.mockResolvedValue({
      data: cachedList,
      key: "cached-list-key",
      state: "fresh"
    });

    await expect(
      service.listCommodities(request, user, {
        page: 1,
        pageSize: 10,
        sortBy: "createdAt" as never,
        sortOrder: "desc" as never
      })
    ).resolves.toEqual(cachedList);
    expect(apiClientService.request).not.toHaveBeenCalled();
    expect(commodityCacheService.writeCommodityList).not.toHaveBeenCalled();
    expect(request).toMatchObject({
      commodityListCacheDebug: {
        keyHash: expect.any(String),
        refresh: "none",
        source: "redis",
        state: "fresh"
      }
    });
  });

  it("forwards cursor pagination with tenant context", async () => {
    const request = { traceId: "trace-cursor" } as never;

    apiClientService.request.mockResolvedValue({
      list: [commodity],
      pagination: {
        mode: "cursor",
        nextCursor: null,
        page: 3,
        pageSize: 10,
        total: 21
      }
    });

    await service.listCommodities(request, user, {
      cursor: "cursor-token",
      page: 3,
      pageSize: 10,
      sortBy: "createdAt" as never,
      sortOrder: "desc" as never
    });

    expect(apiClientService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace-cursor"
      }),
      "/api/commodity/list?cursor=cursor-token&limit=10&offset=20&page=3&sortDirection=desc&sortField=createdAt",
      {
        tenantId: user.tenantId,
        userId: user.id
      }
    );
  });

  it("returns stale cached commodity list and schedules background refresh", async () => {
    const request = { traceId: "trace-stale" } as never;
    const cachedList = {
      list: [commodity],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 1
      }
    };

    commodityCacheService.readCommodityList.mockResolvedValue({
      data: cachedList,
      key: "stale-list-key",
      state: "stale"
    });
    apiClientService.request.mockResolvedValue({
      list: [commodity],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 1
      }
    });

    await expect(
      service.listCommodities(request, user, {
        page: 1,
        pageSize: 10,
        sortBy: "createdAt" as never,
        sortOrder: "desc" as never
      })
    ).resolves.toEqual(cachedList);
    expect(request).toMatchObject({
      commodityListCacheDebug: {
        keyHash: expect.any(String),
        refresh: "background",
        source: "redis",
        state: "stale"
      }
    });
  });

  it("creates commodity through backend and invalidates list cache", async () => {
    apiClientService.request.mockResolvedValue(commodity);
    auditLogService.recordCommodityCreate.mockResolvedValue({
      action: "create",
      operator: user.id,
      target: {
        id: commodity.id,
        type: "commodity"
      },
      traceId: "trace-create"
    });

    await expect(
      service.createCommodity({ traceId: "trace-create" } as never, user, {
        description: "测试商品",
        imageFileId: "",
        imageUrl: "",
        name: "测试键盘",
        price: 299,
        status: "offline" as never,
        stock: 10
      })
    ).resolves.toEqual({
      auditLog: {
        action: "create",
        operator: user.id,
        target: {
          id: commodity.id,
          type: "commodity"
        },
        traceId: "trace-create"
      },
      commodity
    });
    expect(apiClientService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace-create"
      }),
      "/api/commodity/create",
      {
        body: {
          createdBy: user.id,
          description: "测试商品",
          imageFileId: "",
          imageUrl: "",
          name: "测试键盘",
          price: 299,
          status: "offline",
          stock: 10
        },
        method: "POST",
        tenantId: user.tenantId,
        userId: user.id
      }
    );
    expect(auditLogService.recordCommodityCreate).toHaveBeenCalledWith(
      user.id,
      commodity,
      "trace-create"
    );
    expect(commodityCacheService.invalidateCommodityList).toHaveBeenCalledTimes(
      1
    );
  });

  it("soft deletes commodity through backend and records audit log", async () => {
    const before = {
      ...commodity,
      deletedAt: null,
      deletedBy: null
    };
    const after = commodity;

    apiClientService.request.mockResolvedValue({ after, before });
    auditLogService.recordCommodityDelete.mockResolvedValue({
      action: "delete",
      after: {
        deletedAt: commodity.deletedAt,
        deletedBy: user.id
      },
      before: {
        deletedAt: null,
        deletedBy: null
      },
      operator: user.id,
      reason: "重复创建",
      target: {
        id: commodity.id,
        type: "commodity"
      },
      traceId: "trace-delete"
    });

    await expect(
      service.deleteCommodity(
        { traceId: "trace-delete" } as never,
        user,
        commodity.id,
        {
          reason: "重复创建"
        }
      )
    ).resolves.toEqual({
      auditLog: {
        action: "delete",
        after: {
          deletedAt: commodity.deletedAt,
          deletedBy: user.id
        },
        before: {
          deletedAt: null,
          deletedBy: null
        },
        operator: user.id,
        reason: "重复创建",
        target: {
          id: commodity.id,
          type: "commodity"
        },
        traceId: "trace-delete"
      },
      commodity: after
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
        tenantId: user.tenantId,
        userId: user.id
      }
    );
    expect(auditLogService.recordCommodityDelete).toHaveBeenCalledWith(
      user.id,
      commodity.id,
      before,
      after,
      "重复创建",
      "trace-delete"
    );
    expect(commodityCacheService.invalidateCommodityList).toHaveBeenCalledTimes(
      1
    );
  });

  it("maps backend commodity-not-found error to Nest NotFoundException", async () => {
    apiClientService.request.mockRejectedValue(
      new BffBusinessException("commodity not found", 20001)
    );

    await expect(
      service.deleteCommodity(
        { traceId: "trace-delete" } as never,
        user,
        "missing-id",
        {
          reason: "重复创建"
        }
      )
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(auditLogService.recordCommodityDelete).not.toHaveBeenCalled();
    expect(
      commodityCacheService.invalidateCommodityList
    ).not.toHaveBeenCalled();
  });

  it("restores soft deleted commodity through backend and records audit log", async () => {
    const before = commodity;
    const after = {
      ...commodity,
      deletedAt: null,
      deletedBy: null
    };

    apiClientService.request.mockResolvedValue({ after, before });
    auditLogService.recordCommodityRestore.mockResolvedValue({
      action: "restore",
      after: {
        deletedAt: null,
        deletedBy: null
      },
      before: {
        deletedAt: commodity.deletedAt,
        deletedBy: commodity.deletedBy
      },
      operator: user.id,
      reason: "误删恢复",
      target: {
        id: commodity.id,
        type: "commodity"
      },
      traceId: "trace-restore"
    });

    await expect(
      service.restoreCommodity(
        { traceId: "trace-restore" } as never,
        user,
        commodity.id,
        {
          reason: "误删恢复"
        }
      )
    ).resolves.toEqual({
      auditLog: {
        action: "restore",
        after: {
          deletedAt: null,
          deletedBy: null
        },
        before: {
          deletedAt: commodity.deletedAt,
          deletedBy: commodity.deletedBy
        },
        operator: user.id,
        reason: "误删恢复",
        target: {
          id: commodity.id,
          type: "commodity"
        },
        traceId: "trace-restore"
      },
      commodity: after
    });
    expect(apiClientService.request).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace-restore"
      }),
      "/api/commodity/10099/restore",
      {
        method: "PATCH",
        tenantId: user.tenantId,
        userId: user.id
      }
    );
    expect(auditLogService.recordCommodityRestore).toHaveBeenCalledWith(
      user.id,
      commodity.id,
      before,
      after,
      "误删恢复",
      "trace-restore"
    );
    expect(commodityCacheService.invalidateCommodityList).toHaveBeenCalledTimes(
      1
    );
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
      service.updateCommodity(
        { traceId: "trace-update" } as never,
        user,
        commodity.id,
        {
          description: "更新描述",
          imageFileId: "file_1",
          imageUrl: "/uploads/commodity/file_1.png",
          name: "新商品",
          price: 299,
          stock: 8
        }
      )
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
        tenantId: user.tenantId,
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
    expect(commodityCacheService.invalidateCommodityList).toHaveBeenCalledTimes(
      1
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
      service.updateCommodityStatus(
        { traceId: "trace-status" } as never,
        user,
        commodity.id,
        {
          reason: "审核通过",
          status: "on_sale"
        }
      )
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
        tenantId: user.tenantId,
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
    expect(commodityCacheService.invalidateCommodityList).toHaveBeenCalledTimes(
      1
    );
  });
});

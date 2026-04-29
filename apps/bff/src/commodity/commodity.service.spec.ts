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
      recordCommodityDelete: jest.fn()
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
});

import { NotFoundException, type INestApplication } from "@nestjs/common";
import request = require("supertest");
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../common/http/csrf-token";
import type { AuthUser } from "../user/user.types";
import {
  createBffTestApp,
  createTestAppMocks,
  type TestAppMocks
} from "../test/app-test-utils";
import type { Commodity } from "./commodity.types";

describe("CommodityController e2e", () => {
  let app: INestApplication;
  let mocks: TestAppMocks;

  const adminUser: AuthUser = {
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

  const operatorUser: AuthUser = {
    id: "u_operator_001",
    permissions: ["commodity:create", "commodity:read", "commodity:update"],
    roles: ["operator"],
    tenantId: "tenant_demo",
    username: "operator"
  };

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
    updatedAt: "2026-04-29T00:00:00.000Z"
  };

  beforeEach(async () => {
    mocks = createTestAppMocks();
    mocks.permissionService.hasAllPermissionsByRoleCodes.mockResolvedValue(
      true
    );
    app = await createBffTestApp(mocks);
  });

  afterEach(async () => {
    await app.close();
  });

  function getSetCookies(response: request.Response) {
    const setCookieHeader = response.headers["set-cookie"];

    if (Array.isArray(setCookieHeader)) {
      return setCookieHeader;
    }

    return typeof setCookieHeader === "string" ? [setCookieHeader] : [];
  }

  async function issueCsrfToken() {
    const response = await request(app.getHttpServer())
      .get("/api/auth/csrf")
      .expect(200);
    const setCookie = getSetCookies(response).find((value) =>
      value.startsWith(`${CSRF_COOKIE_NAME}=`)
    );

    expect(setCookie).toBeDefined();

    const rawCookie = setCookie!.split(";", 1)[0];
    const token = decodeURIComponent(rawCookie.split("=", 2)[1] ?? "");

    expect(token).not.toBe("");

    return {
      cookie: rawCookie,
      token
    };
  }

  function expectPermissionCheck(
    roleCodes: string[],
    permissionCodes: string[]
  ) {
    expect(
      mocks.permissionService.hasAllPermissionsByRoleCodes
    ).toHaveBeenCalledWith(roleCodes, permissionCodes);
  }

  it("rejects anonymous commodity access with a unified 401 response", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(null);

    const response = await request(app.getHttpServer())
      .get("/api/commodity/list")
      .set("x-trace-id", "trace-anonymous")
      .expect(401);

    expect(response.body).toMatchObject({
      message: "Unauthorized",
      path: "/api/commodity/list",
      statusCode: 401,
      success: false,
      traceId: "trace-anonymous"
    });
    expect(mocks.commodityService.listCommodities).not.toHaveBeenCalled();
  });

  it("rejects commodity creation without a CSRF token", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/commodity/create")
      .set("Cookie", "next_bff_session=session-admin")
      .set("x-trace-id", "trace-missing-csrf")
      .send({
        description: "测试商品",
        name: "测试键盘",
        price: 299,
        status: "pending",
        stock: 10
      })
      .expect(403);

    expect(response.body).toMatchObject({
      message: `CSRF token invalid: expected ${CSRF_HEADER_NAME}`,
      path: "/api/commodity/create",
      statusCode: 403,
      success: false,
      traceId: "trace-missing-csrf"
    });
    expect(mocks.commodityService.createCommodity).not.toHaveBeenCalled();
  });

  it("rejects invalid commodity list query before entering service", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(adminUser);

    const response = await request(app.getHttpServer())
      .get("/api/commodity/list")
      .query({
        page: "0",
        sortBy: "deletedAt",
        status: "unknown"
      })
      .set("Cookie", "next_bff_session=session-admin")
      .set("x-trace-id", "trace-list-invalid")
      .expect(400);

    expect(response.body).toMatchObject({
      path: "/api/commodity/list?page=0&sortBy=deletedAt&status=unknown",
      statusCode: 400,
      success: false,
      traceId: "trace-list-invalid"
    });
    expect(mocks.commodityService.listCommodities).not.toHaveBeenCalled();
  });

  it("rejects commodity list pageSize over the configured limit", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(adminUser);

    const response = await request(app.getHttpServer())
      .get("/api/commodity/list")
      .query({
        pageSize: "101"
      })
      .set("Cookie", "next_bff_session=session-admin")
      .set("x-trace-id", "trace-list-pagesize")
      .expect(400);

    expect(response.body).toMatchObject({
      path: "/api/commodity/list?pageSize=101",
      statusCode: 400,
      success: false,
      traceId: "trace-list-pagesize"
    });
    expect(response.body.message).toContain(
      "pageSize must not be greater than 100"
    );
    expect(mocks.commodityService.listCommodities).not.toHaveBeenCalled();
  });

  it("exposes commodity list cache troubleshooting headers", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(adminUser);
    mocks.commodityService.listCommodities.mockImplementation((request) => {
      request.commodityListCacheDebug = {
        keyHash: "cacheabc1234",
        refresh: "none",
        source: "backend",
        state: "miss"
      };

      return Promise.resolve({
        list: [commodity],
        pagination: {
          page: 1,
          pageSize: 20,
          mode: "offset",
          nextCursor: null,
          total: 1
        },
        queryPlan: {
          candidateIndex: "idx_commodities_tenant_active_created_at_id",
          costLevel: "low",
          coveredByIndex: true,
          hasCreatedAtRange: false,
          hasKeyword: false,
          hasPriceRange: false,
          hasStatusFilter: false,
          hasStockRange: false,
          offset: 0,
          page: 1,
          paginationMode: "offset",
          recommendations: ["当前查询可由商品复合索引覆盖主要筛选和排序。"],
          sortDirection: "desc",
          sortField: "createdAt",
          unsupportedFilters: []
        },
        sharding: {
          routingMode: "targeted",
          shardKey: "tenantId",
          shardName: "shard-1",
          tenantHash: "tenantabc123"
        }
      });
    });

    const response = await request(app.getHttpServer())
      .get("/api/commodity/list")
      .set("Cookie", "next_bff_session=session-admin")
      .set("x-trace-id", "trace-list-cache")
      .expect(200);

    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["x-cache-layer"]).toBe("bff-redis");
    expect(response.headers["x-commodity-list-cache-state"]).toBe("miss");
    expect(response.headers["x-commodity-list-cache-source"]).toBe("backend");
    expect(response.headers["x-commodity-list-cache-refresh"]).toBe("none");
    expect(response.headers["x-commodity-list-cache-key"]).toBe("cacheabc1234");
    expect(response.headers["x-commodity-list-candidate-index"]).toBe(
      "idx_commodities_tenant_active_created_at_id"
    );
    expect(response.headers["x-commodity-list-index-covered"]).toBe("true");
    expect(response.headers["x-commodity-list-query-cost"]).toBe("low");
    expect(response.headers["x-commodity-list-unsupported-filters"]).toBe("");
    expect(response.headers["x-commodity-list-routing-mode"]).toBe("targeted");
    expect(response.headers["x-commodity-list-shard-key"]).toBe("tenantId");
    expect(response.headers["x-commodity-list-shard-name"]).toBe("shard-1");
    expect(response.headers["x-commodity-list-tenant-hash"]).toBe(
      "tenantabc123"
    );
    expect(response.body).toMatchObject({
      data: {
        list: [
          {
            id: commodity.id,
            name: commodity.name
          }
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1
        }
      },
      traceId: "trace-list-cache"
    });
    expectPermissionCheck(["admin"], ["commodity:read"]);
  });

  it("returns a unified 404 response when commodity detail is missing", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(adminUser);
    mocks.commodityService.getCommodity.mockRejectedValue(
      new NotFoundException("commodity not found")
    );

    const response = await request(app.getHttpServer())
      .get("/api/commodity/99999")
      .set("Cookie", "next_bff_session=session-admin")
      .set("x-trace-id", "trace-detail-missing")
      .expect(404);

    expect(response.body).toMatchObject({
      message: "commodity not found",
      path: "/api/commodity/99999",
      statusCode: 404,
      success: false,
      traceId: "trace-detail-missing"
    });
    expect(mocks.commodityService.getCommodity).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace-detail-missing"
      }),
      adminUser,
      "99999"
    );
  });

  it("lists audit logs with operator, action, target and time filters", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(adminUser);
    mocks.commodityService.listAuditLogs.mockResolvedValue({
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
          operator: adminUser.id,
          reason: null,
          target: {
            id: commodity.id,
            type: "commodity"
          },
          traceId: "trace-audit-list"
        }
      ],
      pagination: {
        page: 2,
        pageSize: 5,
        total: 7
      }
    });

    const response = await request(app.getHttpServer())
      .get("/api/commodity/audit-logs")
      .query({
        action: "update",
        createdFrom: "2026-04-29T00:00:00.000Z",
        createdTo: "2026-04-29T23:59:59.999Z",
        operator: adminUser.id,
        page: "2",
        pageSize: "5",
        targetId: commodity.id
      })
      .set("Cookie", "next_bff_session=session-admin")
      .set("x-trace-id", "trace-audit-list")
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        list: [
          {
            action: "update",
            operator: adminUser.id,
            target: {
              id: commodity.id,
              type: "commodity"
            },
            traceId: "trace-audit-list"
          }
        ],
        pagination: {
          page: 2,
          pageSize: 5,
          total: 7
        }
      },
      message: "ok",
      success: true,
      traceId: "trace-audit-list"
    });
    expectPermissionCheck(["admin"], ["audit:read"]);
    expect(mocks.commodityService.listAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "update",
        createdFrom: "2026-04-29T00:00:00.000Z",
        createdTo: "2026-04-29T23:59:59.999Z",
        operator: adminUser.id,
        page: 2,
        pageSize: 5,
        targetId: commodity.id
      })
    );
  });

  it("rejects audit log access when the logged-in user lacks audit permission", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(operatorUser);
    mocks.permissionService.hasAllPermissionsByRoleCodes.mockResolvedValue(
      false
    );

    const response = await request(app.getHttpServer())
      .get("/api/commodity/audit-logs")
      .set("Cookie", "next_bff_session=session-operator")
      .set("x-trace-id", "trace-audit-forbidden")
      .expect(403);

    expect(response.body).toMatchObject({
      message: "permission denied",
      path: "/api/commodity/audit-logs",
      statusCode: 403,
      success: false,
      traceId: "trace-audit-forbidden"
    });
    expectPermissionCheck(["operator"], ["audit:read"]);
    expect(mocks.commodityService.listAuditLogs).not.toHaveBeenCalled();
  });

  it("rejects audit log access for non-admin users even if audit permission passes", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue({
      ...operatorUser,
      permissions: [...operatorUser.permissions, "audit:read"]
    });
    mocks.permissionService.hasAllPermissionsByRoleCodes.mockResolvedValue(
      true
    );

    const response = await request(app.getHttpServer())
      .get("/api/commodity/audit-logs")
      .set("Cookie", "next_bff_session=session-operator")
      .set("x-trace-id", "trace-audit-admin-only")
      .expect(403);

    expect(response.body).toMatchObject({
      message: "permission denied",
      path: "/api/commodity/audit-logs",
      statusCode: 403,
      success: false,
      traceId: "trace-audit-admin-only"
    });
    expectPermissionCheck(["operator"], ["audit:read"]);
    expect(mocks.commodityService.listAuditLogs).not.toHaveBeenCalled();
  });

  it("rejects invalid audit log query params before entering service", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(adminUser);

    const response = await request(app.getHttpServer())
      .get("/api/commodity/audit-logs")
      .query({
        action: "ship",
        createdFrom: "not-a-date",
        page: "0",
        pageSize: "101"
      })
      .set("Cookie", "next_bff_session=session-admin")
      .set("x-trace-id", "trace-audit-invalid")
      .expect(400);

    expect(response.body).toMatchObject({
      path: "/api/commodity/audit-logs?action=ship&createdFrom=not-a-date&page=0&pageSize=101",
      statusCode: 400,
      success: false,
      traceId: "trace-audit-invalid"
    });
    expect(mocks.commodityService.listAuditLogs).not.toHaveBeenCalled();
  });

  it("rejects audit log query when createdFrom is after createdTo", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(adminUser);

    const response = await request(app.getHttpServer())
      .get("/api/commodity/audit-logs")
      .query({
        createdFrom: "2026-04-30T00:00:00.000Z",
        createdTo: "2026-04-29T00:00:00.000Z"
      })
      .set("Cookie", "next_bff_session=session-admin")
      .set("x-trace-id", "trace-audit-invalid-range")
      .expect(400);

    expect(response.body).toMatchObject({
      message: "createdFrom must be before or equal to createdTo",
      path: "/api/commodity/audit-logs?createdFrom=2026-04-30T00%3A00%3A00.000Z&createdTo=2026-04-29T00%3A00%3A00.000Z",
      statusCode: 400,
      success: false,
      traceId: "trace-audit-invalid-range"
    });
    expect(mocks.commodityService.listAuditLogs).not.toHaveBeenCalled();
  });

  it("rejects commodity creation when the logged-in user lacks permission", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(operatorUser);
    mocks.permissionService.hasAllPermissionsByRoleCodes.mockResolvedValue(
      false
    );
    const csrf = await issueCsrfToken();

    const response = await request(app.getHttpServer())
      .post("/api/commodity/create")
      .set("Cookie", ["next_bff_session=session-operator", csrf.cookie])
      .set(CSRF_HEADER_NAME, csrf.token)
      .set("x-trace-id", "trace-forbidden")
      .send({
        description: "测试商品",
        name: "测试键盘",
        price: 299,
        status: "pending",
        stock: 10
      })
      .expect(403);

    expect(response.body).toMatchObject({
      message: "permission denied",
      path: "/api/commodity/create",
      statusCode: 403,
      success: false,
      traceId: "trace-forbidden"
    });
    expectPermissionCheck(["operator"], ["commodity:create"]);
    expect(mocks.commodityService.createCommodity).not.toHaveBeenCalled();
  });

  it("creates a commodity successfully through Guard, DTO validation and response envelope", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(adminUser);
    mocks.commodityService.createCommodity.mockResolvedValue({
      auditLog: {
        action: "create",
        operator: adminUser.id,
        target: {
          id: commodity.id,
          type: "commodity"
        },
        traceId: "trace-create"
      },
      commodity
    });
    const csrf = await issueCsrfToken();

    const response = await request(app.getHttpServer())
      .post("/api/commodity/create")
      .set("Cookie", ["next_bff_session=session-admin", csrf.cookie])
      .set(CSRF_HEADER_NAME, csrf.token)
      .set("x-trace-id", "trace-create")
      .send({
        description: "测试商品",
        name: "测试键盘",
        price: 299,
        status: "pending",
        stock: 10
      })
      .expect(201);

    expect(response.body).toMatchObject({
      data: {
        commodity: {
          id: "10099",
          name: "测试键盘"
        }
      },
      message: "ok",
      success: true,
      traceId: "trace-create"
    });
    expect(mocks.commodityService.createCommodity).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace-create"
      }),
      adminUser,
      expect.objectContaining({
        name: "测试键盘",
        price: 299,
        status: "pending",
        stock: 10
      })
    );
  });

  it("rejects invalid commodity params before entering service", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(adminUser);
    const csrf = await issueCsrfToken();

    const response = await request(app.getHttpServer())
      .post("/api/commodity/create")
      .set("Cookie", ["next_bff_session=session-admin", csrf.cookie])
      .set(CSRF_HEADER_NAME, csrf.token)
      .set("x-trace-id", "trace-invalid")
      .send({
        description: "",
        extra: "not allowed",
        name: "",
        price: -1,
        status: "unknown",
        stock: -1
      })
      .expect(400);

    expect(response.body).toMatchObject({
      path: "/api/commodity/create",
      statusCode: 400,
      success: false,
      traceId: "trace-invalid"
    });
    expect(response.body.message).toContain("property extra should not exist");
    expect(mocks.commodityService.createCommodity).not.toHaveBeenCalled();
  });

  it("rejects commodity update when the logged-in user lacks permission", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(operatorUser);
    mocks.permissionService.hasAllPermissionsByRoleCodes.mockResolvedValue(
      false
    );
    const csrf = await issueCsrfToken();

    const response = await request(app.getHttpServer())
      .patch("/api/commodity/10099")
      .set("Cookie", ["next_bff_session=session-operator", csrf.cookie])
      .set(CSRF_HEADER_NAME, csrf.token)
      .set("x-trace-id", "trace-update-forbidden")
      .send({
        description: "更新描述",
        name: "测试键盘 Pro",
        price: 399,
        stock: 12
      })
      .expect(403);

    expect(response.body).toMatchObject({
      message: "permission denied",
      path: "/api/commodity/10099",
      statusCode: 403,
      success: false,
      traceId: "trace-update-forbidden"
    });
    expectPermissionCheck(["operator"], ["commodity:update"]);
    expect(mocks.commodityService.updateCommodity).not.toHaveBeenCalled();
  });

  it("updates commodity successfully through Guard, DTO validation and response envelope", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(operatorUser);
    mocks.commodityService.updateCommodity.mockResolvedValue({
      auditLog: {
        action: "update",
        after: {
          name: "测试键盘 Pro",
          price: 399,
          stock: 12
        },
        before: {
          name: "测试键盘",
          price: 299,
          stock: 10
        },
        operator: operatorUser.id,
        target: {
          id: commodity.id,
          type: "commodity"
        },
        traceId: "trace-update"
      },
      commodity: {
        ...commodity,
        name: "测试键盘 Pro",
        price: 399,
        stock: 12
      }
    });
    const csrf = await issueCsrfToken();

    const response = await request(app.getHttpServer())
      .patch("/api/commodity/10099")
      .set("Cookie", ["next_bff_session=session-operator", csrf.cookie])
      .set(CSRF_HEADER_NAME, csrf.token)
      .set("x-trace-id", "trace-update")
      .send({
        description: "更新描述",
        imageFileId: "file_1",
        imageUrl: "/uploads/commodity/file_1.png",
        name: "测试键盘 Pro",
        price: 399,
        stock: 12
      })
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        commodity: {
          id: "10099",
          name: "测试键盘 Pro",
          price: 399,
          stock: 12
        }
      },
      message: "ok",
      success: true,
      traceId: "trace-update"
    });
    expect(mocks.commodityService.updateCommodity).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace-update"
      }),
      operatorUser,
      "10099",
      expect.objectContaining({
        imageFileId: "file_1",
        imageUrl: "/uploads/commodity/file_1.png",
        name: "测试键盘 Pro",
        price: 399,
        stock: 12
      })
    );
  });

  it("rejects invalid commodity update params before entering service", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(adminUser);
    const csrf = await issueCsrfToken();

    const response = await request(app.getHttpServer())
      .patch("/api/commodity/10099")
      .set("Cookie", ["next_bff_session=session-admin", csrf.cookie])
      .set(CSRF_HEADER_NAME, csrf.token)
      .set("x-trace-id", "trace-update-invalid")
      .send({
        description: "更新描述",
        name: "测试键盘",
        price: -1,
        stock: -1
      })
      .expect(400);

    expect(response.body).toMatchObject({
      path: "/api/commodity/10099",
      statusCode: 400,
      success: false,
      traceId: "trace-update-invalid"
    });
    expect(mocks.commodityService.updateCommodity).not.toHaveBeenCalled();
  });

  it("rejects status update without reason before entering service", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(operatorUser);
    const csrf = await issueCsrfToken();

    const response = await request(app.getHttpServer())
      .patch("/api/commodity/10099/status")
      .set("Cookie", ["next_bff_session=session-operator", csrf.cookie])
      .set(CSRF_HEADER_NAME, csrf.token)
      .set("x-trace-id", "trace-status-missing-reason")
      .send({
        reason: "",
        status: "on_sale"
      })
      .expect(400);

    expect(response.body).toMatchObject({
      path: "/api/commodity/10099/status",
      statusCode: 400,
      success: false,
      traceId: "trace-status-missing-reason"
    });
    expect(mocks.commodityService.updateCommodityStatus).not.toHaveBeenCalled();
  });

  it("updates commodity status successfully through Guard, DTO validation and response envelope", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(operatorUser);
    mocks.commodityService.updateCommodityStatus.mockResolvedValue({
      auditLog: {
        action: "status_change",
        after: {
          status: "on_sale"
        },
        before: {
          status: "pending"
        },
        operator: operatorUser.id,
        reason: "审核通过",
        target: {
          id: commodity.id,
          type: "commodity"
        },
        traceId: "trace-status"
      },
      commodity: {
        ...commodity,
        status: "on_sale"
      }
    });
    const csrf = await issueCsrfToken();

    const response = await request(app.getHttpServer())
      .patch("/api/commodity/10099/status")
      .set("Cookie", ["next_bff_session=session-operator", csrf.cookie])
      .set(CSRF_HEADER_NAME, csrf.token)
      .set("x-trace-id", "trace-status")
      .send({
        reason: "审核通过",
        status: "on_sale"
      })
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        auditLog: {
          action: "status_change",
          after: {
            status: "on_sale"
          },
          before: {
            status: "pending"
          },
          operator: operatorUser.id,
          reason: "审核通过"
        },
        commodity: {
          id: "10099",
          status: "on_sale"
        }
      },
      message: "ok",
      success: true,
      traceId: "trace-status"
    });
    expect(mocks.commodityService.updateCommodityStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace-status"
      }),
      operatorUser,
      "10099",
      {
        reason: "审核通过",
        status: "on_sale"
      }
    );
  });

  it("rejects commodity delete without reason before entering service", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(adminUser);
    const csrf = await issueCsrfToken();

    const response = await request(app.getHttpServer())
      .delete("/api/commodity/10099")
      .set("Cookie", ["next_bff_session=session-admin", csrf.cookie])
      .set(CSRF_HEADER_NAME, csrf.token)
      .set("x-trace-id", "trace-delete-missing-reason")
      .send({
        reason: ""
      })
      .expect(400);

    expect(response.body).toMatchObject({
      path: "/api/commodity/10099",
      statusCode: 400,
      success: false,
      traceId: "trace-delete-missing-reason"
    });
    expect(mocks.commodityService.deleteCommodity).not.toHaveBeenCalled();
  });

  it("deletes a commodity with server-side operator and reason", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(adminUser);
    mocks.commodityService.deleteCommodity.mockResolvedValue({
      auditLog: {
        action: "delete",
        operator: adminUser.id,
        reason: "重复创建",
        target: {
          id: commodity.id,
          type: "commodity"
        },
        traceId: "trace-delete"
      },
      commodity: {
        ...commodity,
        deletedAt: "2026-04-29T01:00:00.000Z",
        deletedBy: adminUser.id
      }
    });
    const csrf = await issueCsrfToken();

    const response = await request(app.getHttpServer())
      .delete("/api/commodity/10099")
      .set("Cookie", ["next_bff_session=session-admin", csrf.cookie])
      .set(CSRF_HEADER_NAME, csrf.token)
      .set("x-trace-id", "trace-delete")
      .send({
        reason: "重复创建"
      })
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        auditLog: {
          action: "delete",
          operator: adminUser.id,
          reason: "重复创建"
        },
        commodity: {
          deletedBy: adminUser.id,
          id: "10099"
        }
      },
      message: "ok",
      success: true,
      traceId: "trace-delete"
    });
    expect(mocks.commodityService.deleteCommodity).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace-delete"
      }),
      adminUser,
      "10099",
      {
        reason: "重复创建"
      }
    );
  });

  it("rejects forged audit operator fields on commodity delete", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(adminUser);
    const csrf = await issueCsrfToken();

    const response = await request(app.getHttpServer())
      .delete("/api/commodity/10099")
      .set("Cookie", ["next_bff_session=session-admin", csrf.cookie])
      .set(CSRF_HEADER_NAME, csrf.token)
      .set("x-trace-id", "trace-delete-forged-operator")
      .send({
        operator: "u_attacker",
        reason: "重复创建"
      })
      .expect(400);

    expect(response.body).toMatchObject({
      path: "/api/commodity/10099",
      statusCode: 400,
      success: false,
      traceId: "trace-delete-forged-operator"
    });
    expect(response.body.message).toContain(
      "property operator should not exist"
    );
    expect(mocks.commodityService.deleteCommodity).not.toHaveBeenCalled();
  });

  it("restores a soft deleted commodity with admin permission", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(adminUser);
    mocks.commodityService.restoreCommodity.mockResolvedValue({
      auditLog: {
        action: "restore",
        after: {
          deletedAt: null,
          deletedBy: null
        },
        before: {
          deletedAt: "2026-04-29T01:00:00.000Z",
          deletedBy: adminUser.id
        },
        operator: adminUser.id,
        target: {
          id: commodity.id,
          type: "commodity"
        },
        traceId: "trace-restore"
      },
      commodity: {
        ...commodity,
        deletedAt: null,
        deletedBy: null
      }
    });
    const csrf = await issueCsrfToken();

    const response = await request(app.getHttpServer())
      .patch("/api/commodity/10099/restore")
      .set("Cookie", ["next_bff_session=session-admin", csrf.cookie])
      .set(CSRF_HEADER_NAME, csrf.token)
      .set("x-trace-id", "trace-restore")
      .send({
        reason: "误删恢复"
      })
      .expect(200);

    expect(response.body).toMatchObject({
      data: {
        auditLog: {
          action: "restore",
          after: {
            deletedAt: null,
            deletedBy: null
          },
          before: {
            deletedAt: "2026-04-29T01:00:00.000Z",
            deletedBy: adminUser.id
          }
        },
        commodity: {
          deletedAt: null,
          deletedBy: null,
          id: "10099"
        }
      },
      message: "ok",
      success: true,
      traceId: "trace-restore"
    });
    expectPermissionCheck(["admin"], ["commodity:delete"]);
    expect(mocks.commodityService.restoreCommodity).toHaveBeenCalledWith(
      expect.objectContaining({
        traceId: "trace-restore"
      }),
      adminUser,
      "10099",
      {
        reason: "误删恢复"
      }
    );
  });
});

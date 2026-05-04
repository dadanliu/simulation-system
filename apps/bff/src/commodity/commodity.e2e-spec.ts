import type { INestApplication } from "@nestjs/common";
import request = require("supertest");
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "../common/http/csrf-token";
import type { AuthUser } from "../user/user.types";
import { createBffTestApp, createTestAppMocks, type TestAppMocks } from "../test/app-test-utils";
import type { Commodity } from "./commodity.types";

describe("CommodityController e2e", () => {
  let app: INestApplication;
  let mocks: TestAppMocks;

  const adminUser: AuthUser = {
    id: "u_admin_001",
    roles: ["admin"],
    username: "admin"
  };

  const operatorUser: AuthUser = {
    id: "u_operator_001",
    roles: ["operator"],
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
    mocks.permissionService.hasAllPermissionsByRoleCodes.mockResolvedValue(true);
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
    const response = await request(app.getHttpServer()).get("/api/auth/csrf").expect(200);
    const setCookie = getSetCookies(response).find((value) => value.startsWith(`${CSRF_COOKIE_NAME}=`));

    expect(setCookie).toBeDefined();

    const rawCookie = setCookie!.split(";", 1)[0];
    const token = decodeURIComponent(rawCookie.split("=", 2)[1] ?? "");

    expect(token).not.toBe("");

    return {
      cookie: rawCookie,
      token
    };
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

  it("rejects commodity creation when the logged-in user lacks permission", async () => {
    mocks.getCurrentUserService.execute.mockResolvedValue(operatorUser);
    mocks.permissionService.hasAllPermissionsByRoleCodes.mockResolvedValue(false);
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
    expect(mocks.permissionService.hasAllPermissionsByRoleCodes).toHaveBeenCalledWith(["operator"], ["commodity:create"]);
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
});

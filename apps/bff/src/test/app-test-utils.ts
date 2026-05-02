import { ValidationPipe, type INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { AuthController } from "../auth/auth.controller";
import { AuthGuard } from "../auth/auth.guard";
import { AuthService } from "../auth/auth.service";
import { GetCurrentUserService } from "../auth/get-current-user";
import { CommodityController } from "../commodity/commodity.controller";
import { CommodityService } from "../commodity/commodity.service";
import { HttpExceptionFilter } from "../common/filters/http-exception.filter";
import { traceIdMiddleware } from "../common/http/trace-id";
import { RequestLoggingInterceptor } from "../common/interceptors/request-logging.interceptor";
import { SuccessResponseInterceptor } from "../common/interceptors/success-response.interceptor";
import { PermissionService } from "../permission/permission.service";
import { PermissionsGuard } from "../permission/permissions.guard";

export type TestAppMocks = {
  authService: {
    login: jest.Mock;
    logout: jest.Mock;
  };
  commodityService: {
    createCommodity: jest.Mock;
    deleteCommodity: jest.Mock;
    getCommodity: jest.Mock;
    listAuditLogs: jest.Mock;
    listCommodities: jest.Mock;
    updateCommodityStatus: jest.Mock;
  };
  getCurrentUserService: {
    execute: jest.Mock;
  };
  permissionService: {
    hasAllPermissionsByRoleCodes: jest.Mock;
  };
};

export function createTestAppMocks(): TestAppMocks {
  return {
    authService: {
      login: jest.fn(),
      logout: jest.fn()
    },
    commodityService: {
      createCommodity: jest.fn(),
      deleteCommodity: jest.fn(),
      getCommodity: jest.fn(),
      listAuditLogs: jest.fn(),
      listCommodities: jest.fn(),
      updateCommodityStatus: jest.fn()
    },
    getCurrentUserService: {
      execute: jest.fn()
    },
    permissionService: {
      hasAllPermissionsByRoleCodes: jest.fn()
    }
  };
}

export async function createBffTestApp(mocks: TestAppMocks): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    controllers: [AuthController, CommodityController],
    providers: [
      Reflector,
      AuthGuard,
      PermissionsGuard,
      RequestLoggingInterceptor,
      SuccessResponseInterceptor,
      {
        provide: AuthService,
        useValue: mocks.authService
      },
      {
        provide: CommodityService,
        useValue: mocks.commodityService
      },
      {
        provide: GetCurrentUserService,
        useValue: mocks.getCurrentUserService
      },
      {
        provide: ConfigService,
        useValue: {
          get: jest.fn((key: string) => {
            if (key === "NODE_ENV") {
              return "test";
            }

            return undefined;
          })
        }
      },
      {
        provide: PermissionService,
        useValue: mocks.permissionService
      }
    ]
  }).compile();

  const app = moduleRef.createNestApplication();
  app.use(traceIdMiddleware);
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(app.get(RequestLoggingInterceptor), app.get(SuccessResponseInterceptor));
  await app.init();

  return app;
}

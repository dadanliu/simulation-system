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
import {
  createCsrfOriginMiddleware,
  getConfiguredCsrfAllowedOrigins
} from "../common/http/csrf-origin";
import { traceIdMiddleware } from "../common/http/trace-id";
import { RequestLoggingInterceptor } from "../common/interceptors/request-logging.interceptor";
import { SuccessResponseInterceptor } from "../common/interceptors/success-response.interceptor";
import { PermissionService } from "../permission/permission.service";
import { PermissionsGuard } from "../permission/permissions.guard";

export type TestAppMocks = {
  authService: {
    getSessionTtlSeconds: jest.Mock;
    listLoginLogs: jest.Mock;
    listUserSessions: jest.Mock;
    login: jest.Mock;
    logout: jest.Mock;
  };
  commodityService: {
    createCommodity: jest.Mock;
    deleteCommodity: jest.Mock;
    getCommodity: jest.Mock;
    listAuditLogs: jest.Mock;
    listCommodities: jest.Mock;
    restoreCommodity: jest.Mock;
    updateCommodity: jest.Mock;
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
      getSessionTtlSeconds: jest.fn().mockReturnValue(86400),
      listLoginLogs: jest.fn(),
      listUserSessions: jest.fn(),
      login: jest.fn(),
      logout: jest.fn()
    },
    commodityService: {
      createCommodity: jest.fn(),
      deleteCommodity: jest.fn(),
      getCommodity: jest.fn(),
      listAuditLogs: jest.fn(),
      listCommodities: jest.fn(),
      restoreCommodity: jest.fn(),
      updateCommodity: jest.fn(),
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

type CreateBffTestAppOptions = {
  config?: Record<string, string | undefined>;
};

export async function createBffTestApp(
  mocks: TestAppMocks,
  options: CreateBffTestAppOptions = {}
): Promise<INestApplication> {
  const config = options.config ?? {};
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
            if (Object.prototype.hasOwnProperty.call(config, key)) {
              return config[key];
            }

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
  app.use(createCsrfOriginMiddleware(getConfiguredCsrfAllowedOrigins()));
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    app.get(RequestLoggingInterceptor),
    app.get(SuccessResponseInterceptor)
  );
  await app.init();

  return app;
}

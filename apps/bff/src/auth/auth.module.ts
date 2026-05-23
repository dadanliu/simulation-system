import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import {
  PermissionEntity,
  PermissionSchema
} from "../permission/schemas/permission.schema";
import { PermissionService } from "../permission/permission.service";
import { PermissionsGuard } from "../permission/permissions.guard";
import { RoleEntity, RoleSchema } from "../role/schemas/role.schema";
import { UserModule } from "../user/user.module";
import { UserEntity, UserSchema } from "../user/schemas/user.schema";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { GetCurrentUserService } from "./get-current-user";
import { LoginAuditLogService } from "./login-audit-log.service";
import { LoginRiskDailyStatCronService } from "./login-risk-daily-stat-cron.service";
import { LoginRiskDailyStatService } from "./login-risk-daily-stat.service";
import { LoginRiskService } from "./login-risk.service";
import { RbacSeedService } from "./rbac-seed.service";
import {
  LoginAuditLogEntity,
  LoginAuditLogSchema
} from "./schemas/login-audit-log.schema";
import {
  LoginRiskDailyStatEntity,
  LoginRiskDailyStatSchema
} from "./schemas/login-risk-daily-stat.schema";
import { SessionStoreService } from "./session-store.service";

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => UserModule),
    MongooseModule.forFeature([
      { name: UserEntity.name, schema: UserSchema },
      { name: RoleEntity.name, schema: RoleSchema },
      { name: PermissionEntity.name, schema: PermissionSchema },
      { name: LoginAuditLogEntity.name, schema: LoginAuditLogSchema },
      {
        name: LoginRiskDailyStatEntity.name,
        schema: LoginRiskDailyStatSchema
      }
    ])
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionStoreService,
    LoginRiskService,
    LoginAuditLogService,
    LoginRiskDailyStatService,
    LoginRiskDailyStatCronService,
    GetCurrentUserService,
    AuthGuard,
    PermissionService,
    PermissionsGuard,
    RbacSeedService
  ],
  exports: [GetCurrentUserService, AuthGuard, RbacSeedService]
})
export class AuthModule {}

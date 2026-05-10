import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import { BffModule } from "../bff/bff.module";
import { PermissionModule } from "../permission/permission.module";
import { RoleModule } from "../role/role.module";
import { UploadModule } from "../upload/upload.module";
import { AuditLogService } from "./audit-log.service";
import { CommodityCacheService } from "./commodity-cache.service";
import { CommodityController } from "./commodity.controller";
import { CommodityService } from "./commodity.service";
import { AuditLogEntity, AuditLogSchema } from "./schemas/audit-log.schema";

@Module({
  imports: [
    AuthModule,
    BffModule,
    PermissionModule,
    RoleModule,
    UploadModule,
    MongooseModule.forFeature([
      { name: AuditLogEntity.name, schema: AuditLogSchema }
    ])
  ],
  controllers: [CommodityController],
  providers: [AuditLogService, CommodityCacheService, CommodityService]
})
export class CommodityModule {}

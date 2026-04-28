import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MongooseModule } from "@nestjs/mongoose";
import { RoleModule } from "../role/role.module";
import { PermissionController } from "./permission.controller";
import { PermissionsGuard } from "./permissions.guard";
import { PermissionService } from "./permission.service";
import { PermissionEntity, PermissionSchema } from "./schemas/permission.schema";
import { RoleEntity, RoleSchema } from "../role/schemas/role.schema";

@Module({
  imports: [
    AuthModule,
    RoleModule,
    MongooseModule.forFeature([
      { name: PermissionEntity.name, schema: PermissionSchema },
      { name: RoleEntity.name, schema: RoleSchema }
    ])
  ],
  controllers: [PermissionController],
  providers: [PermissionService, PermissionsGuard],
  exports: [PermissionService, PermissionsGuard]
})
export class PermissionModule {}

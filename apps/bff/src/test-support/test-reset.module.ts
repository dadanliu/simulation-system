import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "../auth/auth.module";
import {
  LoginAuditLogEntity,
  LoginAuditLogSchema
} from "../auth/schemas/login-audit-log.schema";
import {
  LoginRiskDailyStatEntity,
  LoginRiskDailyStatSchema
} from "../auth/schemas/login-risk-daily-stat.schema";
import {
  AuditLogEntity,
  AuditLogSchema
} from "../commodity/schemas/audit-log.schema";
import { TestResetController } from "./test-reset.controller";
import { TestResetService } from "./test-reset.service";

@Module({
  imports: [
    AuthModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: AuditLogEntity.name, schema: AuditLogSchema },
      { name: LoginAuditLogEntity.name, schema: LoginAuditLogSchema },
      {
        name: LoginRiskDailyStatEntity.name,
        schema: LoginRiskDailyStatSchema
      }
    ])
  ],
  controllers: [TestResetController],
  providers: [TestResetService]
})
export class TestResetModule {}

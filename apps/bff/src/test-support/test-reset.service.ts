import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { RbacSeedService } from "../auth/rbac-seed.service";
import {
  LoginAuditLogEntity,
  type LoginAuditLogDocument
} from "../auth/schemas/login-audit-log.schema";
import {
  AuditLogEntity,
  type AuditLogDocument
} from "../commodity/schemas/audit-log.schema";

@Injectable()
export class TestResetService {
  constructor(
    @InjectModel(AuditLogEntity.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    @InjectModel(LoginAuditLogEntity.name)
    private readonly loginAuditLogModel: Model<LoginAuditLogDocument>,
    private readonly configService: ConfigService,
    private readonly rbacSeedService: RbacSeedService
  ) {}

  async reset() {
    await Promise.all([
      this.auditLogModel.deleteMany({}),
      this.loginAuditLogModel.deleteMany({}),
      this.rbacSeedService.resetForTest()
    ]);
    await this.resetMockBackend();
  }

  private async resetMockBackend() {
    const backendBaseUrl =
      this.configService.getOrThrow<string>("BACKEND_BASE_URL");
    const response = await fetch(`${backendBaseUrl}/api/test/reset`, {
      method: "POST"
    });

    if (!response.ok) {
      throw new InternalServerErrorException(
        "mock backend test data reset failed"
      );
    }
  }
}

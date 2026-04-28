import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { Commodity } from "./commodity.types";
import { AuditLogEntity, type AuditLogDocument } from "./schemas/audit-log.schema";

type AuditLogRecord = {
  action: string;
  after: Record<string, unknown> | null;
  before: Record<string, unknown> | null;
  createdAt: string;
  operator: string;
  reason: string | null;
  target: {
    id: string;
    type: "commodity";
  };
  traceId: string;
};

@Injectable()
export class AuditLogService {
  constructor(@InjectModel(AuditLogEntity.name) private readonly auditLogModel: Model<AuditLogDocument>) {}

  recordCommodityCreate(operator: string, commodity: Commodity, traceId: string) {
    return this.createAuditLog({
      action: "create",
      after: {
        name: commodity.name,
        price: commodity.price,
        status: commodity.status,
        stock: commodity.stock
      },
      before: null,
      operator,
      resourceId: commodity.id,
      reason: null,
      traceId
    });
  }

  recordCommodityDelete(operator: string, commodityId: string, traceId: string) {
    return this.createAuditLog({
      action: "delete",
      after: {
        deletedBy: operator
      },
      before: null,
      operator,
      resourceId: commodityId,
      reason: null,
      traceId
    });
  }

  recordCommodityStatusChange(
    operator: string,
    commodityId: string,
    beforeStatus: string,
    afterStatus: string,
    reason: string,
    traceId: string
  ) {
    return this.createAuditLog({
      action: "status_change",
      after: {
        status: afterStatus
      },
      before: {
        status: beforeStatus
      },
      operator,
      reason,
      resourceId: commodityId,
      traceId
    });
  }

  async listLogs() {
    const logs = await this.auditLogModel.find().sort({ createdAt: -1 }).lean();
    return logs.map((log) => this.toRecord(log));
  }

  async listCommodityLogs() {
    const logs = await this.auditLogModel.find({ resourceType: "commodity" }).sort({ createdAt: -1 }).lean();
    return logs.map((log) => this.toRecord(log));
  }

  private async createAuditLog(input: {
    action: string;
    after: Record<string, unknown> | null;
    before: Record<string, unknown> | null;
    operator: string;
    reason: string | null;
    resourceId: string;
    traceId: string;
  }) {
    const log = await this.auditLogModel.create({
      action: input.action,
      after: input.after,
      before: input.before,
      createdAt: new Date(),
      operator: input.operator,
      reason: input.reason,
      resourceId: input.resourceId,
      resourceType: "commodity",
      traceId: input.traceId
    });

    return this.toRecord(log.toObject());
  }

  private toRecord(log: {
    action: string;
    after: Record<string, unknown> | null;
    before: Record<string, unknown> | null;
    createdAt: Date | string;
    operator: string;
    reason: string | null;
    resourceId: string;
    resourceType: string;
    traceId: string;
  }): AuditLogRecord {
    return {
      action: log.action,
      after: log.after,
      before: log.before,
      createdAt: new Date(log.createdAt).toISOString(),
      operator: log.operator,
      reason: log.reason,
      target: {
        id: log.resourceId,
        type: log.resourceType as "commodity"
      },
      traceId: log.traceId
    };
  }
}

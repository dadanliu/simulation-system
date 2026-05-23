import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import type { Commodity } from "./commodity.types";
import type { QueryAuditLogDto } from "./dto/query-audit-log.dto";
import {
  AuditLogEntity,
  type AuditLogDocument
} from "./schemas/audit-log.schema";

export type AuditLogRecord = {
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
  constructor(
    @InjectModel(AuditLogEntity.name)
    private readonly auditLogModel: Model<AuditLogDocument>
  ) {}

  recordCommodityCreate(
    operator: string,
    commodity: Commodity,
    traceId: string
  ) {
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

  recordCommodityDelete(
    operator: string,
    commodityId: string,
    before: Commodity,
    after: Commodity,
    reason: string,
    traceId: string
  ) {
    return this.createAuditLog({
      action: "delete",
      after: this.pickDeletionFields(after),
      before: this.pickDeletionFields(before),
      operator,
      resourceId: commodityId,
      reason,
      traceId
    });
  }

  recordCommodityRestore(
    operator: string,
    commodityId: string,
    before: Commodity,
    after: Commodity,
    reason: string,
    traceId: string
  ) {
    return this.createAuditLog({
      action: "restore",
      after: this.pickDeletionFields(after),
      before: this.pickDeletionFields(before),
      operator,
      resourceId: commodityId,
      reason,
      traceId
    });
  }

  recordCommodityUpdate(
    operator: string,
    commodityId: string,
    before: Commodity,
    after: Commodity,
    traceId: string
  ) {
    return this.createAuditLog({
      action: "update",
      after: this.pickEditableFields(after),
      before: this.pickEditableFields(before),
      operator,
      reason: null,
      resourceId: commodityId,
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

  async listCommodityLogs(query: QueryAuditLogDto) {
    const page = query.page;
    const pageSize = query.pageSize;
    const filters: Record<string, unknown> = {
      resourceType: "commodity"
    };

    if (query.operator?.trim()) {
      filters.operator = query.operator.trim();
    }

    if (query.action) {
      filters.action = query.action;
    }

    if (query.targetId?.trim()) {
      filters.resourceId = query.targetId.trim();
    }

    if (query.createdFrom || query.createdTo) {
      const createdAt: Record<string, Date> = {};

      if (query.createdFrom) {
        createdAt.$gte = new Date(query.createdFrom);
      }

      if (query.createdTo) {
        createdAt.$lte = new Date(query.createdTo);
      }

      filters.createdAt = createdAt;
    }

    const [logs, total] = await Promise.all([
      this.auditLogModel
        .find(filters)
        .sort({ createdAt: -1, resourceId: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.auditLogModel.countDocuments(filters)
    ]);

    return {
      list: logs.map((log) => this.toRecord(log)),
      pagination: {
        page,
        pageSize,
        total
      }
    };
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

  private pickEditableFields(commodity: Commodity) {
    return {
      description: commodity.description,
      imageFileId: commodity.imageFileId,
      imageUrl: commodity.imageUrl,
      name: commodity.name,
      price: commodity.price,
      stock: commodity.stock
    };
  }

  private pickDeletionFields(commodity: Commodity) {
    return {
      deletedAt: commodity.deletedAt,
      deletedBy: commodity.deletedBy,
      name: commodity.name,
      status: commodity.status
    };
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

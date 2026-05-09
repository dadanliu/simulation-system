import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { QueryLoginAuditLogDto } from "./dto/query-login-audit-log.dto";
import {
  LoginAuditLogEntity,
  type LoginAuditLogDocument
} from "./schemas/login-audit-log.schema";

type LoginAuditContext = {
  ip?: string;
  traceId?: string;
  userAgent?: string;
};

type LoginAuditOutcome = "blocked" | "failure" | "success";

@Injectable()
export class LoginAuditLogService {
  constructor(
    @InjectModel(LoginAuditLogEntity.name)
    private readonly loginAuditLogModel: Model<LoginAuditLogDocument>
  ) {}

  recordSuccess(username: string, userId: string, context: LoginAuditContext) {
    return this.createLog(username, userId, "success", context, null);
  }

  recordFailure(username: string, context: LoginAuditContext) {
    return this.createLog(
      username,
      null,
      "failure",
      context,
      "invalid_credentials"
    );
  }

  recordBlocked(username: string, context: LoginAuditContext) {
    return this.createLog(username, null, "blocked", context, "rate_limited");
  }

  async listLogs(query: QueryLoginAuditLogDto) {
    const page = query.page;
    const pageSize = query.pageSize;
    const filters: Record<string, unknown> = {};

    if (query.username?.trim()) {
      filters.username = query.username.trim().toLowerCase();
    }

    if (query.userId?.trim()) {
      filters.userId = query.userId.trim();
    }

    if (query.outcome) {
      filters.outcome = query.outcome;
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
      this.loginAuditLogModel
        .find(filters)
        .sort({ createdAt: -1, username: 1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.loginAuditLogModel.countDocuments(filters)
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

  private async createLog(
    username: string,
    userId: string | null,
    outcome: LoginAuditOutcome,
    context: LoginAuditContext,
    reason: string | null
  ) {
    const log = await this.loginAuditLogModel.create({
      createdAt: new Date(),
      ip: context.ip?.trim() || "unknown",
      outcome,
      reason,
      traceId: context.traceId?.trim() || "",
      userAgent: context.userAgent?.trim() || "unknown",
      userId,
      username: username.trim().toLowerCase()
    });

    return this.toRecord(log.toObject());
  }

  private toRecord(log: {
    createdAt: Date | string;
    ip: string;
    outcome: LoginAuditOutcome;
    reason: string | null;
    traceId: string;
    userAgent: string;
    userId: string | null;
    username: string;
  }) {
    return {
      createdAt: new Date(log.createdAt).toISOString(),
      ip: log.ip,
      outcome: log.outcome,
      reason: log.reason,
      traceId: log.traceId,
      userAgent: log.userAgent,
      userId: log.userId,
      username: log.username
    };
  }
}

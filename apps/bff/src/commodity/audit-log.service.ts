import { Injectable } from "@nestjs/common";

type AuditLogRecord = {
  action: string;
  after?: unknown;
  before?: unknown;
  reason?: string;
  resourceId: string;
  resourceType: string;
  timestamp: string;
  userId: string;
};

@Injectable()
export class AuditLogService {
  private readonly logs: AuditLogRecord[] = [];

  recordCommodityDelete(userId: string, commodityId: string) {
    const log: AuditLogRecord = {
      action: "delete",
      resourceId: commodityId,
      resourceType: "commodity",
      timestamp: new Date().toISOString(),
      userId
    };

    this.logs.push(log);
    return log;
  }

  recordCommodityStatusChange(
    userId: string,
    commodityId: string,
    beforeStatus: string,
    afterStatus: string,
    reason: string
  ) {
    const log: AuditLogRecord = {
      action: "status_change",
      after: {
        status: afterStatus
      },
      before: {
        status: beforeStatus
      },
      reason,
      resourceId: commodityId,
      resourceType: "commodity",
      timestamp: new Date().toISOString(),
      userId
    };

    this.logs.push(log);
    return log;
  }

  listLogs() {
    return this.logs;
  }
}

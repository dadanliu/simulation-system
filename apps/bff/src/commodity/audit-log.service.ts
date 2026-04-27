import { Injectable } from "@nestjs/common";

type AuditLogRecord = {
  action: string;
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

  listLogs() {
    return this.logs;
  }
}

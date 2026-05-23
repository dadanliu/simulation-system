import type { AuditLogRecord } from "./audit-log.service";
import type { Commodity } from "./commodity.types";

export const COMMODITY_EVENTS = {
  created: "commodity.created",
  deleted: "commodity.deleted",
  restored: "commodity.restored",
  statusChanged: "commodity.status_changed",
  updated: "commodity.updated"
} as const;

type CommodityEventBase = {
  operatorId: string;
  traceId: string;
};

export class CommodityCreatedEvent {
  constructor(
    readonly payload: CommodityEventBase & {
      commodity: Commodity;
    }
  ) {}
}

export class CommodityDeletedEvent {
  constructor(
    readonly payload: CommodityEventBase & {
      after: Commodity;
      before: Commodity;
      commodityId: string;
      reason: string;
    }
  ) {}
}

export class CommodityRestoredEvent {
  constructor(
    readonly payload: CommodityEventBase & {
      after: Commodity;
      before: Commodity;
      commodityId: string;
      reason: string;
    }
  ) {}
}

export class CommodityUpdatedEvent {
  constructor(
    readonly payload: CommodityEventBase & {
      after: Commodity;
      before: Commodity;
      commodityId: string;
    }
  ) {}
}

export class CommodityStatusChangedEvent {
  constructor(
    readonly payload: CommodityEventBase & {
      after: Commodity;
      before: Commodity;
      commodityId: string;
      reason: string;
    }
  ) {}
}

export type CommodityDomainEvent =
  | CommodityCreatedEvent
  | CommodityDeletedEvent
  | CommodityRestoredEvent
  | CommodityStatusChangedEvent
  | CommodityUpdatedEvent;

export type CommodityAuditEventResult = {
  auditLog: AuditLogRecord;
  kind: "commodityAuditLog";
};

export function createCommodityAuditEventResult(
  auditLog: AuditLogRecord
): CommodityAuditEventResult {
  return {
    auditLog,
    kind: "commodityAuditLog"
  };
}

export function isCommodityAuditEventResult(
  value: unknown
): value is CommodityAuditEventResult {
  return (
    typeof value === "object" &&
    value !== null &&
    "kind" in value &&
    value.kind === "commodityAuditLog" &&
    "auditLog" in value
  );
}

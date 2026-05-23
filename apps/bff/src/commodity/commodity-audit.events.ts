import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { AuditLogService } from "./audit-log.service";
import {
  COMMODITY_EVENTS,
  CommodityCreatedEvent,
  CommodityDeletedEvent,
  CommodityRestoredEvent,
  CommodityStatusChangedEvent,
  CommodityUpdatedEvent,
  createCommodityAuditEventResult
} from "./commodity.events";

@Injectable()
export class CommodityAuditEventHandler {
  constructor(private readonly auditLogService: AuditLogService) {}

  @OnEvent(COMMODITY_EVENTS.created)
  async handleCommodityCreated(event: CommodityCreatedEvent) {
    return createCommodityAuditEventResult(
      await this.auditLogService.recordCommodityCreate(
        event.payload.operatorId,
        event.payload.commodity,
        event.payload.traceId
      )
    );
  }

  @OnEvent(COMMODITY_EVENTS.deleted)
  async handleCommodityDeleted(event: CommodityDeletedEvent) {
    return createCommodityAuditEventResult(
      await this.auditLogService.recordCommodityDelete(
        event.payload.operatorId,
        event.payload.commodityId,
        event.payload.before,
        event.payload.after,
        event.payload.reason,
        event.payload.traceId
      )
    );
  }

  @OnEvent(COMMODITY_EVENTS.restored)
  async handleCommodityRestored(event: CommodityRestoredEvent) {
    return createCommodityAuditEventResult(
      await this.auditLogService.recordCommodityRestore(
        event.payload.operatorId,
        event.payload.commodityId,
        event.payload.before,
        event.payload.after,
        event.payload.reason,
        event.payload.traceId
      )
    );
  }

  @OnEvent(COMMODITY_EVENTS.updated)
  async handleCommodityUpdated(event: CommodityUpdatedEvent) {
    return createCommodityAuditEventResult(
      await this.auditLogService.recordCommodityUpdate(
        event.payload.operatorId,
        event.payload.commodityId,
        event.payload.before,
        event.payload.after,
        event.payload.traceId
      )
    );
  }

  @OnEvent(COMMODITY_EVENTS.statusChanged)
  async handleCommodityStatusChanged(event: CommodityStatusChangedEvent) {
    return createCommodityAuditEventResult(
      await this.auditLogService.recordCommodityStatusChange(
        event.payload.operatorId,
        event.payload.commodityId,
        event.payload.before.status,
        event.payload.after.status,
        event.payload.reason,
        event.payload.traceId
      )
    );
  }
}

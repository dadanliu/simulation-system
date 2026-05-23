import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  getErrorLogFields,
  writeStructuredLog
} from "../common/logging/structured-log";
import { CommodityCacheService } from "./commodity-cache.service";
import {
  COMMODITY_EVENTS,
  type CommodityDomainEvent
} from "./commodity.events";

@Injectable()
export class CommodityCacheEventHandler {
  constructor(private readonly commodityCacheService: CommodityCacheService) {}

  @OnEvent(COMMODITY_EVENTS.created)
  async handleCommodityCreated(event: CommodityDomainEvent) {
    await this.invalidateCommodityList(event, COMMODITY_EVENTS.created);
  }

  @OnEvent(COMMODITY_EVENTS.deleted)
  async handleCommodityDeleted(event: CommodityDomainEvent) {
    await this.invalidateCommodityList(event, COMMODITY_EVENTS.deleted);
  }

  @OnEvent(COMMODITY_EVENTS.restored)
  async handleCommodityRestored(event: CommodityDomainEvent) {
    await this.invalidateCommodityList(event, COMMODITY_EVENTS.restored);
  }

  @OnEvent(COMMODITY_EVENTS.updated)
  async handleCommodityUpdated(event: CommodityDomainEvent) {
    await this.invalidateCommodityList(event, COMMODITY_EVENTS.updated);
  }

  @OnEvent(COMMODITY_EVENTS.statusChanged)
  async handleCommodityStatusChanged(event: CommodityDomainEvent) {
    await this.invalidateCommodityList(event, COMMODITY_EVENTS.statusChanged);
  }

  private async invalidateCommodityList(
    event: CommodityDomainEvent,
    eventName: string
  ) {
    try {
      await this.commodityCacheService.invalidateCommodityList();
    } catch (error) {
      writeStructuredLog({
        context: CommodityCacheEventHandler.name,
        event: "commodity_list_cache_invalidation_failed",
        fields: {
          ...getErrorLogFields(error as Error),
          commodityEvent: eventName,
          traceId: event.payload.traceId
        },
        level: "error",
        message:
          "Commodity list cache invalidation failed after commodity mutation."
      });
    }
  }
}

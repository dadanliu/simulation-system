import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  COMMODITY_EVENTS,
  type CommodityDomainEvent
} from "./commodity.events";

@Injectable()
export class CommoditySearchIndexEventHandler {
  @OnEvent(COMMODITY_EVENTS.created)
  @OnEvent(COMMODITY_EVENTS.deleted)
  @OnEvent(COMMODITY_EVENTS.restored)
  @OnEvent(COMMODITY_EVENTS.updated)
  @OnEvent(COMMODITY_EVENTS.statusChanged)
  handleCommodityMutation(_event: CommodityDomainEvent) {
    // Reserved hook: index updates should be retried or sent to a queue once a search service exists.
  }
}

@Injectable()
export class CommodityNotificationEventHandler {
  @OnEvent(COMMODITY_EVENTS.created)
  @OnEvent(COMMODITY_EVENTS.deleted)
  @OnEvent(COMMODITY_EVENTS.restored)
  @OnEvent(COMMODITY_EVENTS.updated)
  @OnEvent(COMMODITY_EVENTS.statusChanged)
  handleCommodityMutation(_event: CommodityDomainEvent) {
    // Reserved hook: notifications should not block commodity writes unless product rules require it.
  }
}

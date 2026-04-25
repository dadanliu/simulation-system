import { Controller, Get, Param, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { CommodityService } from "./commodity.service";
import type { CommodityListQuery } from "./commodity.types";

@Controller("api/commodity")
export class CommodityController {
  constructor(private readonly commodityService: CommodityService) {}

  @Get("list")
  async listCommodities(@Req() request: Request, @Query() query: CommodityListQuery) {
    const data = await this.commodityService.listCommodities(request, query);

    return {
      success: true,
      data
    };
  }

  @Get(":id")
  async getCommodity(@Req() request: Request, @Param("id") id: string) {
    const data = await this.commodityService.getCommodity(request, id);

    return {
      success: true,
      data
    };
  }
}

import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { BffModule } from "../bff/bff.module";
import { CommodityController } from "./commodity.controller";
import { CommodityService } from "./commodity.service";

@Module({
  imports: [AuthModule, BffModule],
  controllers: [CommodityController],
  providers: [CommodityService]
})
export class CommodityModule {}

import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { BffModule } from "./bff/bff.module";
import { CommodityModule } from "./commodity/commodity.module";
import { UploadModule } from "./upload/upload.module";

@Module({
  imports: [AuthModule, BffModule, CommodityModule, UploadModule],
  controllers: [AppController]
})
export class AppModule {}

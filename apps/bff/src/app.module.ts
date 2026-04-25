import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AuthModule } from "./auth/auth.module";
import { BffModule } from "./bff/bff.module";

@Module({
  imports: [AuthModule, BffModule],
  controllers: [AppController]
})
export class AppModule {}

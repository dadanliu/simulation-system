import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "../auth/auth.module";
import { BffThrottlerGuard } from "./bff-throttler.guard";
import { createBffThrottlerOptions } from "./rate-limit.config";

@Module({
  imports: [AuthModule, ThrottlerModule.forRoot(createBffThrottlerOptions())],
  providers: [
    {
      provide: APP_GUARD,
      useClass: BffThrottlerGuard
    }
  ]
})
export class RateLimitModule {}

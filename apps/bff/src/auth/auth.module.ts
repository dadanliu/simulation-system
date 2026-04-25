import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { SessionStoreService } from "./session-store.service";
import { GetCurrentUserService } from "./get-current-user";

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionStoreService, GetCurrentUserService, AuthGuard],
  exports: [GetCurrentUserService, AuthGuard]
})
export class AuthModule {}

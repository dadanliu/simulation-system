import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { SessionStoreService } from "./session-store.service";
import { GetCurrentUserService } from "./get-current-user";
import { RequireLoginService } from "./require-login";

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionStoreService, GetCurrentUserService, RequireLoginService],
  exports: [GetCurrentUserService, RequireLoginService]
})
export class AuthModule {}

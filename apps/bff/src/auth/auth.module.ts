import { Module, forwardRef } from "@nestjs/common";
import { UserModule } from "../user/user.module";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { GetCurrentUserService } from "./get-current-user";
import { SessionStoreService } from "./session-store.service";

@Module({
  imports: [forwardRef(() => UserModule)],
  controllers: [AuthController],
  providers: [AuthService, SessionStoreService, GetCurrentUserService, AuthGuard],
  exports: [GetCurrentUserService, AuthGuard]
})
export class AuthModule {}

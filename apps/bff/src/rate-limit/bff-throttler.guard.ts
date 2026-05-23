import { Injectable, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
  type ThrottlerModuleOptions,
  type ThrottlerStorage
} from "@nestjs/throttler";
import type { AuthenticatedRequest } from "../auth/auth-request";
import { GetCurrentUserService } from "../auth/get-current-user";
import { shouldResolveCurrentUserForRateLimit } from "./rate-limit.config";

@Injectable()
export class BffThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions()
    options: ThrottlerModuleOptions,
    @InjectThrottlerStorage()
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly getCurrentUserService: GetCurrentUserService
  ) {
    super(options, storageService, reflector);
  }

  async canActivate(context: ExecutionContext) {
    await this.attachCurrentUserForScopedLimits(context);

    return super.canActivate(context);
  }

  private async attachCurrentUserForScopedLimits(context: ExecutionContext) {
    if (!shouldResolveCurrentUserForRateLimit(context)) {
      return;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.currentUser) {
      return;
    }

    const user = await this.getCurrentUserService.execute(request);

    if (user) {
      request.currentUser = user;
    }
  }
}

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GetCurrentUserService } from "./get-current-user";
import type { AuthenticatedRequest } from "./auth-request";
import { isPublicRoute } from "./public.decorator";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly getCurrentUserService: GetCurrentUserService
  ) {}

  async canActivate(context: ExecutionContext) {
    if (isPublicRoute(this.reflector, context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (request.currentUser) {
      return true;
    }

    const user = await this.getCurrentUserService.execute(request);

    if (!user) {
      throw new UnauthorizedException("Unauthorized");
    }

    request.currentUser = user;
    return true;
  }
}

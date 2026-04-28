import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { GetCurrentUserService } from "./get-current-user";
import type { AuthenticatedRequest } from "./auth-request";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly getCurrentUserService: GetCurrentUserService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = await this.getCurrentUserService.execute(request);

    if (!user) {
      throw new UnauthorizedException("Unauthorized");
    }

    request.currentUser = user;
    return true;
  }
}

import { Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { GetCurrentUserService } from "./get-current-user";

@Injectable()
export class RequireLoginService {
  constructor(private readonly getCurrentUserService: GetCurrentUserService) {}

  execute(request: Request) {
    const user = this.getCurrentUserService.execute(request);

    if (!user) {
      throw new UnauthorizedException("Unauthorized");
    }

    return user;
  }
}

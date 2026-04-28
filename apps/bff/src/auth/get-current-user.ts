import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import { UserService } from "../user/user.service";
import { getSessionIdFromRequest } from "./session-cookie";
import { SessionStoreService } from "./session-store.service";

@Injectable()
export class GetCurrentUserService {
  constructor(
    private readonly sessionStoreService: SessionStoreService,
    private readonly userService: UserService
  ) {}

  async execute(request: Request) {
    const sessionId = getSessionIdFromRequest(request);
    const session = this.sessionStoreService.getSession(sessionId);

    if (!session) {
      return null;
    }

    return this.userService.findAuthUserById(session.userId);
  }
}

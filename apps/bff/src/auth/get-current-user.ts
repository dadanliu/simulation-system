import { Injectable } from "@nestjs/common";
import type { Request } from "express";
import { getSessionIdFromRequest } from "./session-cookie";
import { SessionStoreService } from "./session-store.service";

@Injectable()
export class GetCurrentUserService {
  constructor(private readonly sessionStoreService: SessionStoreService) {}

  execute(request: Request) {
    const sessionId = getSessionIdFromRequest(request);
    const session = this.sessionStoreService.getSession(sessionId);
    return session?.user ?? null;
  }
}

import type { Request } from "express";
import type { AuthUser } from "../user/user.types";

export type AuthenticatedRequest = Request & {
  currentUser?: AuthUser;
  traceId?: string;
};

import type { Request } from "express";
import type { AuthUser } from "./mock-users";

export type AuthenticatedRequest = Request & {
  currentUser?: AuthUser;
};

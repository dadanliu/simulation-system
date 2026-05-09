import { serverApiRequest } from "@/src/lib/server-api";
import type { CurrentUser } from "./types";

export async function getCurrentUser(
  nextPath = "/present/commodity/list"
): Promise<CurrentUser> {
  const { data } = await serverApiRequest<{ user: CurrentUser }>(
    "/api/auth/me",
    {
      fallbackMessage: "当前用户信息加载失败",
      nextPathOnUnauthorized: nextPath
    }
  );

  return data.user;
}

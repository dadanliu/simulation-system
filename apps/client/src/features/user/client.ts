import { clientApiRequest } from "../auth/client";
import type { CreateUserInput, User } from "./types";

export async function createUser(input: CreateUserInput) {
  const { data } = await clientApiRequest<User>(
    "/api/users",
    {
      body: JSON.stringify(input),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    },
    {
      fallbackMessage: "创建用户失败",
      source: "createUser"
    }
  );

  return data;
}

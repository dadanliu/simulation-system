import type { CreateUserInput, User } from "./types";

type ApiResponse<T> = {
  data?: T;
  message?: string;
  success: boolean;
};

export async function createUser(input: CreateUserInput) {
  const response = await fetch("/api/users", {
    body: JSON.stringify(input),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });
  const payload = (await response.json().catch(() => null)) as ApiResponse<User> | null;

  if (!response.ok || !payload?.success || !payload.data) {
    throw new Error(payload?.message ?? "创建用户失败");
  }

  return payload.data;
}

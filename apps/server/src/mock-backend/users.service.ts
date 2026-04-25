import { Injectable } from "@nestjs/common";
import { mockBusinessError, mockSuccess } from "./mock-response";

export type MockUser = {
  id: string;
  username: string;
  name: string;
  role: "admin" | "operator";
};

const mockUsers: MockUser[] = [
  {
    id: "u_admin_001",
    username: "admin",
    name: "Admin User",
    role: "admin"
  },
  {
    id: "u_operator_001",
    username: "operator",
    name: "Operator User",
    role: "operator"
  }
];

@Injectable()
export class UsersService {
  listUsers() {
    return mockSuccess(mockUsers);
  }

  getUserById(id: string) {
    const user = mockUsers.find((item) => item.id === id);

    if (!user) {
      return mockBusinessError(10001, "user not found");
    }

    return mockSuccess(user);
  }
}

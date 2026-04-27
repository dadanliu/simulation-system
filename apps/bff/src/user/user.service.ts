import { Injectable, NotFoundException } from "@nestjs/common";
import { RoleService } from "../role/role.service";
import { mockUsers } from "./mock-users";
import type { AuthUser, User, UserRecord } from "./user.types";

type CreateUserBody = Omit<UserRecord, "id"> & {
  id?: string;
};

@Injectable()
export class UserService {
  private readonly users = mockUsers;

  constructor(private readonly roleService: RoleService) {}

  listUsers() {
    return this.users.map((user) => this.toSafeUser(user));
  }

  getUser(id: string) {
    const user = this.users.find((item) => item.id === id);
    return user ? this.toSafeUser(user) : null;
  }

  createUser(body: CreateUserBody) {
    this.roleService.assertRoleCodes(body.roles);

    const user: UserRecord = {
      ...body,
      id: body.id ?? `u_${Date.now()}`
    };

    this.users.push(user);
    return this.toSafeUser(user);
  }

  updateUser(id: string, body: Partial<Omit<UserRecord, "id" | "password">>) {
    const user = this.findUserRecord(id);

    if (body.roles) {
      this.roleService.assertRoleCodes(body.roles);
    }

    Object.assign(user, body);
    return this.toSafeUser(user);
  }

  bindRoles(id: string, roles: string[]) {
    this.roleService.assertRoleCodes(roles);
    return this.updateUser(id, { roles });
  }

  findUserByCredentials(username: string, password: string): AuthUser | null {
    const user = this.users.find((item) => item.username === username && item.password === password && item.enabled);

    if (!user) {
      return null;
    }

    return this.toAuthUser(user);
  }

  private findUserRecord(id: string) {
    const user = this.users.find((item) => item.id === id);

    if (!user) {
      throw new NotFoundException("user not found");
    }

    return user;
  }

  private toSafeUser(user: UserRecord): User {
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  private toAuthUser(user: UserRecord): AuthUser {
    const { id, username, roles } = user;
    return { id, username, roles };
  }
}

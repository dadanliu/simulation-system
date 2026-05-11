import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { RoleService } from "../role/role.service";
import { hashPassword, verifyPassword } from "./password-hash";
import { UserEntity, type UserDocument } from "./schemas/user.schema";
import type {
  AuthUser,
  CreateUserInput,
  UpdateUserInput,
  User,
  UserRecord
} from "./user.types";
import { DEFAULT_TENANT_ID } from "./user.types";

type PersistedUserRecord = Omit<UserRecord, "tenantId"> & {
  _id?: unknown;
  password?: string;
  tenantId?: string;
};

@Injectable()
export class UserService {
  constructor(
    @InjectModel(UserEntity.name)
    private readonly userModel: Model<UserDocument>,
    private readonly roleService: RoleService
  ) {}

  listUsers() {
    return this.userModel
      .find()
      .sort({ id: 1 })
      .lean()
      .then((users) => users.map((user) => this.toSafeUser(user)));
  }

  getUser(id: string) {
    return this.userModel
      .findOne({ id })
      .lean()
      .then((user) => (user ? this.toSafeUser(user) : null));
  }

  async createUser(body: CreateUserInput) {
    await this.roleService.assertRoleCodes(body.roles);

    const { password, ...userBody } = body;
    const user: UserRecord = {
      ...userBody,
      passwordHash: await hashPassword(password),
      id: body.id ?? `u_${Date.now()}`,
      tenantId: this.normalizeTenantId(body.tenantId)
    };

    const createdUser = await this.userModel.create(user);
    return this.toSafeUser(createdUser.toObject());
  }

  async updateUser(id: string, body: UpdateUserInput) {
    if (body.roles) {
      await this.roleService.assertRoleCodes(body.roles);
    }

    const user = await this.userModel
      .findOneAndUpdate({ id }, { $set: body }, { new: true })
      .lean();

    if (!user) {
      throw new NotFoundException("user not found");
    }

    return this.toSafeUser(user);
  }

  bindRoles(id: string, roles: string[], _reason: string) {
    return this.updateUser(id, { roles });
  }

  async findUserByCredentials(
    username: string,
    password: string
  ): Promise<AuthUser | null> {
    const user = await this.userModel
      .findOne({ username, enabled: true })
      .lean<PersistedUserRecord | null>();

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return null;
    }

    return this.toAuthUser(user);
  }

  async findAuthUserById(id: string): Promise<AuthUser | null> {
    const user = await this.userModel.findOne({ id, enabled: true }).lean();

    if (!user) {
      return null;
    }

    return this.toAuthUser(user);
  }

  private toSafeUser(user: PersistedUserRecord): User {
    const {
      _id: _id,
      password: _password,
      passwordHash: _passwordHash,
      ...safeUser
    } = user;
    return {
      ...safeUser,
      tenantId: this.normalizeTenantId(safeUser.tenantId)
    };
  }

  private async toAuthUser(user: PersistedUserRecord): Promise<AuthUser> {
    const { id, username, roles } = user;
    const permissions =
      await this.roleService.getPermissionCodesByRoleCodes(roles);
    return {
      id,
      permissions,
      roles,
      tenantId: this.normalizeTenantId(user.tenantId),
      username
    };
  }

  private normalizeTenantId(tenantId: string | undefined) {
    return tenantId?.trim() || DEFAULT_TENANT_ID;
  }
}

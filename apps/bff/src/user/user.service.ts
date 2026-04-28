import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { RoleService } from "../role/role.service";
import { UserEntity, type UserDocument } from "./schemas/user.schema";
import type { AuthUser, User, UserRecord } from "./user.types";

type CreateUserBody = Omit<UserRecord, "id"> & {
  id?: string;
};

@Injectable()
export class UserService {
  constructor(
    @InjectModel(UserEntity.name) private readonly userModel: Model<UserDocument>,
    private readonly roleService: RoleService
  ) {}

  listUsers() {
    return this.userModel.find().sort({ id: 1 }).lean().then((users) => users.map((user) => this.toSafeUser(user)));
  }

  getUser(id: string) {
    return this.userModel.findOne({ id }).lean().then((user) => (user ? this.toSafeUser(user) : null));
  }

  async createUser(body: CreateUserBody) {
    await this.roleService.assertRoleCodes(body.roles);

    const user: UserRecord = {
      ...body,
      id: body.id ?? `u_${Date.now()}`
    };

    const createdUser = await this.userModel.create(user);
    return this.toSafeUser(createdUser.toObject());
  }

  async updateUser(id: string, body: Partial<Omit<UserRecord, "id" | "password">>) {
    if (body.roles) {
      await this.roleService.assertRoleCodes(body.roles);
    }

    const user = await this.userModel.findOneAndUpdate({ id }, { $set: body }, { new: true }).lean();

    if (!user) {
      throw new NotFoundException("user not found");
    }

    return this.toSafeUser(user);
  }

  bindRoles(id: string, roles: string[]) {
    return this.updateUser(id, { roles });
  }

  async findUserByCredentials(username: string, password: string): Promise<AuthUser | null> {
    const user = await this.userModel.findOne({ username, password, enabled: true }).lean();

    if (!user) {
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

  private toSafeUser(user: UserRecord): User {
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  private toAuthUser(user: UserRecord): AuthUser {
    const { id, username, roles } = user;
    return { id, username, roles };
  }
}

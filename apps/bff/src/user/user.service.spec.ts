import { hashPassword } from "./password-hash";
import { UserService } from "./user.service";
import type { UserRecord } from "./user.types";

describe("UserService", () => {
  const roleService = {
    assertRoleCodes: jest.fn()
  };

  function createService(userModel: Record<string, jest.Mock>) {
    return new UserService(userModel as never, roleService as never);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("authenticates with a password hash", async () => {
    const passwordHash = await hashPassword("admin123");
    const user: UserRecord = {
      displayName: "系统管理员",
      enabled: true,
      id: "u_admin_001",
      passwordHash,
      roles: ["admin"],
      username: "admin"
    };
    const userModel = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(user)
      })
    };

    const result = await createService(userModel).findUserByCredentials("admin", "admin123");

    expect(userModel.findOne).toHaveBeenCalledWith({ enabled: true, username: "admin" });
    expect(result).toEqual({
      id: "u_admin_001",
      roles: ["admin"],
      username: "admin"
    });
  });

  it("returns null for a missing user and a wrong password", async () => {
    const passwordHash = await hashPassword("admin123");
    const user: UserRecord = {
      displayName: "系统管理员",
      enabled: true,
      id: "u_admin_001",
      passwordHash,
      roles: ["admin"],
      username: "admin"
    };
    const lean = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(user);
    const userModel = {
      findOne: jest.fn().mockReturnValue({ lean })
    };
    const service = createService(userModel);

    await expect(service.findUserByCredentials("missing", "admin123")).resolves.toBeNull();
    await expect(service.findUserByCredentials("admin", "wrong-password")).resolves.toBeNull();
  });

  it("does not expose password or passwordHash in user responses", async () => {
    const user = {
      _id: "mongo-id",
      displayName: "系统管理员",
      enabled: true,
      id: "u_admin_001",
      password: "admin123",
      passwordHash: await hashPassword("admin123"),
      roles: ["admin"],
      username: "admin"
    };
    const userModel = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([user])
        })
      })
    };

    const result = await createService(userModel).listUsers();

    expect(result).toEqual([
      {
        displayName: "系统管理员",
        enabled: true,
        id: "u_admin_001",
        roles: ["admin"],
        username: "admin"
      }
    ]);
    expect(JSON.stringify(result)).not.toContain("password");
    expect(JSON.stringify(result)).not.toContain("passwordHash");
    expect(JSON.stringify(result)).not.toContain("mongo-id");
  });

  it("hashes passwords when creating users", async () => {
    const createdUser = {
      toObject: jest.fn().mockImplementation(function toObject(this: { savedUser: UserRecord }) {
        return this.savedUser;
      })
    };
    const userModel = {
      create: jest.fn().mockImplementation(async (savedUser: UserRecord) => {
        return {
          ...createdUser,
          savedUser
        };
      })
    };

    const result = await createService(userModel).createUser({
      displayName: "商品运营",
      enabled: true,
      password: "operator123",
      roles: ["operator"],
      username: "operator"
    });
    const savedUser = userModel.create.mock.calls[0][0] as UserRecord & { password?: string };

    expect(savedUser.password).toBeUndefined();
    expect(savedUser.passwordHash).not.toBe("operator123");
    expect(savedUser.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(result).not.toHaveProperty("password");
    expect(result).not.toHaveProperty("passwordHash");
  });
});

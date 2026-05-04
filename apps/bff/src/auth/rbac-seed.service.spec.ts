import { verifyPassword } from "../user/password-hash";
import { RbacSeedService } from "./rbac-seed.service";

describe("RbacSeedService", () => {
  it("seeds users with passwordHash and removes legacy password", async () => {
    const userModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([])
        })
      }),
      updateOne: jest.fn()
    };
    const roleModel = {
      updateOne: jest.fn()
    };
    const permissionModel = {
      updateOne: jest.fn()
    };
    const service = new RbacSeedService(userModel as never, roleModel as never, permissionModel as never);

    await service.onModuleInit();

    const adminSeedCall = userModel.updateOne.mock.calls.find(([filter]) => filter.id === "u_admin_001");
    expect(adminSeedCall).toBeDefined();

    const [, update, options] = adminSeedCall;
    expect(update.$set.password).toBeUndefined();
    expect(update.$set.passwordHash).toMatch(/^\$2[aby]\$/);
    await expect(verifyPassword("admin123", update.$set.passwordHash)).resolves.toBe(true);
    expect(update.$unset).toEqual({ password: "" });
    expect(options).toEqual({ upsert: true });
  });

  it("migrates legacy plaintext passwords", async () => {
    const userModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              id: "u_legacy_001",
              password: "legacy123"
            }
          ])
        })
      }),
      updateOne: jest.fn()
    };
    const roleModel = {
      updateOne: jest.fn()
    };
    const permissionModel = {
      updateOne: jest.fn()
    };
    const service = new RbacSeedService(userModel as never, roleModel as never, permissionModel as never);

    await service.onModuleInit();

    const legacyMigrationCall = userModel.updateOne.mock.calls.find(([filter]) => filter.id === "u_legacy_001");
    expect(legacyMigrationCall).toBeDefined();

    const [, update] = legacyMigrationCall;
    expect(update.$set.passwordHash).toMatch(/^\$2[aby]\$/);
    await expect(verifyPassword("legacy123", update.$set.passwordHash)).resolves.toBe(true);
    expect(update.$unset).toEqual({ password: "" });
  });
});

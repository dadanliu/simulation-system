import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { AuthenticatedRequest } from "../auth/auth-request";
import { RoleService } from "../role/role.service";
import { REQUIRED_PERMISSIONS_KEY } from "./permissions.decorator";
import type { PermissionCode } from "./permission.types";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    // Reflector 用来读取 @RequirePermissions(...) 写到 controller / handler 上的元数据。
    private readonly reflector: Reflector,
    // RoleService 用来把用户身上的 roles 展开成真正的权限点列表。
    private readonly roleService: RoleService
  ) {}

  canActivate(context: ExecutionContext) {
    // 读取当前接口声明的权限要求。
    // 例如 @RequirePermissions("commodity:create") 会写入 REQUIRED_PERMISSIONS_KEY。
    // getHandler() 代表具体方法，getClass() 代表整个 Controller；
    // getAllAndOverride 会优先取方法上的配置，没有时再看 Controller 上的配置。
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionCode[]>(REQUIRED_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    // 没有写 @RequirePermissions(...) 的接口，不需要做权限判断，直接放行。
    // 注意：这只代表“不需要权限点”，不代表“不需要登录”；
    // 登录判断由 AuthGuard 负责。
    if (!requiredPermissions?.length) {
      return true;
    }

    // 从当前 HTTP 请求里取出 AuthGuard 提前写进去的 currentUser。
    // 所以使用 PermissionsGuard 的接口，通常要先执行 AuthGuard。
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.currentUser;

    // 如果这里拿不到 currentUser，说明请求没有经过登录校验，
    // 或者 AuthGuard 没有成功把用户写入 request。
    if (!user) {
      throw new ForbiddenException("permission denied");
    }

    // 用户身上只有角色 code，例如 ["operator"]。
    // 真正能做什么，需要通过 RoleService 展开成权限点：
    // ["commodity:read", "commodity:create", "commodity:update"]。
    const userPermissions = this.roleService.getPermissionCodesByRoleCodes(user.roles);

    // every 表示“接口要求的每一个权限，用户都必须拥有”。
    // 例如接口要求 ["commodity:create"]，用户权限里必须包含 commodity:create。
    const hasPermission = requiredPermissions.every((permission) => userPermissions.includes(permission));

    // 已登录但缺少权限时返回 403。
    // 401 是“你是谁我不知道”，403 是“我知道你是谁，但你不能做这件事”。
    if (!hasPermission) {
      throw new ForbiddenException("permission denied");
    }

    // 返回 true 表示通过权限校验，NestJS 会继续执行后面的 Controller handler。
    return true;
  }
}

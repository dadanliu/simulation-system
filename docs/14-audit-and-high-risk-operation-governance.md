# 14. 审计日志与高风险操作治理

本文记录本次围绕 `6.2 审计日志完善`、`6.3 高风险操作治理` 以及格式化稳定性做的改动。

核心目标：

- 商品写操作必须可追溯。
- 高风险操作必须有二次确认和原因。
- 审计日志只能由服务端可信上下文生成。
- 权限变更、商品删除/恢复等操作为后续审批流预留状态机入口。
- 编辑器和命令行使用同一套 Prettier 配置，减少无意义 diff。

## 14.1 图例

```text
[Client]        前端页面、表单、浏览器 API 调用
[BFF]           NestJS BFF，负责鉴权、DTO 校验、业务编排
[Backend]       mock backend，负责商品数据持久化
[Audit]         审计日志写入与查询
[Governance]    高风险操作策略和审批流预留
[Config]        工程格式化与编辑器配置
```

箭头含义：

```text
A -> B          同步调用
A --x B        拒绝请求，返回 400 / 403
A => Audit     写入审计日志
```

## 14.2 总体链路

```text
[Client]
  填写 reason
  二次确认
  提交业务字段
      |
      v
[BFF]
  AuthGuard 读取登录态
  PermissionsGuard 校验权限
  DTO 校验 reason / 禁止多余字段
  operator = currentUser.id
      |
      v
[Backend]
  执行商品删除 / 恢复 / 编辑 / 状态变更
  返回 before / after
      |
      v
[Audit]
  写入 action / operator / target / before / after / reason / traceId / createdAt
```

关键边界：

- 前端可以提交 `reason` 和业务表单字段。
- 前端不能提交可信审计字段，例如 `operator`。
- `operator` 只能由 BFF 从登录态 `currentUser.id` 生成。
- `traceId` 由请求链路注入，随响应和审计日志保留。

## 14.3 商品审计日志

### 记录范围

```text
create         创建商品
update         编辑商品基础信息
status_change 变更商品状态
delete         删除商品
restore        恢复商品
```

### 审计字段

```text
[AuditLog]
  action
  operator
  target
    id
    type = commodity
  before
  after
  reason
  traceId
  createdAt
```

### before / after 设计

```text
创建商品:
  before = null
  after  = name / price / status / stock

编辑商品:
  before = description / imageFileId / imageUrl / name / price / stock
  after  = description / imageFileId / imageUrl / name / price / stock

状态变更:
  before = status
  after  = status
  reason = 状态变更原因

删除 / 恢复:
  before = deletedAt / deletedBy / name / status
  after  = deletedAt / deletedBy / name / status
  reason = 删除或恢复原因
```

这里刻意只挑选业务可审计字段，不把整条商品记录原样塞进审计日志，避免未来误带敏感字段。

相关文件：

- `apps/bff/src/commodity/audit-log.service.ts`
- `apps/bff/src/commodity/schemas/audit-log.schema.ts`
- `apps/bff/src/commodity/commodity.service.ts`
- `apps/bff/src/commodity/commodity.controller.ts`
- `apps/bff/src/commodity/dto/query-audit-log.dto.ts`

## 14.4 审计查询与权限隔离

审计查询支持：

```text
operator     按操作人查询
action       按动作查询
createdFrom  按开始时间查询
createdTo    按结束时间查询
targetId     按商品 ID 查询
page         分页页码
pageSize     分页大小
```

查询链路：

```text
[Client Audit Page]
      |
      v
GET /api/commodity/audit-logs
      |
      v
[BFF]
  AuthGuard
  PermissionsGuard: audit:read
  admin role check
  QueryAuditLogDto
      |
      v
[AuditLogService]
  Mongo filters + pagination
```

权限规则：

- 未登录返回 `401`。
- 非 admin 返回 `403`。
- 查询参数非法返回 `400`。
- `createdFrom > createdTo` 返回 `400`。

相关文件：

- `apps/bff/src/commodity/commodity.controller.ts`
- `apps/bff/src/commodity/dto/query-audit-log.dto.ts`
- `apps/client/app/present/commodity/audit/page.tsx`
- `apps/client/src/features/commodity/server.ts`

## 14.5 高风险操作治理

### 当前治理规则

| 操作         | 前端二次确认             | reason 必填 | 服务端校验 | 审计     |
| ------------ | ------------------------ | ----------- | ---------- | -------- |
| 删除商品     | 是，输入商品名并弹窗确认 | 是          | 是         | 是       |
| 恢复商品     | 是，输入原因并弹窗确认   | 是          | 是         | 是       |
| 商品状态变更 | 表单提交确认             | 是          | 是         | 是       |
| 用户角色变更 | 是，弹窗确认             | 是          | 是         | 当前预留 |
| 角色权限变更 | 是，弹窗确认             | 是          | 是         | 当前预留 |

### 删除商品链路

```text
[Client Delete Form]
  输入删除原因
  输入完整商品名称
  window.confirm
      |
      v
DELETE /api/commodity/:id
  body = { reason }
      |
      v
[BFF DeleteCommodityDto]
  reason 必填
  多余字段拒绝
      |
      v
[CommodityService]
  deletedBy = currentUser.id
  request backend delete
  record audit reason
```

### 恢复商品链路

```text
[Client Audit Page Restore Button]
  window.prompt 输入恢复原因
  window.confirm 二次确认
      |
      v
PATCH /api/commodity/:id/restore
  body = { reason }
      |
      v
[BFF RestoreCommodityDto]
  reason 必填
      |
      v
[CommodityService]
  request backend restore
  record audit reason
```

### 状态变更链路

```text
[Client Status Form]
  选择目标状态
  填写 reason
      |
      v
PATCH /api/commodity/:id/status
      |
      v
[BFF UpdateCommodityStatusDto]
  status enum
  reason 必填
      |
      v
[Backend]
  校验状态流转
  返回 before / after
      |
      v
[Audit]
  action = status_change
  before.status
  after.status
  reason
```

相关文件：

- `apps/client/app/present/commodity/[id]/commodity-delete-form.tsx`
- `apps/client/app/present/commodity/[id]/commodity-status-form.tsx`
- `apps/client/app/present/commodity/audit/commodity-restore-button.tsx`
- `apps/client/src/features/commodity/client.ts`
- `apps/bff/src/commodity/dto/delete-commodity.dto.ts`
- `apps/bff/src/commodity/dto/restore-commodity.dto.ts`
- `apps/bff/src/commodity/dto/update-commodity-status.dto.ts`

## 14.6 权限变更治理

权限变更入口包括：

- 用户绑定角色。
- 角色绑定权限。

链路：

```text
[Client Access Control Page]
  修改角色 / 权限勾选
  输入 reason
  window.confirm
      |
      v
[BFF DTO]
  BindUserRolesDto
  BindRolePermissionsDto
      |
      v
[UserService / RoleService]
  校验角色 code / 权限 code
  持久化绑定结果
```

相关文件：

- `apps/client/app/present/access-control/access-control-client.tsx`
- `apps/client/src/features/user/client.ts`
- `apps/bff/src/user/dto/bind-user-roles.dto.ts`
- `apps/bff/src/role/dto/bind-role-permissions.dto.ts`
- `apps/bff/src/user/user.controller.ts`
- `apps/bff/src/role/role.controller.ts`

## 14.7 审计日志不可由前端伪造

本次明确了可信字段来源：

| 字段               | 来源                           | 是否接受前端传入 |
| ------------------ | ------------------------------ | ---------------- |
| `operator`         | BFF 登录态 `currentUser.id`    | 否               |
| `traceId`          | 请求链路中间件                 | 否               |
| `createdAt`        | BFF 创建审计日志时生成         | 否               |
| `target`           | BFF 根据路由参数和资源类型生成 | 否               |
| `reason`           | 前端填写，BFF DTO 校验         | 是               |
| `before` / `after` | backend 返回真实变更前后数据   | 否               |

伪造示例：

```json
{
  "operator": "u_attacker",
  "reason": "重复创建"
}
```

处理结果：

```text
[BFF ValidationPipe]
  forbidNonWhitelisted = true
      |
      v
400 Bad Request
property operator should not exist
```

相关测试：

- `apps/bff/src/commodity/commodity.e2e-spec.ts`

## 14.8 审批流预留

本次新增了高风险操作策略文件：

- `apps/bff/src/governance/high-risk-operation.policy.ts`

当前预留的审批流候选：

```text
commodity.delete
commodity.restore
commodity.status_change
user.roles.bind
role.permissions.bind
```

建议进入审批流的原因：

| 操作         | 原因                               |
| ------------ | ---------------------------------- |
| 商品删除     | 影响商品可见性，且容易误操作       |
| 商品恢复     | 会重新暴露已删除商品，需要复核     |
| 商品状态变更 | 上下架影响用户侧可见商品和业务流程 |
| 用户角色变更 | 直接改变单个账号的操作能力         |
| 角色权限变更 | 影响一组用户，风险范围更大         |

后续可以扩展成任务流：

```text
draft
  -> pending_approval
  -> approved
  -> executed

pending_approval
  -> rejected
  -> cancelled
```

审批流落地时建议拆分职责：

- 发起人：提交高风险操作申请。
- 审批人：确认是否允许执行。
- 执行器：审批通过后调用真实业务服务。
- 审计服务：记录申请、审批、执行三个阶段。

## 14.9 Prettier 稳定性治理

本次还处理了格式化噪音：

```text
[Editor]
      |
      v
[Workspace .vscode/settings.json]
  tabSize = 2
  require Prettier config
  formatter = esbenp.prettier-vscode
  prettierPath = ./node_modules/prettier/index.cjs
      |
      v
[Prettier 3.8.3]
      |
      v
[CLI and Editor same behavior]
```

同时把测试里的长链式权限断言改成 helper：

```ts
expectPermissionCheck(["operator"], ["commodity:create"]);
```

这样可以避免下面这种由于接近 `printWidth` 边界导致的来回折行：

```ts
expect(mocks.permissionService.hasAllPermissionsByRoleCodes).toHaveBeenCalledWith(["operator"], ["commodity:create"]);
```

相关文件：

- `.vscode/settings.json`
- `package.json`
- `pnpm-lock.yaml`
- `apps/bff/src/commodity/commodity.e2e-spec.ts`

## 14.10 验收清单

```text
[x] 任意商品写操作都能查到审计
[x] 审计记录包含 operator、action、target、traceId、createdAt
[x] 审计记录包含 before / after
[x] 审计查询支持 operator / action / time / target 查询
[x] 非 admin 不能查看审计日志
[x] 审计查询参数非法返回 400
[x] 删除商品必须确认
[x] 删除商品必须填写 reason
[x] 恢复商品必须填写 reason
[x] 状态变更必须填写 reason
[x] 权限变更必须填写 reason
[x] 审计 operator 来自登录态，不来自前端 body
[x] 高风险操作已预留审批流策略入口
```

## 14.11 验证命令

本次相关验证命令：

```bash
pnpm --filter @next-bff/bff exec jest --config ./jest.config.js --runInBand
pnpm lint:bff
pnpm lint:client
pnpm build:bff
pnpm build:client
pnpm exec prettier --check .vscode/settings.json prettier.config.mjs package.json pnpm-lock.yaml apps/bff/src/commodity/commodity.e2e-spec.ts
git diff --check
```

`build:client` 可能提示 Next.js 的 `middleware` 文件约定已弃用为 `proxy`，该提示不是本次改动引入的构建失败，当前构建可以通过。

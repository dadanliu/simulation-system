# next-bff

项目目录按三层直接拆分，不做共享代码包：

```text
.
├── apps/
│   ├── client/   # Next.js 前端
│   ├── bff/      # NestJS BFF
│   └── server/   # NestJS mock backend
├── ARCHITECTURE.md
├── CHANGELOG.md
├── README.md
└── pnpm-workspace.yaml
```

## 分层约定

- `apps/client`：只放前端页面、组件、样式、前端业务逻辑
- `apps/bff`：基于 NestJS 实现的 BFF，负责登录鉴权、会话、接口聚合和协议转换
- `apps/server`：基于 NestJS 实现的 mock backend，负责模拟后端数据和后端接口

`components`、`lib`、`features` 都放在各自层级目录下面，不做跨层共享目录。

## 当前状态

- `apps/client` 已完成 Next.js App Router 初始化
- `apps/client` 已有 `/login`、`/present/commodity/list`、`/present/commodity/[id]`、`/present/commodity/create`
- `apps/bff` 已切换为 NestJS 项目结构，并实现 `/api/auth/login`、`/api/auth/logout`、`/api/auth/me`
- `apps/server` 已切换为 NestJS 项目结构，并提供 mock backend 骨架接口

## 安装依赖

```bash
pnpm install
```

## 常用启动

前端开发：

```bash
pnpm dev
```

访问：

```text
http://localhost:3000
```

## 根目录脚本

默认脚本：

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
```

这些默认都指向 `apps/client`。

批量操作三层项目：

```bash
pnpm dev:all
pnpm build:all
pnpm start:all
pnpm lint:all
```

按层操作：

```bash
pnpm dev:client
pnpm dev:bff
pnpm dev:server

pnpm build:client
pnpm build:bff
pnpm build:server

pnpm start:client
pnpm start:bff
pnpm start:server

pnpm lint:client
pnpm lint:bff
pnpm lint:server
```

## 端口约定

- `apps/client`：`3000`
- `apps/bff`：`3001`
- `apps/server`：`3002`

## BFF 当前能力

`apps/bff` 当前已基于 NestJS 实现：

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- 登录成功后写入 `next_bff_session` cookie
- 登出后清除 cookie
- `get-current-user`
- `require-login`

登录与会话的图文说明见 [docs/03-login-session.md](./docs/03-login-session.md)。

Auth 接口 curl 调试说明见 [docs/mock-auth.md](./docs/mock-auth.md)。

## Server 当前能力

`apps/server` 当前已基于 NestJS 提供 mock backend 基础骨架：

- `GET /`
- `GET /api/health`
- `GET /api/users`

## 下一步建议

- 在 `apps/bff` 中继续接入商品、上传等聚合接口
- 在 `apps/server` 中继续实现 commodity、upload 等 mock backend 模块
- 让 `apps/client` 只通过 `apps/bff` 获取业务数据

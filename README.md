# next-bff

## 目标
从“会调接口” → 到“看懂链路” → 到“理解系统” → 到“能解释性能和规模” → 最后才是“理解云和架构”。

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

## 本地一键启动

新人本地启动优先使用：

```bash
pnpm dev:all
```

这个脚本会按顺序处理：

```text
MongoDB -> Redis -> client -> BFF -> backend
```

启动成功后会打印：

```text
Dev services are ready:
- client: http://localhost:3000
- bff:    http://localhost:3001
- server: http://localhost:3002
- mongo:  mongodb://127.0.0.1:27017/next-bff-dev
- redis:  redis://127.0.0.1:6379
```

访问：

```text
http://localhost:3000
```

默认测试账号：

```text
admin / admin123
```

一键停止本地服务：

```bash
pnpm stop:all
```

重新启动：

```bash
pnpm restart:devall
```

### 本地依赖

`pnpm dev:all` 会尽量复用或启动本地依赖：

- MongoDB：优先复用 `127.0.0.1:27017`，否则尝试本机 `mongod`。
- Redis：优先复用 `127.0.0.1:6379`，否则尝试本机 `redis-server`，再尝试 Docker Redis。

如果缺少 MongoDB，会看到类似提示：

```text
Install MongoDB, start MongoDB at 127.0.0.1:27017, or set MONGODB_URI for BFF/server.
```

如果缺少 Redis 或 Docker Desktop 没启动，会看到类似提示：

```text
Redis is required for BFF sessions...
If you want dev:redis to manage Redis with Docker, start Docker Desktop and rerun pnpm dev:redis.
```

### Ready 规则

`pnpm dev:all` 不只看进程是否启动，还会做 ready/health 检查：

- MongoDB 端口可连接
- Redis 端口可连接
- client `/login` 可访问
- BFF `/` 可访问
- backend `/` 可访问

只有五个服务都 ready 后，脚本才会打印 `Dev services are ready`。如果 backend 挂掉或健康检查超时，不会误报 ready，脚本会退出并停止已启动的子进程。

### 进程清理

`dev:all` 会把托管进程写入：

```text
.dev/dev-all.json
```

`pnpm stop:all` 会优先读取这个文件清理 `dev:all` 拉起的进程，然后兜底清理 `3000 / 3001 / 3002` 端口。这样重复启动不应该留下 client、BFF、backend 的僵尸进程。

MongoDB 和 Redis 如果是你机器上已经存在的共享实例，`stop:all` 不会按端口强杀它们；如果它们是 `dev:all` 通过包装脚本拉起的，会通过托管进程一起停止。

### 故障排查

如果访问页面报 `/api/auth/me 500`，先检查 BFF 是否启动：

```bash
lsof -nP -iTCP:3001 -sTCP:LISTEN
```

如果没有进程监听 `3001`，请使用：

```bash
pnpm dev:all
```

如果端口被旧进程占用：

```bash
pnpm stop:all
pnpm dev:all
```

如果配置缺失导致启动失败，先参考：

```text
.env.example
```

环境隔离设计见：

```text
docs/07-environment-isolation.md
```

本地开发配置在：

```text
.env.local
```

`.env.local` 已被 `.gitignore` 忽略，不应该提交真实密钥。

## 常用启动

前端开发：

```bash
pnpm dev
```

访问：

```text
http://localhost:3000
```

注意：`pnpm dev` 只启动 client。完整链路请使用 `pnpm dev:all`。

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
pnpm dev:https
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

## BFF session cookie 安全配置

登录成功后，BFF 会通过 `Set-Cookie` 写入 `next_bff_session`：

```http
Set-Cookie: next_bff_session=<sessionId>; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400
```

字段含义：

- `HttpOnly`：禁止浏览器 JS 读取 cookie，降低 XSS 直接窃取 session 的风险。
- `SameSite=Lax`：减少跨站请求自动携带 cookie 的风险，兼顾后台系统常见跳转体验。
- `Max-Age=86400`：cookie 有效期为 24 小时。
- `Secure`：只在 HTTPS 下发送 cookie。生产环境应开启，本地 HTTP 开发环境通常关闭。

`Secure` 的启用规则：

```text
COOKIE_SECURE=true   -> 强制写入 Secure
COOKIE_SECURE=false  -> 强制不写入 Secure
未配置 COOKIE_SECURE 且 NODE_ENV=production -> 写入 Secure
未配置 COOKIE_SECURE 且非 production        -> 不写入 Secure
```

本地开发通常不需要配置：

```bash
pnpm dev:all
```

生产或 HTTPS 环境建议配置：

```bash
COOKIE_SECURE=true pnpm start:bff
```

如果本地使用 HTTP 却设置了 `COOKIE_SECURE=true`，浏览器不会发送这个 cookie，表现通常是“登录成功后刷新又变成未登录”。

本地验证 HTTPS 和 `Secure` cookie：

```bash
pnpm dev:https
```

这个脚本会：

- 在 `.cert/` 下生成本地自签 HTTPS 证书。
- 使用 `https://localhost:3000` 启动 Next.js。
- 仍以内网 HTTP 方式启动 BFF `http://localhost:3001` 和 backend `http://localhost:3002`。
- 给 BFF 注入 `COOKIE_SECURE=true`，登录后 `next_bff_session` 会带 `Secure`。

首次打开时浏览器可能提示证书不受信任，接受本地自签证书后访问：

```text
https://localhost:3000
```

然后登录并在 DevTools 的 Application / Cookies 中检查 `next_bff_session`，应能看到：

```text
HttpOnly: true
Secure: true
SameSite: Lax
```

如果只想对比 `SameSite`、`Secure`、`Max-Age` 有无差异，可以运行：

```bash
pnpm explain:cookie
```

如果想模拟 `Secure` 对 HTTP 链路 session 劫持的防护，可以运行：

```bash
pnpm simulate:cookie-hijack
```

如果想进一步模拟“中间人截获 cookie 后重放请求”，可以运行：

```bash
pnpm simulate:cookie-replay
```

如果想用真实浏览器点击页面触发请求，并让终端里的中间人代理实时截取，可以运行：

```bash
pnpm simulate:browser-mitm
```

脚本会打印一个独立 Chrome 启动命令。用这个命令打开浏览器后，在页面里依次点击四个场景。

`simulate:cookie-hijack` 会模拟四种请求：

- 没有 `Secure` 时访问 `http://...`：浏览器会把 `next_bff_session` 放进 Cookie 请求头，中间人能在明文 HTTP 链路中看到 session。
- 没有 `Secure` 时访问 `https://...`：本次 HTTPS 请求不泄露，但 cookie 仍然允许后续被发送到 HTTP。
- 有 `Secure` 时访问 `http://...`：浏览器不会发送 `next_bff_session`，中间人看不到 session。
- 有 `Secure` 时访问 `https://...`：浏览器会发送 `next_bff_session`，但请求头在 HTTPS 链路中被加密传输。

`simulate:cookie-replay` 会启动本地受害服务和中间人代理。受害者请求全部经过代理，脚本会验证四种组合下中间人是否能截获 `next_bff_session`，以及攻击者能否重放 `/api/auth/me`。

`simulate:browser-mitm` 会保留服务不退出，等待你在浏览器里真实点击。终端会实时打印 HTTP 明文 Cookie、HTTPS CONNECT 记录和攻击者重放结果。

注意：不要直接用普通浏览器打开脚本打印的站点地址。必须使用脚本打印的 Chrome 命令，因为这个命令会把浏览器流量导入中间人代理。脚本使用 `mitm.test` 而不是 `localhost`，避免浏览器默认绕过本地代理。

更完整的图文说明见 [docs/04-cookie-hijack-secure.md](./docs/04-cookie-hijack-secure.md)。

## Server 当前能力

`apps/server` 当前已基于 NestJS 提供 mock backend 基础骨架：

- `GET /`
- `GET /api/health`
- `GET /api/users`

## 下一步建议

- 在 `apps/bff` 中继续接入商品、上传等聚合接口
- 在 `apps/server` 中继续实现 commodity、upload 等 mock backend 模块
- 让 `apps/client` 只通过 `apps/bff` 获取业务数据

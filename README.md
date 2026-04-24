# next-bff

项目目录按三层直接拆分，不做共享代码包：

```text
.
├── apps/
│   ├── client/   # Next.js 前端
│   ├── bff/      # 中间层
│   └── server/   # 后端或 mock backend
├── ARCHITECTURE.md
├── README.md
└── pnpm-workspace.yaml
```

## 分层约定

- `apps/client`：只放前端页面、组件、样式、前端业务逻辑
- `apps/bff`：只放 BFF 接口聚合、鉴权、协议转换
- `apps/server`：只放后端能力或 mock backend

`components`、`lib`、`features` 都放在各自层级目录下面，不做跨层共享目录。

## 当前状态

- `apps/client` 已完成 Next.js App Router 初始化
- `apps/client` 已有 `/login`、`/present/commodity/list`、`/present/commodity/[id]`、`/present/commodity/create`
- `apps/bff` 已创建占位入口
- `apps/server` 已创建服务端目录

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

说明：

- `client` 当前已具备完整 `dev/build/start/lint`
- `bff` 当前只有 `dev`
- `server` 当前还是目录占位，所以部分脚本会通过 `--if-present` 跳过

## 下一步建议

- 在 `apps/bff` 中实现登录、商品、上传等接口聚合
- 在 `apps/server` 中实现 mock backend 数据与统一返回结构
- 让 `apps/client` 只通过 `apps/bff` 获取业务数据

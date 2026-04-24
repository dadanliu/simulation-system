# Client README

这是前端层 `apps/client` 的说明文档。

## 为什么看不到传统“项目入口”

这是 `Next.js App Router` 项目，不是 `Vite`、`CRA` 或传统 React SPA。

所以这里没有你熟悉的：

- `src/main.tsx`
- `src/index.tsx`
- `ReactDOM.createRoot(...)`

`Next.js` 的入口是“约定式文件结构”，不是单独一个启动文件。

## 当前真正的入口在哪里

这个前端层可以按下面理解：

### 1. 运行入口

`[package.json](./package.json)` 里的脚本负责启动 Next：

```json
"dev": "next dev",
"build": "next build",
"start": "next start"
```

也就是说，真正启动应用的是 `next dev`，不是你自己手写一个 `main.tsx`。

### 2. 应用根入口

`[app/layout.tsx](./app/layout.tsx)` 是整个 App Router 应用的根布局入口。

它负责：

- 定义 HTML 结构
- 注入全局样式 `app/globals.css`
- 包住所有页面
- 设置全局 `metadata`

你可以把它理解为：

```text
整个前端应用最顶层的壳
```

### 3. 首页入口

`[app/page.tsx](./app/page.tsx)` 是 `/` 路由对应的页面。

当前它做的事情是：

- 访问 `/`
- 直接 `redirect("/present/commodity/list")`

所以首页不是展示内容，而是跳转。

### 4. 具体页面入口

App Router 里，每个 `page.tsx` 都是一个页面入口：

- `[app/login/page.tsx](./app/login/page.tsx)` 对应 `/login`
- `[app/present/commodity/list/page.tsx](./app/present/commodity/list/page.tsx)` 对应 `/present/commodity/list`
- `[app/present/commodity/[id]/page.tsx](./app/present/commodity/[id]/page.tsx)` 对应 `/present/commodity/:id`
- `[app/present/commodity/create/page.tsx](./app/present/commodity/create/page.tsx)` 对应 `/present/commodity/create`

## Next.js 在这个项目里涉及到的核心概念

## 1. App Router

`app/` 目录就是路由系统本身。

规则很简单：

- `app/page.tsx` => `/`
- `app/login/page.tsx` => `/login`
- `app/present/layout.tsx` => `/present` 下面页面共用布局
- `app/present/commodity/[id]/page.tsx` => 动态路由

你不用自己配 React Router，Next 会按目录自动生成路由。

## 2. Layout

`layout.tsx` 是布局文件，不会随着子页面切换而完全重建。

当前有两层：

- `[app/layout.tsx](./app/layout.tsx)`：全局布局
- `[app/present/layout.tsx](./app/present/layout.tsx)`：后台区域布局

`app/present/layout.tsx` 里挂了：

- `[src/components/app-shell.tsx](./src/components/app-shell.tsx)`

也就是左侧导航、顶部栏这类后台壳子。

## 3. Page

`page.tsx` 表示一个路由页面。

当前这些页面本质上都是 React 组件，只是由 Next 按路由约定来渲染。

## 4. Server Component

在 App Router 里，默认组件就是 Server Component。

也就是说，如果文件顶部没有：

```ts
"use client";
```

那它默认在服务端渲染。

当前这个项目里的页面和布局，大多都还是默认的 Server Component。

这意味着它们适合做：

- 首屏渲染
- 服务端取数
- 重定向
- 组合页面结构

例如 `[app/page.tsx](./app/page.tsx)` 里直接调用了 `redirect(...)`，这就是典型服务端能力。

## 5. Client Component

如果某个组件要用浏览器交互能力，比如：

- `useState`
- `useEffect`
- 表单交互
- 点击事件
- 浏览器 API

就要在文件顶部加：

```ts
"use client";
```

后面你做筛选栏、表单、上传时，很多组件会变成 Client Component。

## 6. Metadata

`[app/layout.tsx](./app/layout.tsx)` 里有：

```ts
export const metadata = { ... }
```

这是 Next 提供的页面元信息能力，用来管理：

- `title`
- `description`
- SEO 相关信息

## 7. next/navigation

当前 `[app/page.tsx](./app/page.tsx)` 用了：

```ts
import { redirect } from "next/navigation";
```

这是 App Router 提供的导航能力。

常见会用到：

- `redirect`
- `notFound`
- `useRouter`（客户端）

## 8. 全局样式

`[app/globals.css](./app/globals.css)` 是全局样式入口。

它在 `[app/layout.tsx](./app/layout.tsx)` 里被引入，所以整个应用都会生效。

## 9. next.config.ts

`[next.config.ts](./next.config.ts)` 是 Next 的框架配置文件。

当前只开了：

- `reactStrictMode: true`

后面如果要配：

- 图片域名
- rewrites
- headers
- experimental 能力

都会放这里。

## 10. .next 是什么

你现在看到很多 `apps/client/.next/**` 文件，是因为 Next 跑过开发或构建后自动生成了产物目录。

它不是源码入口。

它只是：

- 编译产物
- 路由清单
- server bundle
- static bundle
- 构建缓存

平时看源码时可以忽略它。

## 当前这个 client 层的源码重点看哪里

如果你只想快速理解前端层，按这个顺序看：

1. `[package.json](./package.json)`
2. `[app/layout.tsx](./app/layout.tsx)`
3. `[app/page.tsx](./app/page.tsx)`
4. `[app/present/layout.tsx](./app/present/layout.tsx)`
5. `app/present/**/page.tsx`
6. `[src/components/app-shell.tsx](./src/components/app-shell.tsx)`
7. `[src/components/side-nav.tsx](./src/components/side-nav.tsx)`
8. `[src/lib/routes.ts](./src/lib/routes.ts)`

## 当前目录结构怎么理解

```text
apps/client
├── app/                 # Next App Router 路由入口
├── src/components/      # 前端公共组件
├── src/features/        # 业务模块
├── src/lib/             # 前端工具和常量
├── next.config.ts       # Next 配置
├── package.json         # 前端层依赖与脚本
└── tsconfig.json        # TypeScript 配置
```

## 一句话理解

这个 `client` 不是“一个 React 单页应用入口文件”，而是：

```text
一个由 Next.js App Router 按目录约定驱动的前端应用。
```

# 请求层封装与前端错误治理

## 背景

在这次改动之前，前端请求层存在几个典型问题：

- 页面和表单里重复写 `fetch -> response.json() -> success/data/message` 解析逻辑。
- `401`、`404`、`500`、非 JSON 响应、超时没有统一语义。
- 浏览器运行时错误、请求错误、路由错误边界没有统一上报入口。
- 页面错误提示能展示，但排障信息和 traceId 不能稳定串起来。

这次改动的目标是把这些能力收敛成统一基础设施，而不是继续在业务页面里复制。

## 设计目标

这次请求层和错误治理要解决四件事：

```text
1. 统一解析 success / data / message / traceId
2. 统一处理非 JSON 响应和 JSON parse 失败
3. 统一处理超时、简单重试、401 登录跳转
4. 统一上报前端错误，包含 URL、用户、traceId
```

## 当前架构

这次实现把请求和错误治理拆成三层：

```text
业务组件层
  -> 请求封装层
  -> 页面边界层
  -> 错误上报层
```

图示：

```text
┌─────────────────────────────────────────────┐
│ 业务组件                                     │
│ login / create commodity / edit / upload    │
│ list page / detail page / audit page        │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ 请求封装层                                   │
│                                             │
│ clientApiRequest / clientUploadRequest      │
│ serverApiRequest                            │
└───────┬───────────────────────┬─────────────┘
        │                       │
        │                       │
        ▼                       ▼
┌─────────────────────┐   ┌─────────────────────┐
│ Browser APIs        │   │ Server Component    │
│ /api/...            │   │ fetch /api/...      │
└─────────┬───────────┘   └─────────┬───────────┘
          │                         │
          ▼                         ▼
┌─────────────────────────────────────────────┐
│ 状态码与响应治理                              │
│ 401 / 404 / timeout / parse / non-JSON      │
└───────────────────┬─────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│ 页面边界与错误上报                            │
│ error.tsx / not-found.tsx / client-errors   │
└─────────────────────────────────────────────┘
```

## 一、浏览器侧请求统一入口

浏览器侧新增的核心入口在：

- [auth/client.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/features/auth/client.ts:1)

新增能力：

- `clientApiRequest<T>()`
- `clientUploadRequest<T>()`
- `ClientApiError`
- `AbortController` 超时
- GET 请求默认一次轻量重试
- 非 JSON 响应兜底
- 401 自动跳转 `/login?next=...`
- 请求失败自动上报前端错误

图示：

```text
Client Component
  │
  │ createCommodity / createUser / login / upload
  ▼
clientApiRequest / clientUploadRequest
  │
  ├─ 自动补 CSRF
  ├─ 自动 timeout
  ├─ 自动 parse envelope
  ├─ 自动识别 non-JSON
  ├─ 401 -> redirect login
  ├─ network / timeout / parse / http 分类
  └─ reportFrontendError(...)
  ▼
页面组件只保留：
  - 成功后的 UI 行为
  - 用户友好提示
```

### 这次迁移到统一浏览器请求层的文件

- [commodity/client.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/features/commodity/client.ts:1)
- [user/client.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/features/user/client.ts:1)
- [login/page.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/login/page.tsx:1)
- [top-bar.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/components/top-bar.tsx:1)
- [commodity-create-form.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/present/commodity/create/commodity-create-form.tsx:1)
- [commodity-edit-form.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/present/commodity/[id]/commodity-edit-form.tsx:1)
- [upload-demo.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/present/commodity/create/upload-demo.tsx:1)

### 改动结果

现在页面里不再重复写：

```ts
const response = await fetch(...)
const payload = await response.json().catch(...)
if (!response.ok || !payload?.success || !payload.data) ...
```

而是统一变成：

```ts
const { data } = await clientApiRequest(...)
```

## 二、Server Component 请求统一入口

Server Component 取数新增统一入口：

- [server-api.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/lib/server-api.ts:1)

它负责：

- 自动读取 `cookies()`
- 统一解析 `success/data/message/traceId`
- 统一处理 `401`
- `404 -> notFound()`
- 超时兜底
- 非 JSON 响应兜底
- 抛结构化 `AppError`

图示：

```text
Server Component
  │
  │ getCurrentUser / getCommodityListPageData / getCommodityDetail
  ▼
serverApiRequest
  │
  ├─ cookies()
  ├─ fetch /api/...
  ├─ parse envelope
  ├─ 401 -> redirect("/login?next=...")
  ├─ 404 -> notFound()
  └─ 500 / parse / timeout -> AppError
  ▼
error.tsx / not-found.tsx
```

### 这次迁移到统一服务端请求层的文件

- [commodity/server.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/features/commodity/server.ts:1)
- [auth/server.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/features/auth/server.ts:1)

### 改动结果

服务端取数不再在每个 feature 里复制：

```ts
const response = await fetch(...)
const payload = await response.json().catch(...)
if (response.status === 401) redirect(...)
if (response.status === 404) notFound()
...
```

这些语义现在集中在一个 helper 里。

## 三、统一错误对象与路由边界

为了让服务端和客户端都能拿到结构化错误信息，这次继续使用并扩展了：

- [app-error.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/lib/app-error.ts:1)

它会把错误编码成统一结构：

```text
status
message
path
traceId
```

页面边界负责把这些信息展示出来：

- [present/error.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/present/error.tsx:1)
- [present/not-found.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/present/not-found.tsx:1)
- [commodity/list/error.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/present/commodity/list/error.tsx:1)
- [commodity/[id]/error.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/present/commodity/[id]/error.tsx:1)

图示：

```text
请求失败
  │
  ├─ 401 -> login redirect
  ├─ 404 -> notFound()
  ├─ 403 -> error.tsx 友好页
  └─ 500 -> error.tsx + traceId
```

### 本次补齐的页面语义

- `401`：统一跳登录并保留 `next`
- `404`：商品详情不存在时走 `notFound()`
- `403`：走页面级错误边界，而不是 runtime overlay
- `500`：错误页显示 `traceId`

## 四、前端错误上报链路

这次新增了一个完整的前端错误上报通道。

### 浏览器上报入口

- [client-error-report.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/lib/client-error-report.ts:1)

它会把错误发送到：

```text
POST /api/client-errors
```

### Next Route Handler 接收端

- [api/client-errors/route.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/api/client-errors/route.ts:1)

这个 route handler 会：

1. 接收前端错误 payload
2. 调 `/api/auth/me` 补当前用户
3. 用 `console.error(JSON.stringify(...))` 统一落日志

### 浏览器全局监听器

- [client-error-reporter.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/components/client-error-reporter.tsx:1)
- 挂载位置：[layout.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/layout.tsx:1)

监听范围：

- `window.onerror`
- `window.unhandledrejection`

### 页面错误边界主动上报

这次还把 3 个 error boundary 都改成在 `useEffect` 里主动调用 `reportFrontendError(...)`：

- [present/error.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/present/error.tsx:1)
- [commodity/list/error.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/present/commodity/list/error.tsx:1)
- [commodity/[id]/error.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/present/commodity/[id]/error.tsx:1)

图示：

```text
Browser error / request error / boundary error
  │
  ▼
reportFrontendError()
  │
  │ POST /api/client-errors
  ▼
Next Route Handler
  │
  ├─ 读取 category / message / source / status / traceId / url
  ├─ 查询当前用户
  └─ 统一 console.error 结构化日志
```

## 五、非 JSON 响应与超时治理

### 非 JSON 响应

浏览器端和服务端 helper 都统一做了：

```text
先看 content-type
不是 application/json -> 不直接 JSON.parse
返回 envelope = null
走 fallbackMessage / AppError / ClientApiError
```

所以即使后端返回 HTML、空 body、网关错误页，也不会因为 `response.json()` 抛异常导致白屏。

### 超时

当前统一使用：

- 普通请求默认 `8s`
- 上传请求 `15s`

机制：

```text
AbortController
  -> 超时 abort
  -> 分类为 timeout error
  -> 返回用户可读提示
  -> 同时上报前端错误
```

图示：

```text
发起请求
  │
  ├─ 8s / 15s 内成功
  │    └─ 正常返回 data
  │
  └─ 超时
       ├─ AbortController abort
       ├─ 构造 timeout error
       ├─ 上报 frontend error
       └─ 页面显示“请求超时，请稍后重试”
```

## 六、本次新增与修改的文件

### 新增文件

- [api-envelope.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/lib/api-envelope.ts:1)
- [server-api.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/lib/server-api.ts:1)
- [client-error-report.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/lib/client-error-report.ts:1)
- [client-error-reporter.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/components/client-error-reporter.tsx:1)
- [api/client-errors/route.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/api/client-errors/route.ts:1)

### 关键修改文件

- [auth/client.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/features/auth/client.ts:1)
- [commodity/client.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/features/commodity/client.ts:1)
- [user/client.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/features/user/client.ts:1)
- [commodity/server.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/features/commodity/server.ts:1)
- [auth/server.ts](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/features/auth/server.ts:1)
- [layout.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/layout.tsx:1)
- [login/page.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/login/page.tsx:1)
- [top-bar.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/src/components/top-bar.tsx:1)
- [commodity-create-form.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/present/commodity/create/commodity-create-form.tsx:1)
- [commodity-edit-form.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/present/commodity/[id]/commodity-edit-form.tsx:1)
- [upload-demo.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/present/commodity/create/upload-demo.tsx:1)
- [present/error.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/present/error.tsx:1)
- [present/not-found.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/present/not-found.tsx:1)
- [commodity/list/error.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/present/commodity/list/error.tsx:1)
- [commodity/[id]/error.tsx](/Users/liuxing/Desktop/Space/beike-simulation/next-bff/apps/client/app/present/commodity/[id]/error.tsx:1)

## 七、验收对应

### 页面不重复写响应解析逻辑

已完成。

现在业务层主要使用：

```text
clientApiRequest()
clientUploadRequest()
serverApiRequest()
```

### 接口超时有用户提示

已完成。

默认会显示：

```text
请求超时，请稍后重试
```

### 非 JSON 响应不会导致白屏

已完成。

现在 helper 会先看 `content-type`，不会盲目 `response.json()`。

### 前端错误上报包含 URL、用户、traceId

已完成。

`/api/client-errors` 会拿到：

```text
category
message
source
status
traceId
url
currentUser
```

## 一句话总结

这次改动把前端请求、状态码语义、超时、非 JSON 兜底、错误边界和前端错误上报收敛成了一套统一基础设施。页面和表单层现在主要处理业务动作和用户反馈，不再负责重复解析响应和拼接错误治理逻辑。

# Next Server Component 与 Client Component 如何组合

## 先看结论

在 Next.js App Router 里，一个页面不是只能选择“全服务端”或“全客户端”。更常见的是：

```text
Server Component 负责：
- 路由入口
- 首屏取数
- 读取 cookie/header
- 调 BFF
- 输出页面结构

Client Component 负责：
- useState/useEffect
- 点击、输入、提交
- router.push/router.refresh
- 上传、删除、编辑等浏览器交互
```

当前项目就是这种混合模式。

例如商品列表页：

```text
app/present/commodity/list/page.tsx                 Server Component
app/present/commodity/list/commodity-list-content   Server Component
app/present/commodity/list/commodity-list-filters   Client Component
app/present/commodity/list/commodity-list-pagination Client Component
src/components/commodity-image                      Client Component
```

## 默认规则

App Router 下，文件默认是 Server Component：

```tsx
export default function Page() {
  return <div>Server Component by default</div>;
}
```

只有文件顶部写了 `"use client"`，这个文件才是 Client Component：

```tsx
"use client";

import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

## 当前商品列表页的组合方式

页面入口是 Server Component：

```tsx
// apps/client/app/present/commodity/list/page.tsx
export const dynamic = "force-dynamic";

export default async function CommodityListPage({ searchParams }: CommodityListPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  return <CommodityListContent searchParams={resolvedSearchParams} />;
}
```

列表内容也是 Server Component：

```tsx
// apps/client/app/present/commodity/list/commodity-list-content.tsx
export async function CommodityListContent({ searchParams }: CommodityListContentProps) {
  const { filters, list, pagination, totalPages } = await getCommodityListPageData(searchParams);

  return (
    <section>
      <CommodityListFiltersPanel filters={filters} />
      <table>{/* list rows */}</table>
      <CommodityListPagination currentPage={pagination.page} filters={filters} totalPages={totalPages} />
    </section>
  );
}
```

其中 `CommodityListFiltersPanel` 是 Client Component：

```tsx
// apps/client/app/present/commodity/list/commodity-list-filters.tsx
"use client";

export function CommodityListFiltersPanel({ filters }: CommodityListFiltersPanelProps) {
  // useRouter、事件处理、表单状态都在这里
}
```

这说明：**Server Component 可以 import 并渲染 Client Component**。

## 组合图

```text
┌──────────────────────────────────────────────┐
│ Route: /present/commodity/list                │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│ page.tsx                                      │
│ Server Component                              │
│ - 接收 searchParams                           │
│ - dynamic = "force-dynamic"                   │
└──────────────────────┬───────────────────────┘
                       │ render
                       ▼
┌──────────────────────────────────────────────┐
│ CommodityListContent                          │
│ Server Component                              │
│ - await getCommodityListPageData()            │
│ - 服务端 fetch BFF list                       │
│ - 生成表格结构                                │
└──────────────┬───────────────────────┬───────┘
               │                       │
               │ include client boundary│ include server-rendered markup
               ▼                       ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ CommodityListFiltersPanel     │   │ <table> 商品列表             │
│ Client Component              │   │ Server-rendered HTML/RSC     │
│ - 表单状态                    │   │ - 商品 ID                    │
│ - router.push                 │   │ - 商品名                     │
│ - 筛选交互                    │   │ - 价格/库存/状态             │
└──────────────────────────────┘   └──────────────────────────────┘
               │
               ▼
┌──────────────────────────────┐
│ CommodityListPagination       │
│ Client Component              │
│ - 上一页/下一页               │
│ - router.push                 │
└──────────────────────────────┘
```

## Next 是如何编排的

可以把一次页面渲染理解成两个产物：

```text
1. Server Component 渲染结果
2. Client Component 的引用信息和 props
```

服务端渲染时，Next 会执行 Server Component：

```text
page.tsx
  -> CommodityListContent
     -> getCommodityListPageData()
     -> fetch BFF
     -> 得到 list
```

遇到 Client Component 时，服务端不会执行它的浏览器逻辑，例如：

```text
useState
onClick
useRouter
window
```

Next 会把 Client Component 当成一个 client boundary，记录：

```text
- 这个位置要渲染哪个 Client Component
- 传给它的 props 是什么
- 浏览器需要加载哪个 JS chunk
```

## 编排流程图

```text
┌─────────────┐
│  Browser    │
└──────┬──────┘
       │
       │ GET /present/commodity/list?page=1...
       ▼
┌──────────────────────────────────────────────┐
│ Next Server                                  │
│ 执行 Server Component                         │
└──────┬───────────────────────────────────────┘
       │
       │ page.tsx
       │ CommodityListContent
       │ getCommodityListPageData()
       ▼
┌──────────────────────────────────────────────┐
│ BFF / Backend                                │
│ 返回商品列表 JSON                             │
└──────┬───────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────┐
│ Next Server 生成 RSC payload / HTML           │
│                                              │
│ 包含：                                       │
│ - Server Component 的渲染结果                 │
│ - Client Component 的模块引用                 │
│ - Client Component 的 props                   │
└──────┬───────────────────────────────────────┘
       │
       │ response
       ▼
┌──────────────────────────────────────────────┐
│ Browser                                      │
│ - 显示服务端渲染出来的内容                    │
│ - 下载 Client Component 对应 JS chunk         │
│ - hydrate client boundary                    │
└──────┬───────────────────────────────────────┘
       │
       │ 用户点击筛选/分页
       ▼
┌──────────────────────────────────────────────┐
│ Client Component                             │
│ router.push("/present/commodity/list?...")   │
└──────┬───────────────────────────────────────┘
       │
       │ 触发新一轮 RSC 请求
       ▼
┌──────────────────────────────────────────────┐
│ Next Server 重新执行相关 Server Component      │
└──────────────────────────────────────────────┘
```

## Hydration 发生在哪里

Server Component 本身不需要 hydration。

需要 hydration 的是 Client Component。

```text
Server Component:
  服务端执行，产出渲染结果
  浏览器不重新执行它的组件逻辑

Client Component:
  服务端只记录边界和 props
  浏览器下载 JS 后执行
  绑定 onClick/onChange/useState 等交互
```

图示：

```text
Server render result:

┌──────────────────────────────────────────────┐
│ 商品列表页面                                  │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ 筛选区域 Client Boundary                 │ │
│ │ props: filters                           │ │
│ │ js: commodity-list-filters chunk          │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ 商品表格 Server-rendered                  │ │
│ │ 10004 / kibe / ¥1 / 待审核                │ │
│ │ 10003 / 雾白显示器支架 / ¥199 / 已下架     │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ 分页 Client Boundary                      │ │
│ │ props: currentPage, totalPages, filters   │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘

Browser hydration:

筛选区域 -> 下载 JS -> 绑定输入和按钮事件
分页区域 -> 下载 JS -> 绑定上一页/下一页事件
商品表格 -> 不需要组件 hydration，只显示服务端结果
```

## props 如何从 Server Component 传给 Client Component

Server Component 可以这样传普通可序列化数据：

```tsx
<CommodityListFiltersPanel filters={filters} />
```

这里的 `filters` 会被序列化进 RSC payload，然后浏览器恢复成 Client Component 的 props。

可以传：

```text
string
number
boolean
null
array
plain object
```

不应该从 Server Component 传给 Client Component：

```text
function
class instance
数据库连接
Request/Response 对象
不可序列化对象
```

所以这种写法不行：

```tsx
<ClientButton onClick={() => doSomethingOnServer()} />
```

如果要从客户端触发服务端行为，当前项目主要用两种方式：

```text
1. Client Component fetch("/api/...")
2. Client Component router.push()/router.refresh() 触发新一轮服务端渲染
```

## 当前项目里的典型组合

### 商品列表页

```text
Server:
- page.tsx
- commodity-list-content.tsx
- getCommodityListPageData()

Client:
- commodity-list-filters.tsx
- commodity-list-pagination.tsx
- commodity-image.tsx
```

交互流程：

```text
用户改筛选条件
  -> Client Component router.push(newUrl)
  -> Next 发起新 RSC 请求
  -> Server Component 重新取 list
  -> 浏览器合并新的 RSC payload
  -> 列表更新
```

### 商品详情页

```text
Server:
- app/present/commodity/[id]/page.tsx
- getCommodityDetail()

Client:
- commodity-edit-form.tsx
- commodity-delete-form.tsx
- commodity-status-form.tsx
```

交互流程：

```text
打开详情页
  -> Server Component 取商品详情
  -> 返回已带详情的页面

用户编辑商品
  -> Client Component fetch/PATCH
  -> 成功后 router.refresh()
  -> Server Component 重新取详情
  -> 页面显示最新数据
```

### 创建商品页

```text
Server:
- app/present/commodity/create/page.tsx

Client:
- commodity-create-form.tsx
- upload-demo.tsx
```

交互流程：

```text
打开创建页
  -> Server 返回页面框架

选择图片/提交表单
  -> Client Component 调上传/创建接口
  -> 成功后 router.push("/present/commodity/:id")
```

## Server Component 能做什么

适合放在 Server Component：

```text
- 读取 cookies()
- redirect()
- 服务端 fetch BFF
- 聚合多个接口
- 根据权限决定首屏内容
- 渲染首屏数据
- 减少发送到浏览器的 JS
```

当前项目例子：

```ts
const cookieStore = await cookies();
const response = await fetch(`${internalOrigin}/api/commodity/list?...`, {
  cache: "no-store",
  headers: {
    cookie: cookieStore.toString()
  }
});
```

## Client Component 能做什么

适合放在 Client Component：

```text
- useState
- useEffect
- useRouter
- onClick/onChange/onSubmit
- 读取 window/localStorage
- 文件上传
- 表单校验和即时反馈
- toast/loading/禁用按钮等交互状态
```

当前项目例子：

```tsx
"use client";

const router = useRouter();

function applyFilters() {
  router.push(`/present/commodity/list?${searchParams.toString()}`);
}
```

## Server Component 和 Client Component 的边界

```text
Server Component 可以 import Client Component
Client Component 不能 import Server Component
```

正确：

```tsx
// Server Component
import { CommodityListFiltersPanel } from "./commodity-list-filters";

export async function CommodityListContent() {
  const data = await getData();
  return <CommodityListFiltersPanel filters={data.filters} />;
}
```

错误：

```tsx
"use client";

// Client Component 里不应该 import Server-only data function
import { getCommodityListPageData } from "@/src/features/commodity/server";
```

如果 Client Component 需要数据更新，应该：

```text
- fetch API route
- 调 BFF rewrite
- router.refresh()
- router.push(new URL)
```

## 为什么筛选和分页是 Client Component

筛选和分页需要浏览器交互：

```text
输入 keyword
选择 status
点击筛选
点击重置
点击上一页/下一页
```

这些都需要事件处理，所以必须是 Client Component。

但点击后它们不直接负责取 list 数据，而是修改 URL：

```text
router.push("/present/commodity/list?page=1&pageSize=10...")
```

URL 改变后，Next 重新请求对应路由的 RSC payload。Server Component 再根据新 URL 取数据。

图示：

```text
┌──────────────────────────────┐
│ Client: Filters               │
│ 用户点击“筛选”                 │
└──────────────┬───────────────┘
               │
               │ router.push(newUrl)
               ▼
┌──────────────────────────────┐
│ Next Router                   │
│ 请求新的 RSC payload           │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Server: page.tsx              │
│ 读取新的 searchParams          │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Server: getCommodityList...   │
│ fetch BFF list                │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Browser                       │
│ 合并新 RSC，更新列表            │
└──────────────────────────────┘
```

## `router.refresh()` 在混合模式里的作用

`router.refresh()` 会要求 Next 重新获取当前路由的 Server Component 结果。

典型场景：

```text
Client Component 提交编辑接口成功
  -> 数据已经在 BFF/backend 改了
  -> router.refresh()
  -> 当前页面 Server Component 重新取详情
  -> UI 显示最新数据
```

它不是浏览器直接刷新整个页面，而是刷新当前路由的 RSC 数据。

## 这个架构的收益

```text
首屏数据：
  Server Component 负责，减少浏览器等待和额外 JS

用户交互：
  Client Component 负责，保留浏览器端体验

鉴权：
  Server Component 可以读 cookie 并转发给 BFF

刷新：
  router.push/router.refresh 触发服务端重新取数
```

## 一句话总结

Next App Router 通过 RSC payload 把 Server Component 的渲染结果、Client Component 的模块引用和 props 编排在一起。当前项目采用的是“Server Component 负责首屏数据和页面结构，Client Component 负责交互边界”的组合方式。

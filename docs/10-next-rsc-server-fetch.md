# Next Server Component 服务端取数链路

## 这个 case 在说明什么

访问商品列表页：

```text
http://localhost:3000/present/commodity/list?page=1&pageSize=10&sortBy=createdAt&sortOrder=desc
```

刷新页面时，浏览器 DevTools 里通常看不到单独的：

```text
/api/commodity/list
```

这不是接口没有调用，而是当前列表页使用的是 Next.js App Router 的 Server Component 首屏取数。真正的商品列表请求发生在 Next 服务端进程里，不发生在浏览器里。

## 当前代码入口

页面入口：

```tsx
// apps/client/app/present/commodity/list/page.tsx
export const dynamic = "force-dynamic";

export default async function CommodityListPage({ searchParams }: CommodityListPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  return <CommodityListContent searchParams={resolvedSearchParams} />;
}
```

列表内容组件：

```tsx
// apps/client/app/present/commodity/list/commodity-list-content.tsx
export async function CommodityListContent({ searchParams }: CommodityListContentProps) {
  const { filters, list, pagination, totalPages } = await getCommodityListPageData(searchParams);

  return (
    // 这里直接渲染已经取到的 list
  );
}
```

真正请求列表数据的位置：

```ts
// apps/client/src/features/commodity/server.ts
const response = await fetch(`${internalOrigin}/api/commodity/list?${query.toString()}`, {
  cache: "no-store",
  headers: {
    cookie
  }
});
```

这里的 `fetch()` 运行在 Next 服务端，不运行在浏览器。

## 刷新页面时的完整链路

```text
┌─────────────┐
│  Browser    │
└──────┬──────┘
       │
       │ 1. GET /present/commodity/list?page=1&pageSize=10...
       ▼
┌─────────────────────────────┐
│ Next.js Server              │
│ app/present/.../page.tsx    │
└──────┬──────────────────────┘
       │
       │ 2. render Server Component
       │    CommodityListPage
       │    CommodityListContent
       ▼
┌─────────────────────────────┐
│ getCommodityListPageData()  │
│ Server-side fetch           │
└──────┬──────────────────────┘
       │
       │ 3. fetch http://127.0.0.1:3000/api/commodity/list?...
       ▼
┌─────────────────────────────┐
│ Next /api rewrite           │
└──────┬──────────────────────┘
       │
       │ 4. proxy to http://localhost:3001/api/commodity/list?...
       ▼
┌─────────────────────────────┐
│ NestJS BFF                  │
│ CommodityController         │
└──────┬──────────────────────┘
       │
       │ 5. call backend mock service
       ▼
┌─────────────────────────────┐
│ NestJS Mock Backend         │
│ /api/commodity/list         │
└──────┬──────────────────────┘
       │
       │ 6. JSON data
       ▼
┌─────────────────────────────┐
│ Next.js Server              │
│ render list into RSC/HTML   │
└──────┬──────────────────────┘
       │
       │ 7. response to browser
       ▼
┌─────────────┐
│  Browser    │
│ show list   │
└─────────────┘
```

关键点：

- 浏览器只直接请求页面地址。
- `/api/commodity/list` 是 Next 服务端内部请求。
- BFF 收到请求，但浏览器 Network 不会显示这次服务端内部请求。
- 页面返回时已经包含商品列表渲染结果。

## 为什么 DevTools 里看不到 list 接口

浏览器 DevTools 只能看到浏览器自己发出的请求。

当前请求发生在这里：

```text
Next.js Server -> BFF -> Backend
```

不发生在这里：

```text
Browser -> BFF
```

所以浏览器 Network 里看不到 `/api/commodity/list` 是正常的。

## 和传统 Client Component 取数的区别

### 当前 Server Component 模式

```text
Browser
  │
  │ GET /present/commodity/list
  ▼
Next Server
  │
  │ fetch /api/commodity/list
  ▼
BFF / Backend
  │
  │ return JSON
  ▼
Next Server
  │
  │ render page with data
  ▼
Browser
  │
  │ show completed list
```

特点：

- 首屏返回时已经有列表。
- 浏览器不需要额外请求列表接口。
- BFF cookie 鉴权可以在服务端完成。
- 适合 URL query 决定的数据页面。

### Client Component 模式

```text
Browser
  │
  │ GET /present/commodity/list
  ▼
Next Server
  │
  │ return page shell
  ▼
Browser
  │
  │ download JS
  │ run useEffect()
  │ fetch /api/commodity/list
  ▼
BFF / Backend
  │
  │ return JSON
  ▼
Browser
  │
  │ setState()
  │ render list
```

特点：

- 浏览器 Network 能看到 `/api/commodity/list`。
- 首屏通常先显示空壳、loading 或 skeleton。
- 更适合复杂交互、局部刷新、轮询、无限滚动、前端缓存。

## `?_rsc=...` 是什么

如果看到类似请求：

```text
/present/commodity/list?_rsc=5lcpw
```

这是 Next App Router 的 React Server Component flight 请求。它不是普通 JSON，也不是完整 HTML。

当用户通过 `<Link>`、`router.push()`、筛选、分页等方式导航时，Next 可能请求 RSC payload，而不是重新请求完整 HTML。

这时链路仍然是：

```text
Browser -> Next RSC endpoint -> Server Component -> BFF list -> Backend list
```

只是浏览器看到的是 `?_rsc=...`，不是 `/api/commodity/list`。

## `dynamic` 和 `cache: "no-store"` 的作用

当前页面有：

```ts
export const dynamic = "force-dynamic";
```

含义：

- 这个页面不要被当成静态页面预渲染。
- 每次请求都走服务端动态渲染。

当前 fetch 有：

```ts
cache: "no-store";
```

含义：

- 这次数据请求不走 Next fetch cache。
- 每次渲染都重新请求列表数据。

所以刷新页面时，理论上会重新触发服务端列表请求，只是这个请求不出现在浏览器 DevTools 的 Network 面板里。

## Cookie 是怎么传给 BFF 的

Server Component 里可以读取当前请求的 cookie：

```ts
const cookieStore = await cookies();
const cookie = cookieStore.toString();
```

然后请求 BFF 时带上：

```ts
headers: {
  cookie;
}
```

BFF 的 `AuthGuard` 就能通过 `next_bff_session` 识别当前登录用户。

这也是 Server Component 取数适合当前项目的原因：首屏数据需要登录态，Next 服务端可以安全地转发 cookie。

## 怎么确认 list 真的被调用

不要只看浏览器 Network。可以看这几个位置：

```text
pnpm dev:client 的终端
pnpm dev:bff 的终端
pnpm dev:server 的终端
```

也可以临时在 `getCommodityListPageData()` 加日志：

```ts
console.log("server fetching commodity list", query.toString());
```

这个日志会出现在 Next dev server 终端，不会出现在浏览器 console。

也可以直接观察 BFF 日志，路径应该类似：

```text
GET /api/commodity/list?page=1&pageSize=10&sortBy=createdAt&sortOrder=desc
```

## 什么时候应该继续用 Server Component

适合：

- 首屏列表。
- 详情页首屏数据。
- 数据由 URL query 或 path param 决定。
- 需要 cookie 鉴权。
- 希望减少浏览器端 loading。
- 不需要高频局部刷新。

当前商品列表页属于这个类型。

## 什么时候应该改成 Client Component

适合：

- 输入框 debounce 搜索。
- 不改 URL 的局部筛选。
- 轮询刷新。
- 无限滚动。
- 乐观更新。
- 浏览器侧缓存和重试。
- 明确要求浏览器 Network 里看到 `/api/commodity/list`。

如果改成 Client Component，代码形态会变成：

```tsx
"use client";

useEffect(() => {
  fetch(`/api/commodity/list?${query}`)
    .then((response) => response.json())
    .then((payload) => {
      setList(payload.data.list);
    });
}, [query]);
```

但这会牺牲当前 Server Component 首屏直接带数据的优势。

## 一句话总结

当前商品列表刷新页面时没有在浏览器 Network 里看到 `/api/commodity/list`，是因为列表数据在 Next Server Component 渲染阶段由服务端调用 BFF 获取。浏览器收到的是已经渲染好的页面或 RSC payload，而不是自己再发一个列表接口请求。

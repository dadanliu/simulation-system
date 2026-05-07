# 当前系统图片缓存策略

## 结论

当前项目里图片相关链路分成两套：

```text
1. 商品业务 JSON 里的 imageUrl
   当前页面实际使用它渲染图片。

2. BFF /api/files/:fileId
   保留了签名 URL、Cache-Control、ETag、Last-Modified、304 等缓存策略。
```

但要注意一个当前实现细节：

```text
LOCAL_UPLOAD_PUBLIC_BASE_URL=http://localhost:3002/uploads
```

会让上传结果返回类似：

```text
http://localhost:3002/uploads/commodity/local_xxx.jpg
```

可是 `apps/server` 目前没有挂载 `/uploads` 静态目录，所以这个公开 URL 当前不是完整可用的静态资源服务。也就是说：

```text
当前真正实现了缓存响应头的链路是 BFF /api/files/:fileId
当前页面商品 imageUrl 直连公开 URL 的链路还缺少静态资源服务挂载
```

## 当前图片相关代码位置

前端图片组件：

```tsx
// apps/client/src/components/commodity-image.tsx
<Image
  alt={alt}
  className={className}
  height={height}
  onError={() => setFailed(true)}
  priority={priority}
  sizes={sizes}
  src={src}
  unoptimized
  width={width}
/>
```

这里设置了：

```text
unoptimized
```

含义：

- 不走 Next `/_next/image` 图片优化器。
- 浏览器直接请求 `src`。
- 缓存策略取决于 `src` 对应服务返回的 HTTP header。

上传服务返回图片 URL：

```ts
// apps/bff/src/upload/upload.service.ts
return {
  fileId: result.fileId ?? result.uploadId,
  mimeType: result.mimeType ?? result.fileType,
  scanStatus: result.scanStatus,
  scene: result.scene,
  size: result.size ?? result.fileSize,
  url: result.url
};
```

本地存储生成 URL：

```ts
// apps/server/src/mock-backend/storage/local-storage.service.ts
return {
  driver: "local",
  fileId,
  key,
  url: `${publicBaseUrl.replace(/\/$/, "")}/${key}`
};
```

BFF 文件代理缓存逻辑：

```ts
// apps/bff/src/upload/file.controller.ts
response.setHeader("Cache-Control", this.buildPublicCacheControl(cacheProfile));
response.setHeader("CDN-Cache-Control", this.buildCdnCacheControl(cacheProfile));
response.setHeader("Surrogate-Control", this.buildCdnCacheControl(cacheProfile));
response.setHeader("ETag", etag);
response.setHeader("Last-Modified", lastModified.toUTCString());
```

## 图片上传后的存储位置

当前本地开发配置：

```env
STORAGE_DRIVER=local
LOCAL_UPLOAD_DIR=.dev/uploads
LOCAL_UPLOAD_PUBLIC_BASE_URL=http://localhost:3002/uploads
UPLOAD_REGISTRY_PATH=.dev/upload-registry.json
```

因为 server 进程工作目录是 `apps/server`，所以实际文件通常在：

```text
apps/server/.dev/uploads/<scene>/<fileId>-<filename>
```

例如：

```text
apps/server/.dev/uploads/commodity/local_c2b02469-...jpg
```

文件索引在：

```text
apps/server/.dev/upload-registry.json
```

## 当前实际页面图片请求链路

```text
┌─────────────────────┐
│ Browser              │
│ 商品列表/详情页面     │
└──────────┬──────────┘
           │
           │ 1. 页面拿到商品 JSON
           ▼
┌─────────────────────┐
│ CommodityImage       │
│ next/image           │
│ unoptimized          │
└──────────┬──────────┘
           │
           │ 2. 浏览器直接请求 imageUrl
           ▼
┌──────────────────────────────────────┐
│ http://localhost:3002/uploads/...     │
│ 当前配置生成的公开图片 URL             │
└──────────┬───────────────────────────┘
           │
           │ 3. 当前 server 未挂载 /uploads 静态目录
           ▼
┌─────────────────────┐
│ 404 Not Found        │
└─────────────────────┘
```

这条链路当前没有形成有效缓存，因为资源本身没有被静态服务正确返回。

如果后续补上静态目录挂载，那么缓存策略就要由静态资源服务决定。例如：

```text
Cache-Control: public, max-age=31536000, immutable
```

或者在开发环境保守一点：

```text
Cache-Control: public, max-age=300
```

## BFF /api/files 的缓存链路

BFF 文件代理当前仍然存在，并且缓存策略是完整的。

链路图：

```text
┌─────────────────────┐
│ Browser / CDN        │
└──────────┬──────────┘
           │
           │ GET /api/files/:fileId?variant=thumb&v=...&expires=...&signature=...
           ▼
┌─────────────────────┐
│ BFF FileController   │
└──────────┬──────────┘
           │
           │ 1. 校验 session 或签名 URL
           ▼
┌─────────────────────┐
│ FileUrlService       │
│ verify signature     │
└──────────┬──────────┘
           │
           │ 2. 选择缓存 profile
           ▼
┌─────────────────────┐
│ Cache Profile        │
│ thumb/detail/preview │
└──────────┬──────────┘
           │
           │ 3. 代理请求 backend /api/files/:fileId
           ▼
┌─────────────────────┐
│ Mock Backend         │
│ File Registry        │
│ Local/S3/OSS Storage │
└──────────┬──────────┘
           │
           │ 4. 返回图片字节
           ▼
┌─────────────────────┐
│ BFF Response         │
│ Cache-Control        │
│ ETag                 │
│ Last-Modified        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Browser / CDN Cache  │
└─────────────────────┘
```

## BFF 文件代理的两种缓存策略

### 1. 登录态直连

如果请求没有合法签名 URL，但有登录 session：

```text
Cache-Control: private, no-store
Pragma: no-cache
Vary: Cookie, Accept
```

含义：

- 这是私有访问。
- 不允许公共缓存。
- 不建议浏览器长期缓存。
- 响应随 Cookie 变化。

适合：

```text
用户直接访问私有文件
需要权限隔离
不希望 CDN 缓存
```

### 2. 签名 URL 访问

如果请求带合法签名：

```text
Cache-Control: public, max-age=..., stale-while-revalidate=..., immutable
CDN-Cache-Control: public, max-age=..., stale-while-revalidate=..., immutable
Surrogate-Control: public, max-age=..., stale-while-revalidate=..., immutable
ETag: "..."
Last-Modified: ...
Vary: Accept
```

含义：

- 可以被浏览器缓存。
- 可以被 CDN 缓存。
- `immutable` 表示 URL 不变时资源内容不应该变化。
- `stale-while-revalidate` 允许 CDN 在后台刷新时短暂使用旧缓存。
- `ETag` 和 `Last-Modified` 支持条件请求。

适合：

```text
列表缩略图
详情图
上传后预览图
CDN 分发
```

## thumb/detail/preview 的 TTL 区分

BFF 的 `FileUrlService` 把图片访问分成三种语义：

```ts
export type FileImageVariant = "detail" | "preview" | "thumb";
```

### thumb

用于列表缩略图。

默认策略：

```text
Cache-Control: public, max-age=31536000, stale-while-revalidate=86400, immutable
```

环境变量：

```env
FILE_CACHE_THUMB_MAX_AGE_SECONDS=31536000
FILE_CACHE_THUMB_STALE_WHILE_REVALIDATE_SECONDS=86400
```

### detail

用于详情大图。

默认策略：

```text
Cache-Control: public, max-age=31536000, stale-while-revalidate=86400, immutable
```

环境变量：

```env
FILE_CACHE_DETAIL_MAX_AGE_SECONDS=31536000
FILE_CACHE_DETAIL_STALE_WHILE_REVALIDATE_SECONDS=86400
```

### preview

用于上传后的临时预览。

默认策略：

```text
Cache-Control: public, max-age=300, stale-while-revalidate=60
```

环境变量：

```env
FILE_CACHE_PREVIEW_MAX_AGE_SECONDS=300
FILE_CACHE_PREVIEW_STALE_WHILE_REVALIDATE_SECONDS=60
```

`preview` 不加 `immutable`，因为上传后预览更偏临时态。

## 版本参数如何让旧缓存失效

BFF 签名 URL 支持版本参数：

```text
v=<version>
```

签名内容包含：

```text
fileId
variant
version
expires
```

图示：

```text
商品未换图：

/api/files/local_1?variant=thumb&v=2026-05-07T06:16:16.919Z&signature=aaa
       │
       └── URL 稳定，浏览器/CDN 可以命中缓存

商品换图或更新时间变化：

/api/files/local_2?variant=thumb&v=2026-05-07T08:30:00.000Z&signature=bbb
       │
       └── URL 变化，浏览器/CDN 当作新资源重新请求
```

这个策略叫：

```text
通过 URL version 做 cache busting
```

它比强制清 CDN 更简单，也更适合商品图片这类资源。

## 条件请求与 304

BFF 文件代理支持：

```text
If-None-Match
If-Modified-Since
```

处理流程：

```text
┌─────────────────────┐
│ Browser / CDN        │
│ 已有缓存             │
└──────────┬──────────┘
           │
           │ GET /api/files/:fileId
           │ If-None-Match: "etag"
           ▼
┌─────────────────────┐
│ BFF FileController   │
│ 计算当前 ETag        │
└──────────┬──────────┘
           │
           │ ETag 一致
           ▼
┌─────────────────────┐
│ 304 Not Modified     │
│ 不返回图片 body       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Browser / CDN        │
│ 复用本地缓存 body     │
└─────────────────────┘
```

收益：

- 减少图片字节传输。
- 保留缓存正确性。
- 对大图尤其有价值。

## Next/Image 当前为什么使用 unoptimized

当前组件使用：

```tsx
unoptimized;
```

原因是之前遇到过：

```text
/_next/image?url=... -> 400 "url" parameter is not allowed
```

`unoptimized` 后：

```text
Browser -> imageUrl
```

而不是：

```text
Browser -> /_next/image -> imageUrl
```

这会让缓存策略完全交给图片源站或 CDN。

图示：

```text
未使用 unoptimized:

Browser
  -> /_next/image?url=<imageUrl>&w=64&q=75
  -> Next Image Optimizer
  -> imageUrl

使用 unoptimized:

Browser
  -> imageUrl
```

当前项目选择 `unoptimized` 是为了让签名 URL / 公开资源 URL 直接生效，避免 Next 图片优化器拦截。

## 当前系统的真实状态

| 链路                                | 当前是否实现 | 是否有缓存策略                            | 说明                                     |
| ----------------------------------- | ------------ | ----------------------------------------- | ---------------------------------------- |
| 商品 JSON 返回 `imageUrl`           | 已实现       | 无直接缓存，JSON 用页面取数控制           | Server Component 用 `cache: "no-store"`  |
| 前端 `<CommodityImage />`           | 已实现       | 不缓存组件本身                            | `unoptimized`，缓存取决于图片 URL 响应头 |
| `http://localhost:3002/uploads/...` | URL 会生成   | 当前未形成有效缓存                        | server 未挂载 `/uploads` 静态目录        |
| BFF `/api/files/:fileId` 登录态访问 | 已实现       | `private, no-store`                       | 私有文件访问策略                         |
| BFF `/api/files/:fileId` 签名访问   | 已实现       | `public + max-age + swr + immutable`      | 最完整的图片缓存策略                     |
| ETag / Last-Modified / 304          | 已实现       | 仅 BFF 文件代理链路                       | 用于条件请求                             |
| CDN 专用 header                     | 已实现       | `CDN-Cache-Control` / `Surrogate-Control` | 仅 BFF 签名访问链路                      |

## 推荐收敛方向

当前最清晰的生产化方向有两个，建议选一个，不要长期混用。

### 方案 A：走公开静态资源/CDN

适合：

```text
商品图片本身不需要权限保护
图片可以公开访问
未来接 S3/OSS/CDN
```

链路：

```text
Browser
  -> CDN / uploads URL
  -> object storage
```

需要补齐：

```text
本地开发挂载 /uploads 静态目录
为 /uploads 设置 Cache-Control
生产环境用 S3/OSS/CDN header 管理缓存
```

### 方案 B：走 BFF 签名文件代理

适合：

```text
图片需要权限边界
希望 BFF 统一控制签名、TTL、缓存版本
希望隐藏真实存储地址
```

链路：

```text
Browser / CDN
  -> BFF /api/files/:fileId?variant=thumb&v=...&signature=...
  -> backend storage
```

需要补齐：

```text
商品接口重新返回 BFF 签名图片 URL
前端继续使用 unoptimized 或配置 Next remotePatterns
确认 CDN 对签名 URL 的缓存策略
```

## 一句话总结

当前代码里，BFF `/api/files/:fileId` 已经实现了完整的图片缓存策略，包括私有 no-store、签名公共缓存、CDN header、ETag、Last-Modified 和 304；但当前商品页面实际使用的是上传返回的公开 `imageUrl`，而本地 server 还没有挂载 `/uploads` 静态目录，所以这条展示链路还没有真正落地缓存策略。

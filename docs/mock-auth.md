# Mock Auth API

本文记录本地 mock auth 接口的 curl 调用方式。

## 启动服务

先在仓库根目录启动三层服务：

```bash
pnpm dev:all
```

启动成功后端口为：

```text
client: http://localhost:3000
bff:    http://localhost:3001
server: http://localhost:3002
```

推荐通过 client 端口 `3000` 访问 auth 接口：

```text
http://127.0.0.1:3000/api/auth/*
```

原因是 `apps/client/next.config.ts` 已将 `/api/auth/*` 代理到 BFF，浏览器访问时是同源请求，更接近真实前端使用方式。

## 测试账号

当前 mock 用户定义在 `apps/bff/src/auth/mock-users.ts`。

```text
username: admin
password: admin123
```

也可以使用：

```text
username: operator
password: operator123
```

## 1. 登录

调用 `POST /api/auth/login`：

```bash
curl -i \
  -c /tmp/next-bff-auth.cookie \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  http://127.0.0.1:3000/api/auth/login
```

成功响应会包含 `Set-Cookie`：

```text
set-cookie: next_bff_session=...; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400
```

响应体示例：

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "u_admin_001",
      "username": "admin",
      "name": "Admin User",
      "role": "admin"
    }
  }
}
```

说明：

- `-c /tmp/next-bff-auth.cookie` 表示把响应里的 cookie 保存到本地文件。
- `Set-Cookie` 是响应头，不会出现在 request headers。
- 登录成功后，后续请求需要用 `-b /tmp/next-bff-auth.cookie` 带上 cookie。

## 2. 获取当前用户

调用 `GET /api/auth/me`：

```bash
curl -i \
  -b /tmp/next-bff-auth.cookie \
  http://127.0.0.1:3000/api/auth/me
```

成功响应：

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "u_admin_001",
      "username": "admin",
      "name": "Admin User",
      "role": "admin"
    }
  }
}
```

未登录、cookie 缺失或 session 过期时返回：

```text
HTTP/1.1 401 Unauthorized
```

## 3. 登出

调用 `POST /api/auth/logout`：

```bash
curl -i \
  -b /tmp/next-bff-auth.cookie \
  -c /tmp/next-bff-auth.cookie \
  -X POST \
  http://127.0.0.1:3000/api/auth/logout
```

成功响应会清除 cookie：

```text
set-cookie: next_bff_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0
```

响应体：

```json
{
  "success": true,
  "message": "logout success"
}
```

说明：

- `-b /tmp/next-bff-auth.cookie` 表示请求时带上已保存的 cookie。
- `-c /tmp/next-bff-auth.cookie` 表示把登出响应里的清 cookie 结果写回 cookie 文件。
- 登出接口是幂等的，即使未登录也会返回成功并下发清 cookie 响应。

## 4. 验证登出结果

登出后再次访问 `/api/auth/me`：

```bash
curl -i \
  -b /tmp/next-bff-auth.cookie \
  http://127.0.0.1:3000/api/auth/me
```

预期返回：

```text
HTTP/1.1 401 Unauthorized
```

## 5. 直接访问 BFF

如果不走 client rewrite，也可以直接访问 BFF 端口 `3001`：

```bash
curl -i \
  -c /tmp/next-bff-auth.cookie \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  http://127.0.0.1:3001/api/auth/login
```

后续 `/me` 和 `/logout` 也可以把 URL 中的 `3000` 改成 `3001`。

浏览器和 client 页面建议走 `3000`，curl 调试接口时两种方式都可以。

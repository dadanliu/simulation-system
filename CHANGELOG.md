# Changelog

## 2026-04-24

### 路由与页面骨架

已完成以下页面骨架：

- `/`
- `/login`
- `/present/layout.tsx`
- `/present/commodity/list`
- `/present/commodity/[id]`
- `/present/commodity/create`

当前行为：

- 访问 `/` 会重定向到 `/present/commodity/list`
- `/present/layout.tsx` 已作为后台区域公共布局
- 后台页面壳已包含左侧导航区和顶部信息区

### 页面链路补充

补充了页面之间的基础跳转入口：

- 列表页可跳转到创建页
- 列表页可跳转到登录页
- 列表页可跳转到商品详情页
- 详情页可返回列表页
- 详情页可跳转到创建页
- 创建页可返回列表页

### 菜单激活状态修复

修复前：

- 左侧菜单高亮状态写死在路由配置里
- 地址变化后，菜单激活状态不会更新

修复后：

- 菜单激活状态基于当前 `pathname` 实时计算
- `/present/commodity/list` 会高亮“商品列表”
- `/present/commodity/create` 会高亮“创建商品”
- `/present/commodity/:id` 会高亮“商品详情”
- `/login` 会高亮“登录页”

### 顶部信息区联动

顶部信息区已改为根据当前路由动态展示：

- 页面标题
- 页面描述
- 当前路径

### 涉及文件

- `apps/client/app/present/commodity/list/page.tsx`
- `apps/client/app/present/commodity/[id]/page.tsx`
- `apps/client/app/present/commodity/create/page.tsx`
- `apps/client/src/components/side-nav.tsx`
- `apps/client/src/components/top-bar.tsx`
- `apps/client/src/lib/routes.ts`
- `apps/client/app/globals.css`

### 验证结果

- `pnpm build` 已通过

### 登录与会话

已完成以下能力：

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- 登录成功后写入会话 cookie
- 登出后清除会话 cookie
- `get-current-user`
- `require-login`

当前实现位置：

- `apps/bff/src/routes/auth.js`
- `apps/bff/src/auth/get-current-user.js`
- `apps/bff/src/auth/require-login.js`
- `apps/bff/src/auth/session-cookie.js`
- `apps/bff/src/session-store.js`

当前会话设计：

- BFF 使用内存 `Map` 保存 session
- 登录成功后写入 `next_bff_session` cookie
- `/api/auth/me` 会基于 cookie 读取当前用户
- `/api/auth/logout` 会删除 session 并清空 cookie

本地验证结果：

- 未登录访问 `/api/auth/me` 返回 `401 Unauthorized`
- 使用 `admin / admin123` 登录成功，响应包含 `Set-Cookie`
- 带 cookie 访问 `/api/auth/me` 可返回当前用户
- 登出后响应包含清 cookie 的 `Set-Cookie`
- 登出后再次访问 `/api/auth/me` 返回 `401 Unauthorized`

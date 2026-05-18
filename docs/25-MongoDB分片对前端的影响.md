# 9.4 MongoDB 分片对前端的影响

分片不是前端直接配置的东西，但它会改变列表接口的查询代价。 同一个商品列表，如果请求里带了正确的租户上下文，MongoDB 可以定向到少量分片；如果缺少 shard key，就可能变成跨分片查询。 所以前端要懂一点分片，核心不是运维数据库，而是设计正确的查询参数、分页方式和异常兜底。

### 查询路由

`tenantId`这类 shard key 决定请求是定向查一个分片，还是广播到多个分片。

### 分页排序

深页`offset`和全局排序在分片下成本更高，规模上来后应升级`cursor`。

### 前端兜底

分片迁移、热点租户会导致部分接口抖动，页面需要 loading、重试、错误提示和 traceId。

## 一、先用当前商品列表举例

当前系统已经新增了演示级租户上下文。mock 用户都有`tenantId=tenant_demo`，BFF 从登录态读取这个值，并通过`x-tenant-id`可信转发给 backend；前端 URL 不需要也不能伪造 tenantId。

```text
GET /present/commodity/list?page=1&pageSize=10&status=on_sale&sortBy=createdAt&sortOrder=desc

Next 页面 -> BFF /api/commodity/list
BFF -> header: x-tenant-id=tenant_demo
BFF -> backend /api/commodity/list?limit=10&offset=0&status=on_sale&sortField=createdAt
backend -> MongoDB commodities.find({ tenantId: "tenant_demo", deletedAt: null, status: "on_sale" }).sort({ createdAt: -1, id: -1 })
```

这个阶段前端关心的是`page`、`pageSize`、`status`、`sortBy`是否合法；backend 通过`idx_commodities_tenant_active_status_created_at_id`这类索引减少扫描。

列表响应会返回`sharding.routingMode`、`shardName`和`tenantHash`，BFF 也会把这些值写到响应 header，排查时可以直接从 Network 面板看本次请求是定向分片还是跨分片。

## 二、本次系统内新增了什么

| 能力 | 当前代码 | 真实例子 |
| --- | --- | --- |
| 可信租户上下文 | `AuthUser.tenantId` 、 `x-tenant-id` 、 `RequestHeadersService` | operator 登录后，BFF 注入 `tenant_demo` ，不是让前端 body 自己传。 |
| 租户隔离查询 | backend 商品查询统一加 `{ tenantId, deletedAt }` 。 | 租户 A 打开商品 10001，只能查到自己租户下的 10001。 |
| 分片路由观测 | 响应和日志包含 `routingMode` 、 `shardName` 、 `tenantHash` 。 | Network 看到 `X-Commodity-List-Routing-Mode=targeted` ，说明本次有 shard key。 |
| cursor 分页预留 | backend 支持 `cursor` ，前端下一页优先使用 `pagination.nextCursor` 。 | 第一页最后一条是 10002，下一页用它的 `createdAt + id` 继续读，不靠深页 skip。 |
| 前端兜底 | 列表已有 `loading.tsx` 、 `error.tsx` 、重试按钮和 traceId 上报。 | 分片迁移导致接口超时，页面显示失败信息并保留 traceId 给后端排查。 |

## 三、当前系统变量流动图

当前系统不是直接把 MongoDB 部署成真实 shard 集群，而是用`tenantId`模拟 shard key 对前端、BFF、backend、MongoDB 查询和排障信息的影响。重点看变量从哪里输入、在哪里转换、在哪里输出、最后被谁消费。

### 当前系统 MongoDB 分片变量流动图

```text
浏览器输入
page / status / sortBy
cursor 可选
登录态输入
AuthUser.tenantId
tenant_demo
BFF 转换
page -> offset
sortBy -> sortField
tenantId -> x-tenant-id
backend 接收
request.headers["x-tenant-id"]
tenantContext
组装查询
filters.tenantId
filters.status / createdAt
sort / cursor / limit
MongoDB 查询
commodities.find(filters)
tenant 前缀索引
单集合模拟
backend 输出
list / pagination
sharding.routingMode
queryPlan.candidateIndex
tenantHash / shardName
BFF 响应头
X-Commodity-List-Routing-Mode
X-Commodity-List-Shard-Name
X-Commodity-List-Candidate-Index
X-Commodity-List-Query-Cost
前端消费
查询路由卡片
分片 / 租户标识
候选索引 / 查询成本
Network 排障
说明：当前 shardName 是根据 tenantId hash 计算的模拟结果，不代表真实 MongoDB shard 机器。
```

## 四、关键变量从哪里来、往哪里去

| 变量 | 输入位置 | 中间流动 | 输出 / 消费 |
| --- | --- | --- | --- |
| `tenantId` | 用户登录态里的 `AuthUser.tenantId` ，当前 mock 用户默认 `tenant_demo` 。 | BFF 调 backend 时通过 `x-tenant-id` header 传递。 | backend 变成 `tenantContext` ，进入 `filters.tenantId` ；同时生成 `tenantHash` 。 |
| `query` | 浏览器 URL： `page` 、 `pageSize` 、 `status` 、 `sortBy` 、 `cursor` 。 | BFF 转换成 backend 参数： `limit` 、 `offset` 、 `sortField` 、 `sortDirection` 。 | backend 生成 MongoDB `filters` 、 `sort` 和 `cursor` 条件。 |
| `filters` | backend 根据租户、状态、时间、价格、库存、关键词组装。 | 传给 `commodityModel.find(filters)` 和 `countDocuments(countFilters)` 。 | MongoDB 返回 `commodities` 和 `total` 。 |
| `sharding` | backend 的 `buildShardingDebug(tenantContext)` 。 | 根据 tenantId 是否存在输出 `targeted` 或 `broadcast` ，并计算模拟 `shardName` 。 | 返回到 JSON body；BFF 写成 `X-Commodity-List-Routing-Mode` 、 `X-Commodity-List-Shard-Name` 、 `X-Commodity-List-Tenant-Hash` 。 |
| `queryPlan` | backend 根据筛选、排序、分页形态计算。 | 选择 `candidateIndex` ，判断 `coveredByIndex` 、 `costLevel` 和 `unsupportedFilters` 。 | 前端列表卡片展示候选索引和查询成本；BFF 写 `X-Commodity-List-Candidate-Index` 等 header。 |
| `cacheDebug` | BFF 的 `commodityCacheService.readCommodityList(...)` 根据缓存命中结果生成。 | `CommodityService` 把 `state` 、 `source` 、 `refresh` 和 `keyHash` 挂到 `request.commodityListCacheDebug` 。 | controller 写成 `X-Commodity-List-Cache-State` 等 header；日志拦截器写入结构化日志，前端主要通过 Network 面板排查。 |
| `nextCursor` | backend 根据本页最后一条商品的 `createdAt + id` 生成。 | 返回到 `pagination.nextCursor` 。 | 前端点击下一页时把它放回 URL 的 `cursor` ，下一次请求继续往后读。 |

## 五、一次商品列表请求的真实数据样例

用户输入的是页面 URL 和登录态，系统输出的是商品列表、分片排障信息和索引排障信息。

```text
// 1. 浏览器输入
GET /present/commodity/list?page=1&pageSize=10&status=on_sale&sortBy=createdAt&sortOrder=desc

// 2. BFF 从登录态取到
user.tenantId = "tenant_demo"
user.id = "u_operator_001"

// 3. BFF 转发给 backend
GET /api/commodity/list?limit=10&offset=0&status=on_sale&sortField=createdAt&sortDirection=desc
x-tenant-id: tenant_demo
x-user-id: u_operator_001

// 4. BFF 先判断列表缓存状态
cacheDebug = {
  state: "fresh",
  source: "redis",
  refresh: "none",
  keyHash: "f4c1a9e0"
}

// 5. backend 组装 MongoDB 查询
filters = {
  tenantId: "tenant_demo",
  deletedAt: null,
  status: "on_sale"
}
sort = { createdAt: -1, id: -1 }

// 6. backend 输出给 BFF / 前端
{
  list: [...],
  pagination: {
    mode: "offset",
    nextCursor: "eyJjcmVhdGVkQXQiOiIyMDI2...",
    page: 1,
    pageSize: 10,
    total: 3
  },
  sharding: {
    routingMode: "targeted",
    shardKey: "tenantId",
    shardName: "shard-1",
    tenantHash: "b7a3..."
  },
  queryPlan: {
    candidateIndex: "idx_commodities_tenant_active_status_created_at_id",
    coveredByIndex: true,
    costLevel: "low",
    unsupportedFilters: []
  }
}

// 7. BFF 写到响应 header，方便 Network 面板直接排障
X-Cache-Layer: bff-redis
X-Commodity-List-Cache-State: fresh
X-Commodity-List-Cache-Source: redis
X-Commodity-List-Cache-Refresh: none
X-Commodity-List-Cache-Key: f4c1a9e0
X-Commodity-List-Routing-Mode: targeted
X-Commodity-List-Shard-Key: tenantId
X-Commodity-List-Shard-Name: shard-1
X-Commodity-List-Candidate-Index: idx_commodities_tenant_active_status_created_at_id
X-Commodity-List-Query-Cost: low
```

### cacheDebug / sharding / queryPlan 怎么生产、流动、消费

这三个变量不是用户填写的业务字段，而是系统自己生成的排障字段。真实排查时可以这样理解：`cacheDebug`回答“旧数据是不是缓存导致的”，`sharding`回答“请求打到哪个分片”，`queryPlan`回答“这次查询大概贵不贵、用了哪个索引”。

### cacheDebug sharding queryPlan 三个排障变量流动图

```text
请求输入
URL query
登录态 tenantId
traceId
BFF 生产 cacheDebug
readCommodityList()
state: fresh / stale / miss
source: redis / backend
request.commodityListCacheDebug
backend 生产 sharding
x-tenant-id -> tenantContext
buildShardingDebug()
routingMode / shardName
tenantHash
backend 生产 queryPlan
filters + sort + pagination
buildQueryPlan()
candidateIndex / costLevel
unsupportedFilters
BFF header
X-Commodity-List-Cache-*
X-Commodity-List-Shard-*
X-Commodity-List-Query-*
JSON body
list / pagination
sharding
queryPlan
结构化日志
cache state / key
routing mode
query cost
前端页面
分片卡片
索引卡片
traceId 报错
排障人员
Network headers
日志按 traceId 查
判断慢在哪里
```

| 变量 | 谁生产 | 怎么流动 | 谁消费 | 真实排查例子 |
| --- | --- | --- | --- | --- |
| `cacheDebug` | BFF 缓存层。 | 先挂在 `request.commodityListCacheDebug` ，再写到响应 header 和结构化日志。 | Network 面板、日志平台、排查人员。 | 状态已经改了但列表没变，先看 `X-Commodity-List-Cache-State` 。如果是 `stale` ，说明用户拿到旧缓存，后台正在刷新。 |
| `sharding` | backend 查询层。 | 从 `x-tenant-id` 生成，进入 JSON body；BFF 同步写 `X-Commodity-List-Routing-Mode` 等 header。 | 前端分片卡片、Network 面板、后端日志。 | 某个租户很慢时，看 `routingMode=targeted` 和 `shardName=shard-2` ，判断是不是某个分片或租户热点。 |
| `queryPlan` | backend 查询规划辅助逻辑。 | 根据筛选、排序、分页生成，进入 JSON body；BFF 同步写 `X-Commodity-List-Candidate-Index` 和 `X-Commodity-List-Query-Cost` 。 | 前端索引卡片、Network 面板、后端排查。 | 列表突然变慢时，看 `costLevel` 是否变成 `high` ，再看 `unsupportedFilters` 是否出现新筛选项。 |

### 单独拆开看 cacheDebug

`cacheDebug`是 BFF 为“商品列表缓存排障”临时生成的调试变量。它不是商品字段，不进 MongoDB，也不由前端传入。它只描述“这一次列表请求的缓存状态”：数据从 Redis 来，还是从 backend 来；缓存是新鲜的，还是旧但可用；有没有后台刷新。

### cacheDebug 从创建到读取更新删除的完整流程

```text
1. 输入
用户打开列表
URL + 登录态
page/status/tenantId
2. 生成 cacheKey
tenantId + roles
+ backendPath
next-bff:commodity:list:...
3. 读 Redis
readCommodityList()
miss / fresh / stale
返回 data + key + state
4. 创建 cacheDebug
state/source/refresh
keyHash
挂到 request
5. 读取消费
controller 读 request
写 X-Commodity-List-Cache-*
interceptor 写日志
6. 更新缓存数据
miss: backend 后写 Redis
stale: 后台 refresh
cacheDebug 下次重建
7. 删除/失效
写操作 scan + del
TTL 到期自动过期
request 结束即释放
关键区别：Redis 保存的是列表缓存数据；cacheDebug 只保存在当前请求对象、响应 header 和日志里。
```

### cacheDebug 的真实状态流转

### cacheDebug 不同请求路径下的状态字段变化

```text
场景 A：第一次打开列表
GET 列表
status=on_sale
Redis: null
read state=miss
查 backend
写 Redis list v1
cacheDebug
state=miss, source=backend, refresh=none
场景 B：5 秒内再次打开
GET 同一列表
同 tenantId/roles
Redis: list v1
freshUntil >= now
不查 backend
直接返回 Redis
state=fresh, source=redis, refresh=none
场景 C：5 秒后、35 秒内再次打开
用户先拿旧数据
freshUntil < now
后台查 backend
覆盖 Redis list v2
state=stale, source=redis, refresh=background
场景 D：商品写操作之后
admin 下架商品
PATCH status
invalidate
scan + del cacheKey
下次 GET
Redis 重新 miss
这张图里的 state/source/refresh 每次请求重新生成；Redis 只保存列表 data 和 freshUntil。
```

### 真实举例：字段状态如何变化

```text
// 同一个列表请求
cacheKey = "next-bff:commodity:list:tenant_demo:operator:/api/commodity/list?limit=10&offset=0&status=on_sale"
keyHash = "f4c1a9e0"

// T+0s：第一次打开，Redis 没有这个 key
Redis[cacheKey] = null
cacheDebug = {
  state: "miss",
  source: "backend",
  refresh: "none",
  keyHash: "f4c1a9e0"
}
响应数据 = backend list v1
随后写入 Redis:
Redis[cacheKey] = {
  data: "list v1",
  freshUntil: "T+5s"
}

// T+2s：第二次打开，还在 fresh 阶段
Redis[cacheKey] = {
  data: "list v1",
  freshUntil: "T+5s"
}
cacheDebug = {
  state: "fresh",
  source: "redis",
  refresh: "none",
  keyHash: "f4c1a9e0"
}
响应数据 = Redis list v1

// T+8s：fresh 已过，Redis key 还没过期，进入 stale 阶段
Redis[cacheKey] = {
  data: "list v1",
  freshUntil: "T+5s"
}
cacheDebug = {
  state: "stale",
  source: "redis",
  refresh: "background",
  keyHash: "f4c1a9e0"
}
响应数据 = Redis list v1
后台刷新后:
Redis[cacheKey] = {
  data: "list v2",
  freshUntil: "T+13s"
}

// T+10s：admin 下架商品，写操作触发缓存失效
invalidateCommodityList()
Redis[cacheKey] = null

// T+11s：用户再打开列表，重新回到 miss
cacheDebug = {
  state: "miss",
  source: "backend",
  refresh: "none",
  keyHash: "f4c1a9e0"
}
响应数据 = backend list v3
```

### 单独拆开看 sharding

`sharding`的第一性原理是回答“这次查询应该去哪个数据分片”。当前系统不是让前端传`tenantId`，而是 BFF 从登录态取出可信`tenantId`，通过`x-tenant-id`交给 backend；backend 再把它变成查询条件和排障字段。

### sharding 从登录态到 backend 查询再到页面和 header 的流转

```text
主路径：正常租户查询
浏览器 URL
status=on_sale
BFF 登录态
tenant_demo
请求 header
x-tenant-id
backend 查询
filters.tenantId
sharding
targeted / shard-2
输出：谁消费 sharding
JSON body
sharding 字段
给页面卡片用
BFF response header
X-Commodity-List-Shard-*
给 Network 排障
backend 结构化日志
routingMode / shardName
给 traceId 排查
前端页面
查询路由
分片卡片
对比路径：没有 tenantId 或换租户
缺失 tenantId
x-tenant-id 不存在
routingMode=broadcast
shardName=all-shards
tenantHash=10faf96c4498
routingMode=targeted
shardName=shard-2
tenant_big_sale
tenantHash=4b9d47e1a0b0
shardName=shard-1
当前 shardName 是根据 tenantId hash 算出的模拟值，用来让前端理解真实分片路由。
sharding 不进 Redis，也不写 MongoDB；它每次查询时重新计算，再进入响应、header、日志和页面卡片。
```

### 真实举例：sharding 字段如何变化

```text
// 场景 1：operator 正常打开商品列表
AuthUser.tenantId = "tenant_demo"
BFF -> backend header:
x-tenant-id: tenant_demo

backend 查询条件:
filters = {
  tenantId: "tenant_demo",
  deletedAt: null,
  status: "on_sale"
}

backend 计算出来的 sharding:
sharding = {
  routingMode: "targeted",
  shardKey: "tenantId",
  shardName: "shard-2",
  tenantHash: "10faf96c4498"
}

BFF 响应 header:
X-Commodity-List-Routing-Mode: targeted
X-Commodity-List-Shard-Key: tenantId
X-Commodity-List-Shard-Name: shard-2
X-Commodity-List-Tenant-Hash: 10faf96c4498

前端列表卡片:
查询路由 = 定向分片
分片 = shard-2
租户标识 = 10faf96c4498

// 场景 2：请求没有可信 tenantId
BFF -> backend header:
x-tenant-id: <missing>

backend 查询条件:
filters = {
  deletedAt: null,
  status: "on_sale"
}

backend 计算出来的 sharding:
sharding = {
  routingMode: "broadcast",
  shardKey: "tenantId",
  shardName: "all-shards",
  tenantHash: "missing"
}

排查含义:
这不是“去了某一个分片”，而是可能要扫多个分片。
如果线上看到 broadcast，优先检查 BFF 是否漏传 tenantId，或者接口是否本来就是全局后台查询。

// 场景 3：另一个大租户打开同一列表
AuthUser.tenantId = "tenant_big_sale"
sharding = {
  routingMode: "targeted",
  shardKey: "tenantId",
  shardName: "shard-1",
  tenantHash: "4b9d47e1a0b0"
}

排查含义:
如果 tenant_big_sale 很慢，但 tenant_demo 正常，
就沿着 shardName=shard-1 和 tenantHash=4b9d47e1a0b0 查热点租户或热点分片。
```

## 六、概念都放在真实例子里讲

| 概念 | 真实商品系统例子 | 前端要关心什么 |
| --- | --- | --- |
| 分片 shard | 1000 万商品放不下一台机器，于是拆成 `shard-1` 、 `shard-2` 、 `shard-3` 。 | 接口偶发变慢时，要知道可能是某个分片慢，不一定是整个系统都慢。 |
| shard key | 用 `tenantId` 决定商品属于哪个分片，例如租户 `T10086` 的商品都按这个字段路由。 | 列表查询必须带租户上下文，否则 MongoDB 可能不知道该去哪个分片。 |
| mongos | 应用不是直接猜分片，而是把请求交给 MongoDB 路由层 `mongos` 。 | 前端不用连接 mongos，但要让接口参数足够明确，让 mongos 能定向路由。 |
| 跨分片查询 | 没带 `tenantId` ，只查 `status=on_sale` ，每个分片都要查一遍再汇总。 | 全局搜索、全局排序、全局统计要谨慎做，页面上可能明显变慢。 |
| 热点分片 | 大租户 `T99999` 正在大促，商品列表和库存操作都打到同一个分片。 | 出现“某些租户很慢，其他租户正常”时，要按租户维度排查。 |
| cursor 分页 | 第一页返回最后一条的 `createdAt=2026-05-10T10:00:00Z` 和 `id=10086` ，下一页拿这两个值继续往后查。 | 大规模列表不要依赖很深的页码跳转，应设计“下一页/继续加载”。 |

## 七、shard key 如何影响查询路由

真实例子：租户`T10086`的运营打开商品列表，只看上架商品。 如果请求里有可信的`tenantId=T10086`，MongoDB 可以定向到对应分片；如果没有，查询就可能广播到所有分片。

### shard key 查询路由图

```text
前端商品列表
status=on_sale
BFF 注入登录态
tenantId=T10086
mongos 路由
按 shard key 定位
shard-1
其他租户
shard-2
T10086 商品
缺少 tenantId
只传 status=on_sale
mongos 无法定向
scatter-gather
查一遍
shard-3
汇总排序
慢、抖动、资源高
```

## 八、多租户请求应该怎么带上下文

当前系统已经在用户、BFF 请求头、backend 商品查询和商品索引里接入`tenantId`。真实生产系统可以让 admin 在页面上选择租户视图，但真正传给 backend 的租户上下文仍然必须由 BFF 从登录态或权限系统注入，不能信任前端 body 自己提交的`tenantId`。

| 场景 | 真实例子 | 接口契约 | 为什么这样设计 |
| --- | --- | --- | --- |
| 普通运营看自己租户商品 | 用户 `operator01` 属于租户 `T10086` 。 | 前端请求商品列表，不需要手填 `tenantId` ；BFF 从 session 注入。 | 避免用户改 URL 或 body 越权查看别的租户商品。 |
| 平台 admin 跨租户查询 | admin 在后台选择 `T20001` 排查商品问题。 | 前端可以提交目标 `tenantId` ，BFF 必须先做权限校验再转发。 | 跨租户能力是高权限功能，不能变成普通筛选项。 |
| 缓存 key | 两个租户都访问 `status=on_sale` 。 | BFF 缓存 key 必须包含 `tenantId` 或租户 hash。 | 否则租户 A 可能读到租户 B 的列表缓存。 |
| 日志排查 | 只有 `T99999` 很慢。 | 日志记录 `traceId` 、 `tenantHash` 、 `page` 、 `sort` 。 | 可以定位是特定租户慢，还是全局接口慢。 |

```text
// 当前 backend 已接入的查询形态
{
  tenantId: "tenant_demo",
  deletedAt: null,
  status: "on_sale"
}

// 对应复合索引通常要把 shard key / tenantId 放到前面
{ tenantId: 1, deletedAt: 1, status: 1, createdAt: -1, id: -1 }
```

## 九、为什么大规模系统要从 offset 升级 cursor

当前系统的 BFF 会把`page`转成 backend 的`offset`：

```text
page=1000, pageSize=20
offset=(1000 - 1) * 20 = 19980
```

单库里，数据库至少要跳过前面 19980 条。分片后，如果查询没有很好地按 shard key 定向，多个分片都可能先跳过、排序、返回候选结果，再由 mongos 合并。这就是深分页和全局排序在分片下更贵的原因。

### offset 分页和 cursor 分页对比图

```text
offset 深分页
page=1000 / offset=19980
shard-1
跳过很多条
shard-2
mongos 合并排序
全局排序成本高
返回第 1000 页
慢且容易抖动
cursor 下一页
after=createdAt,id
带 tenantId 定向
只查目标租户范围
从游标后继续读
不需要跳过前 N 页
```

| 分页方式 | 商品列表例子 | 分片下的问题 | 适合场景 |
| --- | --- | --- | --- |
| offset | `page=1000&pageSize=20` | 要跳过大量数据；跨分片时还可能每个分片都排序和合并。 | 数据量小、后台工具、偶尔翻页。 |
| cursor | `after=2026-05-10T10:00:00Z,10086` | 不能随意跳到第 1000 页，但继续加载稳定很多。 | 商品流、订单流、审计日志、大规模列表。 |

## 十、某些租户很慢，其他租户正常怎么排查

真实 case：客服反馈租户`T99999`的商品列表经常 3 秒才出来， 但租户`T10086`正常。这个现象不像前端渲染问题，更像某个租户对应的数据量、分片负载或迁移状态有问题。

### 热点租户排查图

```text
T99999 很慢
同页面 3 秒+
T10086 正常
同页面 200ms
带 traceId 对比
tenantHash/page/sort/cache
shard-2 负载高
热点租户或数据倾斜
深分页 / 全局排序
offset 或 sort 成本高
chunk 迁移
迁移期间接口抖动
前端兜底
loading/retry/traceId
```

| 排查点 | 怎么用当前系统经验落地 | 如果是分片系统再补什么 |
| --- | --- | --- |
| Network | 看商品列表请求是否发出、状态码、耗时、 `x-trace-id` 。 | 增加 `tenantHash` 或安全的租户标识用于对比。 |
| BFF 日志 | 当前已有 cache source/state、route、durationMs、traceId。 | 确认是否只有某个 tenantHash 慢，是否命中缓存。 |
| backend 查询日志 | 当前已有 `commodity_list_query_planned` ，包含 `page` 、 `offset` 、 `sortField` 、 `candidateIndex` 。 | 增加 shard key、shardName、是否 scatter-gather、MongoDB explain。 |
| 页面兜底 | 保留 loading、错误提示、刷新入口，错误上报带 page 和 traceId。 | 慢接口可做轻量重试；写操作不要盲目自动重试。 |

## 十一、分片迁移或热点导致抖动时，前端怎么兜底

| 现象 | 真实例子 | 前端处理 | 不要做什么 |
| --- | --- | --- | --- |
| 列表慢 | 租户大促，商品列表从 200ms 变成 2s。 | 保留骨架屏或 loading，避免按钮乱跳，必要时显示“正在加载最新数据”。 | 不要无限 loading，不给用户任何反馈。 |
| 短暂失败 | 分片迁移期间偶发 503 或超时。 | 读接口可以有限重试，比如 1-2 次退避重试，并展示 traceId。 | 不要对删除、恢复、状态变更这类写操作自动重试。 |
| 部分租户慢 | `T99999` 慢，其他租户正常。 | 错误上报和日志带 tenantHash，方便后端定位热点分片。 | 不要只报“页面卡”，丢失租户和 traceId。 |
| 全局排序很慢 | 平台 admin 要看所有租户商品按价格排序。 | 限制筛选条件，提示先选择租户或时间范围，再允许排序。 | 不要默认开放任意全局排序。 |

## 十二、当前系统到真实分片集群的演进清单

| 层级 | 当前系统 | 真实分片集群还要增加 |
| --- | --- | --- |
| 前端 URL | `page` 、 `pageSize` 、 `status` 、 `sortBy` 。 | 已不让普通用户直接传 tenantId；admin 跨租户页面可以后续增加受控租户筛选。 |
| BFF | 注入 `userId` 和 `tenantId` ，透传 traceId，做权限和缓存。 | 接入真实租户权限模型，支持 admin 在授权范围内切换租户。 |
| backend 查询 | `{ tenantId, deletedAt, status, createdAt, id }` 支持当前商品列表。 | 在 MongoDB 集群里真正配置 shard key，并用 explain 验证是否定向路由。 |
| 分页 | 已支持 `page + pageSize` 和 `cursor={ createdAt, id }` 两种方式。 | 大列表逐步关闭深页跳转，默认使用 cursor 或搜索条件缩小范围。 |
| 排障 | 用 `traceId` 、 `candidateIndex` 、 `offset` 查慢请求。 | 已增加 `tenantHash` 、 `shardName` 、 `routingMode` 。 真实集群还应接入 MongoDB explain 和分片指标。 |

## 十三、验收对照

| 验收项 | 本系统中的解释方式 |
| --- | --- |
| 能解释为什么资深前端要懂一点分片 | 因为前端选择的查询参数、分页方式和租户上下文会直接影响请求是否跨分片。 |
| 能说明 shard key 对列表查询参数的影响 | 如果 shard key 是 `tenantId` ，商品列表必须由 BFF 注入 tenantId，backend 查询和索引也要以 tenantId 作为重要前缀。 |
| 能解释为什么大规模系统要从 offset 升级 cursor | offset 深页要跳过大量数据；分片下还可能多个分片分别跳过和排序。 cursor 用上一次最后一条记录继续读，避免不断跳过前 N 页。 |
| 能描述“某些租户很慢，其他租户正常”的排查方向 | 用 traceId 对比 BFF/backend 日志，按 tenantHash、page、sort、cache 状态、 candidateIndex 和 shard 指标定位是否热点租户、深分页或分片迁移。 |

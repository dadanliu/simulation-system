# 9.3 MongoDB 索引与查询规模

商品列表不是只把数据查出来再渲染。筛选、排序、分页都会影响数据库扫描成本。 本次把商品列表的核心查询索引显式命名，并在查询时记录 query、page、sort、traceId 和候选索引，方便前端和后端一起排查慢列表。

### 状态筛选

`deletedAt + status`支持未删除商品的状态筛选。

### 时间排序

`deletedAt + createdAt + id`支持默认创建时间排序和稳定分页。

### 组合查询

`deletedAt + status + createdAt + id`支持状态 tab 下按时间分页。

## 一、先解释概念

| 概念 | 简单解释 | 当前系统里的含义 |
| --- | --- | --- |
| 索引 | 数据库为某些字段建立的查找目录。 | 让 MongoDB 不用全表扫描商品集合。 |
| 复合索引 | 多个字段组成一个索引，字段顺序会影响能不能用上。 | 状态 + 创建时间组合查询用复合索引。 |
| 稳定分页 | 排序结果相同的数据也要有固定次序，避免翻页重复或漏数据。 | `createdAt` 相同时用 `id` 做次排序。 |
| offset 分页 | 用 `skip + limit` 跳过前面的数据再取一页。 | 当前兼容 offset，并新增 cursor 下一页；页码越深，offset 跳过成本越高。 |
| 候选索引 | 代码根据查询形态判断最可能匹配的索引。 | 日志、响应体 `queryPlan` 和 BFF header 都会暴露 `candidateIndex` ，用来辅助排查，不等同于 MongoDB explain 的最终执行计划。 |
| traceId | 一次请求的链路编号。 | BFF 调 backend 时透传，backend 查询日志也带同一个 traceId。 |

## 二、当前商品索引为什么存在

| 索引名 | 字段 | 支持的查询 | 为什么这样设计 |
| --- | --- | --- | --- |
| `idx_commodities_tenant_active_status` | `{ tenantId: 1, deletedAt: 1, status: 1 }` | 只看某个状态的未删除商品。 | 列表默认按租户隔离并过滤软删除数据，所以把 `tenantId` 和 `deletedAt` 放在索引前面。 |
| `idx_commodities_tenant_active_created_at_id` | `{ tenantId: 1, deletedAt: 1, createdAt: -1, id: -1 }` | 默认按创建时间倒序分页。 | `id` 是次排序字段，避免创建时间相同导致分页顺序不稳定。 |
| `idx_commodities_tenant_active_status_created_at_id` | `{ tenantId: 1, deletedAt: 1, status: 1, createdAt: -1, id: -1 }` | 状态 tab 里按创建时间排序分页。 | 先过滤未删除和状态，再按时间有序取一页，减少扫描和内存排序。 |
| `idx_commodities_tenant_name_unique` | `{ tenantId: 1, name: 1 }` | 同一租户内商品名唯一。 | 不同租户可以有同名商品，但同一租户不能重复创建同名商品。 |

## 三、本次系统内新增的索引功能

| 功能点 | 当前实现 | 真实例子 |
| --- | --- | --- |
| 状态筛选有索引支持 | `tenantId + deletedAt + status` 和 `tenantId + deletedAt + status + createdAt + id` | 查询 `tenant_demo` 下的 `status=on_sale` 商品，不需要扫描其他租户数据。 |
| 创建时间排序有索引支持 | `tenantId + deletedAt + createdAt + id` 支持默认列表排序。 | 商品列表默认按最新创建时间倒序展示， `id` 作为次排序避免翻页重复或漏数据。 |
| 状态 + 创建时间组合查询有复合索引 | `idx_commodities_tenant_active_status_created_at_id` | 打开“上架中”tab 并按创建时间倒序分页，候选索引会指向这个复合索引。 |
| 新增筛选项前评估查询成本 | backend 返回 `queryPlan` ，BFF header 暴露 `X-Commodity-List-Candidate-Index` 、 `X-Commodity-List-Query-Cost` 、 `X-Commodity-List-Unsupported-Filters` 。 | 如果用户按 `price` 范围筛选并按价格排序， `unsupportedFilters` 会出现 `price` 和 `sort:price` ，提示这不是当前主索引路径。 |

## 四、查询路径图

### MongoDB 商品查询索引路径图

```text
前端 query
status/page/sort
BFF 转换
limit/offset/sortField
backend 组装
filters + sort
命中候选索引
status / createdAt / compound
无合适索引
扫描更多数据或内存排序
backend 日志事件：commodity_list_query_planned
字段：traceId、page、limit、offset、sortField、sortDirection、candidateIndex、hasStatusFilter
```

## 五、新增筛选项前要问后端什么

| 问题 | 为什么要问 | 例子 |
| --- | --- | --- |
| 这个筛选项选择性高吗？ | 选择性低的字段即使有索引，也可能过滤不掉多少数据。 | `status` 只有 3 个值，单独筛选能力有限，但配合时间排序有价值。 |
| 会和哪些字段组合查询？ | 复合索引必须按常见组合设计。 | `status + createdAt` 是状态 tab 最常见查询。 |
| 排序字段是什么？ | 能过滤不代表能高效排序，不匹配索引可能触发内存排序。 | 默认排序是 `createdAt desc, id desc` 。 |
| 分页会不会很深？ | offset 深页会跳过很多数据，索引也不能完全消除 skip 成本。 | 如果经常访问第 1000 页，应考虑 cursor 分页。 |
| 这个字段是否会频繁更新？ | 索引字段更新越频繁，写入维护索引的成本越高。 | 库存 `stock` 变化频繁，不能随便为每种筛选都加索引。 |

## 六、索引的问题：什么时候加，什么时候不加

索引的本质是“额外维护一份查找目录”。它可以让读更快，但会占空间，也会让写入、更新、删除多做维护工作。 所以索引不是越多越好，而是要围绕高频查询和明确排序来设计。

| 问题 | 为什么是问题 | 什么情况会加 | 什么情况不加 |
| --- | --- | --- | --- |
| 占用存储和内存 | 索引是额外数据结构，会占磁盘，也可能占用内存缓存。 | 高频列表每天都按 `status + createdAt` 查询，且数据量持续增长。 | 只为一次临时运营查询加索引，或者字段几乎没人查。 |
| 写入变慢 | 商品创建、状态变更、软删除时，相关索引也要同步更新。 | 读请求远多于写请求，比如后台列表被频繁打开，商品状态变化相对少。 | 字段频繁变化，例如库存每秒大量更新，且查询收益不明确。 |
| 索引不匹配就用不上 | 查询条件、排序字段和复合索引顺序不匹配时，MongoDB 可能仍要扫描或内存排序。 | 常见查询固定为 `deletedAt + status + createdAt desc` ， 就加同方向的复合索引。 | UI 允许任意字段自由组合排序，但没有稳定高频模式，盲目组合索引会失控。 |
| 低选择性字段收益有限 | 字段取值很少，过滤不掉多少数据，单独索引收益可能有限。 | `status` 虽然只有 3 个值，但状态 tab 会继续按 `createdAt` 排序，所以加 `status + createdAt` 组合索引。 | 只按 `enabled=true` 这种大多数记录都满足的字段查，而且没有排序或其他过滤条件。 |
| 组合索引爆炸 | 每新增一个筛选项都和其他字段组合建索引，会快速产生大量索引。 | 产品确认这是核心入口，比如状态、创建时间是列表默认筛选和排序。 | 筛选项很多但使用率低，比如颜色、产地、活动标签都偶尔查一次。 |
| 深分页仍然慢 | `skip(offset)` 很大时，即使有索引也要跳过很多记录。 | 索引用来保证排序稳定，比如 `createdAt + id` ；再评估是否升级 cursor 分页。 | 只为了第 1000 页更快而继续堆索引。深页问题更应该考虑 cursor 分页或限制深翻页。 |
| 可能放大缓存 miss 压力 | 缓存失效后大量请求回源，如果索引不合适，DB 压力会被放大。 | 大促前明确热点列表，比如 `on_sale + createdAt desc` ，加索引并做缓存预热。 | 没有稳定热点，只靠“可能会有人查”就加索引，维护成本会高于收益。 |

## 七、前端渲染慢和 DB 查询慢怎么区分

| 现象 | 更可能的问题 | 排查方式 |
| --- | --- | --- |
| Network 等待时间很长，BFF/backend 日志 durationMs 也长 | 服务端或 DB 查询慢。 | 用 traceId 查 backend 日志，看 `commodity_list_query_planned` 和 MongoDB span。 |
| Network 很快，但页面卡顿、滚动掉帧 | 前端渲染慢。 | 看 React 组件数量、图片尺寸、Web Vitals、浏览器 Performance。 |
| 第一页快，深页慢 | offset 分页跳过成本变高。 | 把 page、pageSize、offset 给后端，评估 cursor 分页。 |
| 无筛选快，某个筛选慢 | 新增筛选项没有合适索引。 | 把 query、sort、traceId 给后端，看 candidateIndex 是否是 `no_matching_compound_index` 。 |

## 八、用 query、page、sort、traceId 辅助排查

前端反馈慢查询时，至少给后端这些信息：

```text
{
  "traceId": "trace-commodity-list-001",
  "query": {
    "status": "on_sale",
    "createdFrom": "2026-04-01T00:00:00.000Z",
    "createdTo": "2026-04-30T23:59:59.999Z"
  },
  "page": 20,
  "pageSize": 20,
  "sortBy": "createdAt",
  "sortOrder": "desc"
}
```

后端可以用同一个`traceId`查到；前端也能在列表响应的`queryPlan`和 Network header 里直接看到关键字段：

| 字段 | 用途 |
| --- | --- |
| `candidateIndex` | 判断是否匹配状态、创建时间、复合索引。Network header 是 `X-Commodity-List-Candidate-Index` 。 |
| `coveredByIndex / costLevel` | 判断本次查询是不是主要由索引覆盖，以及成本是低、中还是高。Network header 是 `X-Commodity-List-Index-Covered` 和 `X-Commodity-List-Query-Cost` 。 |
| `page / limit / offset` | 判断是不是深分页造成扫描成本变高。 |
| `sortField / sortDirection` | 判断排序是否能走索引。 |
| `hasKeyword / hasPriceRange / hasStockRange` | 判断是否用了暂未重点优化的筛选项；这些会汇总到 `unsupportedFilters` 。 |
| `recommendations` | 给出下一步建议，比如“keyword 应评估文本索引或搜索服务”、“深分页应使用 cursor”。 |

## 九、验收对照

| 验收项 | 当前实现 |
| --- | --- |
| 能解释当前商品索引为什么存在 | 第二节解释三个商品索引分别对应状态筛选、默认排序、组合查询。 |
| 能说明新增筛选项时要问后端什么问题 | 第四节列出选择性、组合查询、排序、深分页、写入成本。 |
| 能区分前端渲染慢和 DB 查询慢 | 第五节用 Network、日志 duration、Web Vitals 和 page 深度区分。 |
| 能用 query、page、sort、traceId 辅助后端排查 | 第六节给出需要提交给后端的最小排查信息。 |

# Polymarket Read-only API notes (Gamma / Data / CLOB)

> 目标：只整理“只读/公开”用法，用于市场发现、watchlist 打分、指标计算。
> 明确 **不包含** 下单/签名/交易权限相关内容。

## 0. API 总览（官方文档口径）

Polymarket 将 API 分成三块：

- **Gamma API**: `https://gamma-api.polymarket.com`
  - markets / events / tags / series / comments / sports / search / public profiles
  - 主要用于“发现与浏览”
- **Data API**: `https://data-api.polymarket.com`
  - 用户持仓、成交、活动、holder data、open interest、排行榜、builder analytics
- **CLOB API**: `https://clob.polymarket.com`
  - orderbook、prices、midpoint、spread 等（其中一部分端点是公开的）

> 注：Bridge API（出入金）在官方文档中也提到，但不在本笔记范围。

## 1. Gamma API（发现市场/事件）

### 1.1 常用端点

- `GET /markets`
  - 用途：批量拉取市场列表（可按 limit/offset 等分页）
  - 示例：
    - `https://gamma-api.polymarket.com/markets?limit=1`

- `GET /events`
  - 用途：批量拉取事件列表（事件下通常包含多个 market）
  - 支持参数（官方 OpenAPI 摘要）：
    - `limit`, `offset`, `order`, `ascending`
    - 过滤：`tag_id`, `tag_slug`, `active`, `archived`, `featured`, `closed`
    - 区间：`liquidity_min/max`, `volume_min/max`, `start_date_min/max`, `end_date_min/max`

### 1.2 市场对象字段速记（来自 /markets 响应示例）

常用字段（偏“交易前研究”视角）：

- 标识/关联
  - `id`: 市场 id（字符串）
  - `question`: 市场问题文本
  - `slug`: URL 友好 slug
  - `conditionId`: 条件/市场在合约侧的重要标识
  - `clobTokenIds`: **Yes/No 对应的 token id 列表**（用于 CLOB 侧 orderbook/price）
  - `events`: 事件数组（常见含 title/description/category/liquidity/volume…）

- 时间
  - `endDate`: 结束/到期时间（ISO）
  - `createdAt`, `updatedAt`, `closedTime`

- 状态
  - `active`, `closed`, `archived`, `restricted`

- 规模/活跃度
  - `volume`, `volume24hr`, `volume1wk`, `volume1mo`, `volume1yr`
  - `liquidity` / `liquidityNum`（注意可能是字符串/数值双版本）

- 价格/盘口（在 Gamma 侧常见是近似汇总）
  - `outcomes`: ["Yes","No"]
  - `outcomePrices`: 对应 outcomes 的价格数组（字符串）
  - `bestBid`, `bestAsk`, `lastTradePrice`（示例中存在；具体可用性视市场）
  - `spread`

实践建议：
- **发现**阶段：用 Gamma（/markets /events）做筛选与粗排序。
- **执行/可交易性评估**：用 CLOB 的 orderbook/spread/midpoint 作为“真实可成交成本”参考。

## 2. CLOB API（只读盘口/价格）

> 官方文档明确：CLOB 既有公开端点（orderbook, prices），也有需要鉴权的交易端点；此处只记录公开的市场数据端点。

### 2.1 获取 order book

- `GET https://clob.polymarket.com/book?token_id=<TOKEN_ID>`
- 返回关键字段（官方 OpenAPI 示例）：
  - `bids`: [{ price, size }, ...]（价格降序）
  - `asks`: [{ price, size }, ...]（价格升序）
  - `min_order_size`, `tick_size`, `neg_risk`, `last_trade_price`

用途：
- 计算 **spread、midpoint**
- 做“深度/滑点”近似：如取前 N 档累积 size 来衡量可进出容量

### 2.2 与 Gamma 的衔接

Gamma `/markets` 里通常能拿到 `clobTokenIds`（Yes/No 各一个）。

建议工作流：
1) 先 `GET /markets` 发现候选
2) 对每个候选 market 的两个 token_id 调用 `GET /book`
3) 由盘口推导：spread、midpoint、深度指标，然后回填 watchlist

## 3. Data API（只读用户/市场数据）

本次只做“目录”级别记录（后续补充）：
- 用户维度：positions, trades, activity
- 市场维度：holders / open interest / leaderboards

如果你的目标是纯“市场发现 + 定价偏差评估”，优先级通常低于 Gamma + CLOB。

## 4. 限速/错误处理（经验性）

- 所有端点都应做好：
  - 重试（指数退避）
  - 超时
  - 429/5xx
- 对分页端点：避免大规模全量扫；先用过滤条件缩小，再分页。


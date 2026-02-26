# Market metrics 口径（用于 watchlist/打分）

目标：把“可交易性”和“成本”量化，映射到 watchlist 的评分项。

## 1) 基础价格指标

### 1.1 Best bid / best ask

来源：CLOB `GET /book?token_id=...`

- `best_bid = max(bids[].price)`（如果无 bids，则为空）
- `best_ask = min(asks[].price)`（如果无 asks，则为空）

### 1.2 Midpoint

- 若 bid/ask 都存在：`mid = (best_bid + best_ask) / 2`

### 1.3 Spread

- 绝对价差：`spread = best_ask - best_bid`
- 相对价差（可选）：`spread_pct = spread / mid`

映射到 watchlist：
- “Spread / execution cost (0–5)”
  - spread 越小越好

## 2) 深度/滑点近似

> 不做完整撮合模拟，先用简化指标。

### 2.1 Top-of-book depth

- `depth_1 = bids[0].size + asks[0].size`（如果两侧都有）

### 2.2 Cumulative depth within X cents

设阈值 `x`（例如 0.01 / 0.02）：

- 买入可得规模（吃掉 asks）：
  - `depth_buy_x = sum(size for ask if ask.price <= best_ask + x)`
- 卖出可得规模（吃掉 bids）：
  - `depth_sell_x = sum(size for bid if bid.price >= best_bid - x)`

映射到 watchlist：
- “Liquidity & depth (0–5)”
  - depth_buy_x 与 depth_sell_x 越大越好

## 3) 活跃度/成交量

来源：Gamma `/markets` 字段（示例中存在）：
- `volume24hr`, `volume1wk`, `volume1mo`

用途：
- 作为流动性“软指标”，用于候选初筛。

## 4) 时间指标

来源：Gamma `/markets`：`endDate`

- `time_to_resolution_days = (endDate - now)`

映射到 watchlist：
- “Catalyst quality (0–5)” 或策略适配项（短/中/长）

## 5) 与 watchlist YAML 的字段建议

建议在 watchlist 里加这些字段（示意）：

```yaml
metrics:
  best_bid: null
  best_ask: null
  midpoint: null
  spread: null
  spread_pct: null
  depth_buy_1c: null
  depth_sell_1c: null
  volume_24h: null
  time_to_resolution_days: null
```

评分建议（简单规则，可迭代）：
- spread <= 0.01 且深度充足：执行成本 4–5
- spread >= 0.05 或单侧无盘：执行成本 0–1


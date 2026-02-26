# 市场指标口径（只读 API 可计算）

> 目标：定义一组可以通过 **只读 API**（Gamma/CLOB 等）计算出来的指标，用于：
> 1) 研究/复盘的统一口径；
> 2) 映射到 `watchlist-scoring.yaml` 的评分输入。

本文不包含下单、签名、资金与仓位。

---

## 指标 1：隐含概率（Implied Probability）

- **定义**：市场当前价格所隐含的事件发生概率。
- **常用近似**：
  - `P_yes ≈ price_yes`
  - `P_no ≈ price_no`（二元市场通常 `price_no ≈ 1 - price_yes`，但需以实际盘口为准）

**数据来源（示例）**
- Gamma markets：市场/结果价格字段（不同端点字段名可能不同，需以实际响应为准）
- CLOB midpoint / last-trade-price：可作为“更接近交易执行”的价格参考

---

## 指标 2：Bid/Ask 点差（Spread）

- **输入**：
  - `bid`（最高买价）
  - `ask`（最低卖价）
- **mid**：`mid = (bid + ask) / 2`
- **点差（绝对）**：`spread_abs = ask - bid`
- **点差（百分比）**：
  - `spread_pct = (ask - bid) / mid * 100%`

**边界**
- 若 `bid` 或 `ask` 缺失（薄盘），直接标记为不可交易/高风险。

**评分映射**
- 对应 `watchlist-scoring.yaml` 的 `spread_score`

---

## 指标 3：订单簿深度（Depth）

- **定义**：在给定价格偏离（或给定成交规模）下可成交的累计数量/金额。
- **常见口径**：
  1) **Top-of-book 深度**：
     - `depth_top = size(bid1) + size(ask1)`
  2) **分层深度**（建议）：
     - 在多个价位累加（比如前 N 档，或价格偏离 ≤ x%）

**用途**
- 判断“能否进出”与滑点风险。

**评分映射**
- 对应 `liquidity_score`（以及滑点相关的辅助过滤）

---

## 指标 4：滑点估计（Slippage Estimation）

- **目标**：估计“按某个规模成交”时的平均成交价与 mid 的偏离。
- **方法（分段累加）**：
  - 买入：从 asks 从低到高吃单，直到满足目标数量/金额
  - 卖出：从 bids 从高到低吃单

**输出示例**
- `avg_fill_price`
- `slippage_pct = (avg_fill_price - mid) / mid * 100%`

**边界**
- 无法在合理价位范围满足规模时，视为“不可执行”。

---

## 指标 5：成交活跃度（Activity Proxy）

> 只读条件下，我们用“代理指标”判断活跃程度。

可选代理：
- `last_trade_price` 是否近期更新
- 成交量字段（如果 Gamma 提供）
- 订单簿更新频率（如能观测）

**注意**
- 活跃度不等于可交易性：薄盘也可能频繁跳价。

---

## 指标 6：事件时间结构（Days to Event / Resolution）

- **定义**：距离关键事件/结算的剩余时间。
- **口径**：
  - `days_to_event = (event_time - now) / 86400`

**用途**
- 短周期策略优先：`days_to_event` 过长会降低资金效率与信息优势窗口。

**评分映射**
- 对应 `event_calendar_score`

---

## 指标 7：费用影响（Fee impact / Net EV adjustment）

- **输入**：fee rate（若能通过只读端点获取）
- **用途**：将“毛错价”转成“净错价”

示例：
- `edge_net ≈ edge_gross - expected_fees - expected_slippage`

**注意**
- 费用函数可能与概率区间相关（例如在 50% 附近更高），计算需注明假设。

---

## 与 watchlist-scoring.yaml 的映射建议

- `liquidity`：来自深度/流动性字段 + depth 估计
- `spread_pct`：来自 bid/ask
- `days_to_event`：来自事件/市场时间字段
- `fee_rate`：来自 fee rate 端点（如有）

建议策略：
- 指标先统一落地为一份“市场观测 JSON”，再跑 scoring 规则，保证可复现。

# Polymarket 结算机制详解

> 理解市场结算、争议处理与延迟场景

## 概述

Polymarket 是一个基于区块链的预测市场平台，其结算机制涉及**链下订单匹配**与**链上智能合约结算**的混合架构。理解结算机制对于交易者管理风险、把握赎回时机至关重要。

---

## 1. 结算基本流程

### 1.1 订单生命周期

```
创建订单 → 提交至 CLOB → 匹配或挂单 → 链上结算 → 确认完成
```

| 阶段 | 描述 |
|------|------|
| **Create & Sign** | 用户创建订单（价格、数量、过期时间），使用私钥签名 (EIP712) |
| **Submit to CLOB** | 订单提交至中心限价订单簿 (CLOB)，验证签名、余额、Allowance |
| **Match or Rest** | 市价单立即成交，挂单单进入订单簿等待匹配 |
| **Settlement** | 匹配后由运营方提交至区块链，智能合约验证并执行 token 转移 |
| **Confirmation** | 交易在 Polygon 上达成最终性，余额更新 |

### 1.2 交易状态

订单匹配后，交易经历以下状态：

| 状态 | 描述 |
|------|------|
| `MATCHED` | 交易已匹配，发送给执行器提交链上 |
| `MINED` | 交易已打包进区块链 |
| `CONFIRMED` | 交易最终确认，成功完成 ✅ |
| `RETRYING` | 交易失败，正在重试 |
| `FAILED` | 交易永久失败 ❌ |

### 1.3 结算原子性

Polymarket 结算为**原子性**操作：
- 整个交易要么完全成功，要么完全不执行
- 不存在部分结算的情况
- 由 Exchange 智能合约保证

---

## 2. 市场结算机制

### 2.1 结算时机

市场在以下情况结算：

1. **事件发生** - 市场问题对应的实际事件发生（如选举结果、比赛结束）
2. **到期** - 市场到达 `endDate` 截止时间
3. **手动结算** - 管理员或预言机触发结算

### 2.2 结算结果表示

已结算市场的 API 响应包含关键字段：

| 字段 | 描述 |
|------|------|
| `closed` | `true` 表示市场已关闭/已结算 |
| `closedTime` | 市场关闭时间 (ISO 8601) |
| `outcomePrices` | 结算价格数组，如 `["0.99", "0.01"]` 表示 Yes=99%, No=1% |
| `resolvedBy` | 结算人（管理员/预言机/自动） |
| `resolutionSource` | 结算依据的来源 |

### 2.3 结算价格

- **Yes _TOKEN_**：如果 Yes 胜出，价值 = $1 × 结算价格
- **No _TOKEN_**：如果 No 胜出，价值 = $1 × 结算价格
- 二元市场通常结算为 `[1, 0]` 或 `[0, 1]`

### 2.4 代币赎回

结算后，用户可以赎回获胜代币：

```python
# Python SDK 赎回示例
from py_clob_client.client import ClobClient

client = ClobClient(host, key=key, chain_id=chain_id, creds=creds)
# 赎回获胜代币
redeemed = client.redeem_shares(token_id="...", amount=...)
```

---

## 3. 争议处理流程

### 3.1 模糊情况处理

当市场结果存在争议或模糊时，Polymarket 由 **Markets Integrity Committee (MIC)** 做出最终裁决。

> "In the event of ambiguity in terms of the market outcome, the market will be resolved at the sole discretion of the Markets Integrity Committee (MIC)."

### 3.2 争议解决原则

1. **查看市场描述** - 每个市场的问题描述中已包含结算规则
2. **依赖官方来源** - 通常以权威媒体报道或官方声明为准
3. **MIC 裁量** - 仍有争议时由 MIC 全权决定

### 3.3 常见争议场景

| 场景 | 处理方式 |
|------|----------|
| 定义模糊 | 按市场描述中的具体定义结算 |
| 事件未发生 | 通常结算为 No |
| 时间边界争议 | 以问题中指定的具体时间为准 |
| 第三方因素 | 参考官方声明或权威来源 |

### 3.4 申诉渠道

- **Help Center**: https://help.polymarket.com
- **Discord 社区**: 可在社区讨论争议案例
- **Intercom**: 页面右下角在线客服

---

## 4. 延迟结算场景

### 4.1 体育市场

体育市场有特殊的订单清理规则：

- **开赛前清理**: 比赛开始时，未成交的限价订单**自动取消**
- **注意**: 比赛开始时间可能变动，如果比赛提前开始，订单可能未能及时清理
- **建议**: 在比赛开始前密切关注你的订单

> "Specifically for sports markets, outstanding limit orders are automatically cancelled once the game begins, clearing the order book at the official start time. However, game start times can shift — if a game starts earlier than scheduled, orders may not be cleared in time."

### 4.2 延迟结算原因

| 原因 | 描述 |
|------|------|
| **等待事件结果** | 某些事件需等待官方宣布结果（如选举、比赛） |
| **争议调查** | MIC 需要时间评估争议情况 |
| **预言机延迟** | 自动结算依赖预言机数据更新 |
| **链上拥堵** | Polygon 网络拥堵可能导致结算延迟 |

### 4.3 延迟期间的头寸管理

- **仍可交易**: 延迟期间市场通常仍可交易
- **价格波动**: 等待期间价格可能剧烈波动
- **流动性下降**: 部分交易者可能平仓观望

---

## 5. API 查询结算状态

### 5.1 查询市场结算状态

```bash
# 获取已关闭市场列表
curl "https://gamma-api.polymarket.com/markets?closed=true&limit=10"

# 获取特定市场详情
curl "https://gamma-api.polymarket.com/markets/{id}"
```

### 5.2 关键响应字段

```json
{
  "id": "12345",
  "question": "Will BTC reach $100k in 2024?",
  "closed": true,
  "closedTime": "2024-12-31T23:59:59Z",
  "outcomePrices": ["0.75", "0.25"],
  "resolvedBy": "admin",
  "resolutionSource": "https://example.com/official-source"
}
```

---

## 6. 交易者注意事项

### 6.1 结算前风控

1. **关注市场描述**: 交易前仔细阅读结算规则
2. **设置提醒**: 在市场截止时间前设置提醒
3. **及时平仓**: 如不准备持有到期，及时平仓
4. **了解 MIC**: 模糊市场由 MIC 决定，可能与预期不同

### 6.2 结算后操作

1. **确认结算价格**: 通过 API 或前端确认
2. **及时赎回**: 获胜代币可立即赎回为 USDC.e
3. **检查余额**: 确认赎回金额正确

### 6.3 高风险场景

- **政治/选举市场**: 结果争议可能性较高
- **新兴事件**: 缺乏历史参考，市场可能波动大
- **时间边界**: 接近截止时间的交易需特别注意

---

## 7. 相关来源

- **官方文档**: https://docs.polymarket.com
- **Order Lifecycle**: https://docs.polymarket.com/concepts/order-lifecycle.md
- **Markets & Events**: https://docs.polymarket.com/concepts/markets-events.md
- **Help Center**: https://help.polymarket.com

---

*更新日期: 2026-02-27*
*来源: Polymarket 官方文档 + API 分析*

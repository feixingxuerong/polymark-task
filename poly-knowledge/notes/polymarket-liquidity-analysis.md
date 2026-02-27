# Polymarket 市场流动性分析

> 分析预测市场流动性的核心指标、数据来源与筛选方法

## 概述

流动性是预测市场最重要的质量指标之一。高流动性市场意味着更小的价差、更深的订单簿、更快的成交，以及更低的滑点风险。本文档分析 Polymarket 的流动性指标体系，供参考与策略开发。

---

## 核心流动性指标

### 1. Volume（成交量）

成交量是衡量市场活跃度的最直接指标。

| 字段 | 描述 | API 来源 |
|------|------|----------|
| `volume24hr` | 过去 24 小时成交量 | Markets API |
| `volume1wk` | 过去 1 周成交量 | Markets API |
| `volume1mo` | 过去 1 月成交量 | Markets API |
| `volumeAmm` | AMM 机制成交量 | Markets API |
| `volumeClob` | CLOB（订单簿）成交量 | Markets API |
| `volumeNum` | 数值型成交量（用于筛选） | Markets API |

**筛选参数**：
```http
GET https://gamma-api.polymarket.com/markets?volume_num_min=10000
```

**经验判断**：
- **低流动性**：volume < $1,000
- **中等流动性**：$1,000 < volume < $50,000
- **高流动性**：$50,000 < volume < $500,000
- **超流动性**：volume > $500,000

---

### 2. Spread（价差）

价差（Bid-Ask Spread）是买入价与卖出价之间的差额，直接影响交易成本。

| 字段 | 描述 | API 来源 |
|------|------|----------|
| `spread` | 市场点差（直接返回） | Markets API |
| `bestBid` | 最佳买价 | Markets API |
| `bestAsk` | 最佳卖价 | Markets API |

**计算公式**：
```
spread = bestAsk - bestBid
spread_pct = (bestAsk - bestBid) / ((bestAsk + bestBid) / 2) * 100%
```

**通过 Order Book API 获取深度**：
```http
GET https://clob.polymarket.com/book?token_id=0x...
```

响应示例：
```json
{
  "bids": [
    {"price": "0.45", "size": "100"},
    {"price": "0.44", "size": "200"}
  ],
  "asks": [
    {"price": "0.46", "size": "150"},
    {"price": "0.47", "size": "250"}
  ],
  "last_trade_price": "0.45"
}
```

**经验判断**：
- **极低点差**：spread < 1%（流动性极佳）
- **正常点差**：1% < spread < 3%（大多数市场）
- **宽点差**：3% < spread < 5%（流动性较差）
- **极宽点差**：spread > 5%（可能无法正常交易）

---

### 3. Liquidity（流动性深度）

流动性深度表示市场能够吸收大额订单而不产生大幅价格波动的能力。

| 字段 | 描述 | API 来源 |
|------|------|----------|
| `liquidity` | 字符串型流动性 | Markets API |
| `liquidityNum` | 数值型流动性 | Markets API |
| `liquidityAmm` | AMM 流动性池大小 | Markets API |
| `liquidityClob` | CLOB 订单簿总深度 | Markets API |

**筛选参数**：
```http
GET https://gamma-api.polymarket.com/markets?liquidity_num_min=5000
```

**经验判断**：
- **低流动性**：liquidity < $5,000
- **中等流动性**：$5,000 < liquidity < $50,000
- **高流动性**：$50,000 < liquidity < $500,000

---

### 4. Traders（交易者数量）

交易者数量是市场活跃度的间接指标，但 API 不直接提供。可通过以下方式间接判断：

- **订单簿订单数量**：订单越多，竞争越激烈
- **成交量变化率**：volume24hr / volume1wk 比率
- **价格波动性**：oneHourPriceChange、oneDayPriceChange

| 字段 | 描述 |
|------|------|
| `oneHourPriceChange` | 1 小时价格变化 |
| `oneDayPriceChange` | 24 小时价格变化 |
| `oneWeekPriceChange` | 1 周价格变化 |

---

### 5. Market Cap（市场规模估算）

预测市场没有传统意义上的市值，但可通过以下方式估算：

```python
# 估算市场规模
estimated_market_cap = volume * (expected_days_to_resolution / 30)
```

或者更简单地使用流动性作为市场规模代理：
- `liquidityNum` 是当前可交易规模的良好代理

---

## 流动性相关 API 端点

### Gamma API（市场列表）

```http
GET https://gamma-api.polymarket.com/markets
```

**关键筛选参数**：
| 参数 | 描述 |
|------|------|
| `liquidity_num_min` | 最小流动性（数值） |
| `volume_num_min` | 最小成交量（数值） |
| `volume_num_max` | 最大成交量（数值） |
| `start_date_min` | 最早开始时间 |
| `end_date_max` | 最晚结束时间 |
| `closed` | 是否已关闭 |

**完整筛选示例**：
```http
GET https://gamma-api.polymarket.com/markets?volume_num_min=10000&liquidity_num_min=5000&closed=false&order=volumeNum&ascending=false
```

---

### CLOB API（订单簿）

```http
GET https://clob.polymarket.com/book?token_id={token_id}
```

返回字段：
- `bids`：买方深度（价格 + 数量数组）
- `asks`：卖方深度（价格 + 数量数组）
- `last_trade_price`：最新成交价
- `min_order_size`：最小订单大小
- `tick_size`：价格最小变动单位

---

### 费率 API

```http
GET https://clob.polymarket.com/fee-rate?token_id={token_id}
```

返回：
```json
{
  "base_fee": 30
}
```
**注意**：30 表示 30 basis points = 0.3%

---

## 流动性筛选实战

### 高质量市场筛选器

```python
import requests

def get_high_liquidity_markets(
    min_volume=10000,
    min_liquidity=5000,
    max_spread=0.03
):
    """筛选高流动性市场"""
    
    # 1. 获取市场列表
    url = "https://gamma-api.polymarket.com/markets"
    params = {
        "volume_num_min": min_volume,
        "liquidity_num_min": min_liquidity,
        "closed": "false",
        "limit": 100,
        "order": "volumeNum",
        "ascending": "false"
    }
    
    response = requests.get(url, params=params)
    markets = response.json()
    
    # 2. 过滤点差
    high_liquidity_markets = []
    for market in markets:
        spread = market.get('spread', 0)
        if spread is not None and spread <= max_spread:
            high_liquidity_markets.append(market)
    
    return high_liquidity_markets
```

### 订单簿深度分析

```python
def analyze_order_book(token_id):
    """分析订单簿深度"""
    
    url = f"https://clob.polymarket.com/book?token_id={token_id}"
    response = requests.get(url)
    book = response.json()
    
    # 计算总深度
    total_bid_size = sum(float(bid['size']) for bid in book['bids'])
    total_ask_size = sum(float(ask['size']) for ask in book['asks'])
    
    # 计算点差
    best_bid = float(book['bids'][0]['price'])
    best_ask = float(book['asks'][0]['price'])
    spread_pct = (best_ask - best_bid) / ((best_ask + best_bid) / 2)
    
    return {
        'total_bid_size': total_bid_size,
        'total_ask_size': total_ask_size,
        'best_bid': best_bid,
        'best_ask': best_ask,
        'spread_pct': spread_pct,
        'last_trade_price': float(book['last_trade_price'])
    }
```

---

## 流动性指标汇总表

| 指标 | 重要性 | 好（低风险） | 差（高风险） |
|------|--------|--------------|--------------|
| **volume24hr** | ⭐⭐⭐⭐⭐ | > $50,000 | < $1,000 |
| **spread** | ⭐⭐⭐⭐⭐ | < 2% | > 5% |
| **liquidityNum** | ⭐⭐⭐⭐ | > $50,000 | < $5,000 |
| **bestBid/bestAsk** | ⭐⭐⭐⭐ | 差距小 | 差距大 |
| **订单簿深度** | ⭐⭐⭐ | 总深度 > $10,000 | 总深度 < $1,000 |

---

## 交易策略建议

### 1. 只交易高流动性市场
- 筛选条件：`volume_num_min=10000`，`liquidity_num_min=5000`
- 避免点差 > 3% 的市场

### 2. 大额订单分批执行
- 在高流动性市场，大额订单也会影响价格
- 建议分 3-5 批下单，观察滑点

### 3. 关注 AMM vs CLOB
- `liquidityAmm` 反映 AMM 池深度
- `liquidityClob` 反映订单簿深度
- 两者都高的市场最适合交易

### 4. 结算前流动性陷阱
- 接近结算日期的市场可能流动性骤降
- 提前检查 `endDate`，避免持仓进入低流动性窗口

---

## 相关文档

- [Polymarket API Reference](https://docs.polymarket.com/api-reference/introduction)
- [Markets API](https://docs.polymarket.com/api-reference/markets)
- [Order Book API](https://docs.polymarket.com/api-reference/market-data/get-order-book.md)
- [Fee Rate API](https://docs.polymarket.com/api-reference/market-data/get-fee-rate.md)

---

## 更新日志

### 2026-02-27

- 创建本文档
- 整理流动性核心指标（Volume, Spread, Liquidity, Traders, Market Cap）
- 添加 API 端点说明与代码示例
- 更新人: Subagent-Poly-Liquidity

---

*本文档为策略研究参考，不构成投资建议。*

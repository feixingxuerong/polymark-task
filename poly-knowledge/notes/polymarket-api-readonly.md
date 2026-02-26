# Polymarket 只读 API 技术笔记

> 本笔记覆盖 Polymarket Gamma API / CLOB 公开端点的读取（不包含下单/签名交易）
> 最后更新：2026-02-27

---

## 一、概述

Polymarket 提供两类只读 API：

1. **Gamma API** (`gamma-api.polymarket.com`) - 市场元数据、事件信息
2. **CLOB API** (`clob.polymarket.com`) - 订单簿、实时价格数据

所有公开端点**无需认证**即可使用，适合构建 watchlist 监控系统。

---

## 二、Gamma API（市场元数据）

### 2.1 获取市场列表

**端点**: `GET https://gamma-api.polymarket.com/markets`

**筛选参数**:

| 参数 | 类型 | 说明 |
|-----|------|------|
| `condition_id` | string | 条件ID筛选 |
| `event_id` | string | 事件ID筛选 |
| `closed` | boolean | 是否已关闭 |
| `liquidity_num_min` | number | 最小流动性（USDC） |
| `volume_num_min` | number | 最小成交量（USDC） |
| `start_date_min` | string | 最早开始时间 (ISO) |
| `end_date_max` | string | 最晚结束时间 (ISO) |
| `order` | string | 排序字段 (如 `volume`) |
| `limit` | number | 返回数量 (默认 50) |

**curl 示例**:
```bash
# 获取流动性 > $10,000 的活跃市场
curl "https://gamma-api.polymarket.com/markets?closed=false&liquidity_num_min=10000&order=volume&limit=20"
```

**响应关键字段**:

| 字段 | 说明 |
|-----|------|
| `id` | 市场唯一ID |
| `question` | 市场问题描述 |
| `description` | 详细描述 |
| `volume` | 24小时成交量 |
| `liquidity` | 流动性 |
| `clobTokenIds` | YES/NO 代币ID数组 `[yesTokenId, noTokenId]` |
| `startDate` | 事件开始时间 |
| `endDate` | 事件结束时间 |
| `endDateTz` | 时区信息 |
| `gameStartTime` | 游戏开始时间 |
| `negRisk` | 是否为负风险市场 |
| `acceptingOrders` | 是否接受订单 |

---

### 2.2 获取单个市场详情

**端点**: `GET https://gamma-api.polymarket.com/markets/{market_id}`

**curl 示例**:
```bash
curl "https://gamma-api.polymarket.com/markets/6a2c3ed4-8c91-5f28-a3c9-3a7a7a3b5b6e"
```

---

### 2.3 获取事件列表

**端点**: `GET https://gamma-api.polymarket.com/events`

**筛选参数**:

| 参数 | 类型 | 说明 |
|-----|------|------|
| `state` | string | 状态: `open`, `closed`, `resolved` |
| `limit` | number | 返回数量 |
| `offset` | number | 偏移量 |

**curl 示例**:
```bash
# 获取即将到期的事件
curl "https://gamma-api.polymarket.com/events?state=open&limit=10"
```

**响应字段**:

| 字段 | 说明 |
|-----|------|
| `id` | 事件ID |
| `title` | 事件标题 |
| `slug` | URL友好标识 |
| `startDate` | 开始时间 |
| `endDate` | 结束时间 |
| `markets` | 关联市场数组 |
| `icon` | 图标URL |

---

### 2.4 获取事件详情

**端点**: `GET https://gamma-api.polymarket.com/events/{event_id}`

**curl 示例**:
```bash
curl "https://gamma-api.polymarket.com/events/abc123"
```

---

### 2.5 服务器时间（用于同步）

**端点**: `GET https://gamma-api.polymarket.com/server-time`

**curl 示例**:
```bash
curl "https://gamma-api.polymarket.com/server-time"
```

**响应**: `{"serverTime": 1700000000000}`

---

## 三、CLOB API（订单簿与价格）

### 3.1 订单簿数据

**端点**: `GET https://clob.polymarket.com/orderbook`

**参数**:

| 参数 | 必填 | 说明 |
|-----|------|------|
| `token_id` | Yes | 代币ID (来自 markets.clobTokenIds) |

**curl 示例**:
```bash
# 获取特定代币的订单簿
curl "https://clob.polymarket.com/orderbook?token_id=0x1234...5678"
```

**响应结构**:

```json
{
  "bids": [
    {"price": "0.45", "size": 100},
    {"price": "0.44", "size": 250}
  ],
  "asks": [
    {"price": "0.46", "size": 150},
    {"price": "0.47", "size": 300}
  ],
  "hash": "...",
  "timestamp": 1700000000000
}
```

**字段说明**:

| 字段 | 说明 |
|-----|------|
| `bids` | 买单数组，按价格降序 |
| `asks` | 卖单数组，按价格升序 |
| `price` | 价格 (0-1，即隐含概率) |
| `size` | 数量 |
| `hash` | 订单簿版本哈希 |
| `timestamp` | 时间戳 |

**点差计算**:
```python
best_bid = float(bids[0]["price"])
best_ask = float(asks[0]["price"])
spread = best_ask - best_bid
spread_pct = spread / ((best_bid + best_ask) / 2) * 100
```

---

### 3.2 中间价

**端点**: `GET https://clob.polymarket.com/midpoints`

**参数**:

| 参数 | 必填 | 说明 |
|-----|------|------|
| `token_id` | Yes | 代币ID |

**curl 示例**:
```bash
curl "https://clob.polymarket.com/midpoints?token_id=0x1234...5678"
```

**响应**: `{"midpoint": 0.455}`

---

### 3.3 最新成交价

**端点**: `GET https://clob.polymarket.com/last-trade-price`

**参数**:

| 参数 | 必填 | 说明 |
|-----|------|------|
| `token_id` | Yes | 代币ID |

**curl 示例**:
```bash
curl "https://clob.polymarket.com/last-trade-price?token_id=0x1234...5678"
```

**响应**: `{"price": "0.45", "size": 50, "side": "BUY"}`

---

### 3.4 费率查询

**端点**: `GET https://clob.polymarket.com/fee-rate`

**参数**:

| 参数 | 必填 | 说明 |
|-----|------|------|
| `token_id` | Yes | 代币ID |

**curl 示例**:
```bash
curl "https://clob.polymarket.com/fee-rate?token_id=0x1234...5678"
```

**响应**: `{"feeRate": 0}`

> 注：大多数市场费率为 0，部分加密货币/体育市场有 0.44%-1.56% 的费率

---

## 四、速率限制与稳定性

### 4.1 各端点限制

| API | 限制 | 突发/持续 |
|-----|------|----------|
| Gamma API | 4,000 req / 10s | 突发 |
| Data API | 1,000 req / 10s | 突发 |
| CLOB API | 9,000 req / 10s | 突发 |

### 4.2 最佳实践

1. **批量请求**: 使用 `limit` 和筛选参数减少请求次数
2. **缓存策略**: 
   - 市场元数据可缓存 30-60 秒
   - 订单簿数据建议 1-5 秒刷新
3. **指数退避**: 遇到 429 时使用指数退避重试
4. **健康检查**: 
   ```bash
   curl https://clob.polymarket.com/health
   ```

### 4.3 地理限制检查

**端点**: `GET https://polymarket.com/api/geoblock`

```bash
curl "https://polymarket.com/api/geoblock"
```

---

## 五、Watchlist 评分应用

### 5.1 流动性评分

**数据源**: Gamma API `markets` 端点的 `liquidity` 字段

**评分逻辑**:
```python
def score_liquidity(liquidity):
    if liquidity >= 100000: return 100
    elif liquidity >= 50000: return 80
    elif liquidity >= 10000: return 60
    elif liquidity >= 5000: return 40
    elif liquidity >= 1000: return 20
    else: return 10
```

---

### 5.2 点差评分

**数据源**: CLOB API `orderbook` 端点

**评分逻辑**:
```python
def score_spread(orderbook):
    if not orderbook["bids"] or not orderbook["asks"]:
        return 0  # 无订单
    
    best_bid = float(orderbook["bids"][0]["price"])
    best_ask = float(orderbook["asks"][0]["price"])
    spread = best_ask - best_bid
    
    if spread <= 0.01: return 100
    elif spread <= 0.02: return 80
    elif spread <= 0.05: return 60
    elif spread <= 0.10: return 40
    else: return 20
```

---

### 5.3 事件时间评分

**数据源**: Gamma API `markets` 端点的 `endDate` 字段

**评分逻辑**:
```python
from datetime import datetime, timedelta

def score_timing(end_date_str):
    end_date = parse_iso_date(end_date_str)
    now = datetime.now()
    hours_until = (end_date - now).total_seconds() / 3600
    
    # 6小时-7天: 最佳交易窗口
    if 6 <= hours_until <= 168: return 100
    # 7-14天: 仍可交易
    elif 168 < hours_until <= 336: return 80
    # <6小时: 可能流动性枯竭
    elif hours_until < 6: return 40
    # 已过期
    else: return 0
```

---

### 5.4 综合评分

```python
def overall_score(market, orderbook):
    liquidity_score = score_liquidity(market.get("liquidity", 0))
    spread_score = score_spread(orderbook)
    timing_score = score_timing(market.get("endDate", ""))
    
    # 权重可调整
    return {
        "liquidity": liquidity_score,
        "spread": spread_score,
        "timing": timing_score,
        "total": liquidity_score * 0.4 + spread_score * 0.3 + timing_score * 0.3
    }
```

---

## 六、Python 调用示例

```python
import requests

# 配置
GAMMA_API = "https://gamma-api.polymarket.com"
CLOB_API = "https://clob.polymarket.com"

def get_markets(min_liquidity=10000, limit=20):
    """获取高流动性市场"""
    url = f"{GAMMA_API}/markets"
    params = {
        "closed": "false",
        "liquidity_num_min": min_liquidity,
        "order": "volume",
        "limit": limit
    }
    resp = requests.get(url, params=params)
    resp.raise_for_status()
    return resp.json()

def get_orderbook(token_id):
    """获取订单簿"""
    resp = requests.get(f"{CLOB_API}/orderbook", params={"token_id": token_id})
    resp.raise_for_status()
    return resp.json()

def get_market_with_book(market_id):
    """获取市场详情及订单簿"""
    # 获取市场
    market = requests.get(f"{GAMMA_API}/markets/{market_id}").json()
    
    # 获取 YES 代币的订单簿
    yes_token_id = market.get("clobTokenIds", [None, None])[0]
    if yes_token_id:
        orderbook = get_orderbook(yes_token_id)
    else:
        orderbook = None
    
    return market, orderbook
```

---

## 七、相关资料

- [Polymarket API Reference](https://docs.polymarket.com/api-reference/introduction)
- [Gamma API 文档](https://docs.polymarket.com/api-reference/markets)
- [CLOB API 文档](https://docs.polymarket.com/api-reference/clob)
- [速率限制](https://docs.polymarket.com/api-reference/rate-limits.md)

---

*本笔记仅供技术研究，不构成投资建议。交易前请务必了解风险。*

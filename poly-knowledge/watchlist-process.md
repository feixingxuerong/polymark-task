# Watchlist Process - 每日市场发现与监控流程

> 自动化市场发现、筛选、评分、入池、跟踪、出清的完整流程

## 概述

本流程定义如何从 Polymarket 广阔的市场海洋中，识别并跟踪高价值交易机会。

**核心原则**：
- 每日扫描发现新机会
- 量化评分筛选优质市场
- 动态跟踪及时调整
- 纪律性出清锁定收益/止损

---

## 一、信息源 (Information Sources)

### 1.1 API 数据源 (程序化)

| 优先级 | 数据源 | 端点 | 用途 |
|--------|--------|------|------|
| P0 | **Gamma Markets API** | `GET https://gamma-api.polymarket.com/markets` | 市场列表、筛选、排序 |
| P0 | **Midpoint Price API** | `GET /midpoints?token_id=xxx` | 获取实时买卖中间价 |
| P0 | **Last Trade Price** | `GET /last-trade-price?token_id=xxx` | 最新成交价 |
| P1 | **Order Book (CLOB)** | `GET https://clob.polymarket.com/orderbook?token_id=xxx` | 订单簿深度、价差 |
| P1 | **Fee Rate API** | `GET /fee-rate?token_id=xxx` | 交易手续费 |
| P2 | **Events API** | `GET https://gamma-api.polymarket.com/events` | 事件日历、关联市场 |

### 1.2 人工/社区源

| 优先级 | 来源 | 用途 |
|--------|------|------|
| P1 | Polymarket 首页热门 | 人工发现趋势市场 |
| P2 | Twitter/X #Polymarket | 社区热点讨论 |
| P2 | Polymarket Discord | 实时市场情绪 |

---

## 二、筛选标准 (Filtering Criteria)

### 2.1 基础筛选 (必须满足)

```yaml
筛选条件:
  流动性:
    min_liquidity: 1000  # USD 最小流动性
  状态:
    - active: true       # 未关闭
    - closed: false       # 未结算
  时间:
    - end_date > now + 24h  # 至少24小时后结算
```

### 2.2 进阶筛选 (加分项)

- **volume_num_min**: 交易量 > $10,000
- **tag_id**: 属于热门分类 (Politics, Sports, Crypto, Science)
- **uma_resolution_status**: 有明确结算规则

---

## 三、评分模板 (Scoring Template)

### 3.1 市场评分卡 (Markdown 表格版)

| 评分维度 | 权重 | 评分标准 | 得分 (1-10) |
|----------|------|----------|-------------|
| **流动性** | 20% | >$50k=10, >$10k=7, >$1k=4, <$1k=1 | __ |
| **价差 (Bid-Ask Spread)** | 15% | <1%=10, <3%=7, <5%=4, >5%=1 | __ |
| **波动性** | 15% | 适中波动=10, 高波动=7, 死水=3 | __ |
| **结算清晰度** | 15% | 明确规则=10, 模糊=5, 争议高风险=1 | __ |
| **信息事件日历** | 10% | 近期有催化剂=10, 中期=6, 无事件=3 | __ |
| **对冲可能性** | 10% | 有相关市场可对冲=10, 部分=5, 无=1 | __ |
| **风险等级** | 15% | 低=10, 中=6, 高=2 | __ |
| **加权总分** | 100% | Σ(得分×权重) | __/10 |

### 3.2 YAML 评分模板 (机器可读)

```yaml
# watchlist-scoring.yaml
# 用于程序化评分的市场评分卡

scoring_weights:
  liquidity: 0.20
  spread: 0.15
  volatility: 0.15
  settlement_clarity: 0.15
  event_calendar: 0.10
  hedgeability: 0.10
  risk_level: 0.15

scoring_rules:
  liquidity_score:
    - condition: "liquidity >= 50000"
      score: 10
    - condition: "liquidity >= 10000"
      score: 7
    - condition: "liquidity >= 1000"
      score: 4
    - condition: "liquidity < 1000"
      score: 1

  spread_score:
    - condition: "spread_pct <= 1"
      score: 10
    - condition: "spread_pct <= 3"
      score: 7
    - condition: "spread_pct <= 5"
      score: 4
    - condition: "spread_pct > 5"
      score: 1

  volatility_score:
    - condition: "volatility_level == 'medium'"
      score: 10
    - condition: "volatility_level == 'high'"
      score: 7
    - condition: "volatility_level == 'low'"
      score: 3

  settlement_clarity_score:
    - condition: "uma_resolution_status == 'resolved'"
      score: 10
    - condition: "resolution_source == 'official'"
      score: 8
    - condition: "community_voted"
      score: 5
    - condition: "disputed_or_unclear"
      score: 1

  event_calendar_score:
    - condition: "days_to_event <= 7"
      score: 10
    - condition: "days_to_event <= 30"
      score: 6
    - condition: "days_to_event > 30"
      score: 3

  hedgeability_score:
    - condition: "has_correlated_markets >= 3"
      score: 10
    - condition: "has_correlated_markets >= 1"
      score: 5
    - condition: "no_correlated_markets"
      score: 1

  risk_level_score:
    - condition: "risk == 'low'"
      score: 10
    - condition: "risk == 'medium'"
      score: 6
    - condition: "risk == 'high'"
      score: 2

# 决策阈值
decision_thresholds:
  watchlist_entry: 7.0   # >=7.0 入池
  strong_buy: 8.5         # >=8.5 重点关注
  skip: 4.0               # <4.0 跳过
```

### 3.3 JSON 评分模板 (程序化)

```json
{
  "market_scoring": {
    "weights": {
      "liquidity": 0.20,
      "spread": 0.15,
      "volatility": 0.15,
      "settlement_clarity": 0.15,
      "event_calendar": 0.10,
      "hedgeability": 0.10,
      "risk_level": 0.15
    },
    "decision_thresholds": {
      "watchlist_entry": 7.0,
      "strong_buy": 8.5,
      "skip": 4.0
    }
  }
}
```

---

## 四、流程步骤 (Process Flow)

### 4.1 每日扫描 (Daily Discovery)

```
┌─────────────────────────────────────────────────────────────┐
│                    DAILY MARKET SCAN                         │
├─────────────────────────────────────────────────────────────┤
│ 1. API 获取今日新市场                                         │
│    GET /markets?start_date_min={today}&limit=100            │
│                                                             │
│ 2. 基础筛选                                                  │
│    - active=true, closed=false                              │
│    - liquidity >= $1000                                     │
│    - end_date > now + 24h                                   │
│                                                             │
│ 3. 量化评分 (使用上面评分模板)                                 │
│                                                             │
│ 4. 排序输出                                                  │
│    - 按加权总分降序                                          │
│                                                             │
│ 5. 入池决策                                                  │
│    - >=7.0: 加入 watchlist                                  │
│    - >=8.5: 标记为 strong_buy 候选                           │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 每周深度扫描 (Weekly Deep Dive)

```
┌─────────────────────────────────────────────────────────────┐
│                  WEEKLY DEEP SCAN                             │
├─────────────────────────────────────────────────────────────┤
│ 1. 全量市场扫描 (limit=500, offset 遍历)                      │
│                                                             │
│ 2. 分类扫描                                                  │
│    - tag_id=1: Politics                                     │
│    - tag_id=2: Sports                                        │
│    - tag_id=3: Crypto                                        │
│    - tag_id=4: Science                                       │
│                                                             │
│ 3. 事件日历扫描                                              │
│    - 获取未来 30 天内有明确事件的市场                          │
│                                                             │
│ 4. 对冲机会扫描                                              │
│    - 查找 condition_id 相关的多个市场                         │
│                                                             │
│ 5. 更新 watchlist 评分                                        │
│    - 重新评分现有池内市场                                     │
│    - 移除已不满足条件的市场                                    │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 入池 (Entry)

满足以下条件之一即可入池：
1. **评分 >= 7.0** (日常扫描)
2. **评分 >= 8.5** (重点候选)
3. **人工确认** (直觉+经验)

### 4.4 跟踪 (Tracking)

| 跟踪频率 | 检查项 |
|----------|--------|
| 每日 | 流动性变化、价差变化 |
| 每日 | 是否有新信息/事件催化剂 |
| 每日 | 仓位盈亏情况 |
| 每周 | 重新评分、更新优先级 |

### 4.5 出清 (Exit)

**出清触发条件**：
- 结算完成 (盈利或亏损)
- 评分降至 < 4.0
- 流动性枯竭 (< $500)
- 风险事件 (结算争议、取消)
- 时间到期 (临近结算无波动)

**出清优先级**：
1. 先结算已结束市场
2. 再处理低评分市场
3. 最后处理高风险市场

---

## 五、工具支持 (Tooling)

### 5.1 推荐命令

```bash
# 每日扫描 - 获取过去24小时新市场
curl "https://gamma-api.polymarket.com/markets?start_date_min=$(date -u +%Y-%m-%dT%H:%M:%SZ)&limit=100" | jq '.[] | select(.active==true) | {question, liquidity, volume, endDate}'

# 获取特定市场订单簿
curl "https://clob.polymarket.com/orderbook?token_id=YOUR_TOKEN_ID" | jq '.bids[0], .asks[0]'

# 计算价差
# spread = (ask - bid) / mid * 100%
```

### 5.2 自动化建议

见下方 "下一步自动化建议"

---

## 六、文件索引

- `watchlist-process.md` - 本文件: 流程定义
- `watchlist-scoring.yaml` - 评分模板 (机器可读)
- `sources.md` - 数据源清单
- `config/stations.yaml` - 气象站/机场选点库

---

## 七、Stations 选点库与自动绑定

### 7.1 stations.yaml 配置

`poly-knowledge/config/stations.yaml` 包含美国主要机场/气象站的配置信息：

```yaml
stations:
  - name: "John F. Kennedy International Airport"
    icao: "KJFK"
    iata: "JFK"
    nws_station: "KJFK"
    grid:
      gridId: "OKX"
      gridX: 215
      gridY: 114
      forecastUrl: "https://api.weather.gov/gridpoints/OKX/215,114/forecast"
    tags: [temp, precip, wind, visibility, aviation]
```

**字段说明：**
- `name`: 机场/城市全称
- `icao`: 4-letter ICAO 代码 (用于 METAR/TAF)
- `iata`: 3-letter IATA 代码 (用于航班查询)
- `nws_station`: NWS 观测站代码
- `grid`: NWS 预报网格 ID (用于 forecast API)
  - `gridId`: NWS grid ID
  - `gridX`, `gridY`: 网格坐标
  - `forecastUrl`: 预报 API URL
- `tags`: 适用的市场标签 (temp/precip/wind/visibility/aviation)

### 7.2 自动绑定机制

在 `generate-watchlist.mjs` 中实现：

1. **加载配置**: 启动时自动加载 `stations.yaml`
2. **关键词提取**: 从 market question/description 提取：
   - ICAO 代码 (如 KJFK, KLAX)
   - IATA 代码 (如 JFK, LAX)
   - 城市名 (如 New York, Boston, Chicago)
3. **匹配算法**:
   - 优先级: ICAO > IATA > 城市名 > 别名
   - 最大绑定数量: 3 个站点
   - 无匹配时使用 fallback (KJFK, KORD, KLAX)
4. **输出**: 绑定站点写入 watchlist item.stations

### 7.3 绑定示例

| Market Question | 绑定 Stations | 说明 |
|-----------------|---------------|------|
| "Will it snow in NYC on Feb 28?" | KJFK, KLGA, KEWR | NYC 匹配三个 NYC 机场 |
| "Will there be flight delays at LAX?" | KLAX | 直接匹配 IATA |
| "Temperature in Chicago above 80F?" | KORD, KMDW | 匹配 Chicago 两个机场 |
| "Rain in Seattle this weekend?" | KSEA | 匹配 Seattle |

### 7.4 监控源增强

绑定的站点信息会自动填充到 watchlist 的：
- `monitor_sources`: 列出绑定的站点及其预报/METAR链接
- `entry_plan`: 引用绑定站点作为优先数据源
- `thesis`: 说明已接入哪些站点

---

*Last updated: 2026-02-28 - Added stations.yaml binding feature*

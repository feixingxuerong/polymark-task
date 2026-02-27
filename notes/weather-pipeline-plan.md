# Weather Market Monitoring Pipeline - Architecture Plan

> Issue #12: 最小可用天气市场监控/筛选 pipeline

---

## 1. 目标概述

把 issue #10 的研究成果落地为可持续的「找机会」流水线，服务后续交易决策（不自动下单）。

---

## 2. 数据源设计

### 2.1 市场数据源 (Gamma API)

| 端点 | 用途 |
|------|------|
| `GET /markets?tag=weather` | 获取天气类市场列表 |
| `GET /markets?conditionId={id}` | 获取相关市场 |
| `GET /markets?search=温度/降雪/台风` | 关键词搜索 |

**提取字段**：
- `marketId`, `conditionId`, `slug`, `question`
- `rules` (结算规则描述)
- `resolutionSource` (结算来源提示)
- `endDate` (到期时间)
- `liquidity`, `volume`, `spread`
- `groupItemTitle` (事件组)

### 2.2 官方气象数据源 (Tier-1)

基于 weather-data-sources.md 的建议：

| 优先级 | 数据源 | API | 用途 |
|--------|--------|-----|------|
| P0 | **Open-Meteo** | `https://api.open-meteo.com/v1/forecast` | 免费、易用、实时预报 |
| P0 | **NOAA/NCEI** | `https://www.ncei.noaa.gov/cdo-web/api/v2/` | 官方结算验证 |
| P1 | **Meteostat** | Python SDK | 历史数据对比 |
| P1 | **ECMWF** | ADS API | 高级概率预报 |

### 2.3 数据映射策略

```
Market Question → Location → Station → API Query
示例: "Will it snow in NYC on Feb 28?" 
  → NYC → KJFK / KNYC → open-meteo?latitude=40.64&longitude=-73.77
```

---

## 3. 数据模型

### 3.1 市场卡片 (Market Card)

```yaml
market_card:
  # 基础信息
  market_id: "..."
  condition_id: "..."
  slug: "will-it-snow-in-nyc-on-feb-28"
  question: "Will it snow in NYC on February 28, 2026?"
  
  # 流动性/交易
  liquidity_usd: 12500
  volume_usd: 8320
  bid: 0.42
  ask: 0.45
  spread_pct: 6.8
  
  # 结算信息
  resolution_source: "NOAA/NWS"
  resolution_criteria: "≥1 inch snowfall at JFK Airport (KJFK)"
  end_date: "2026-02-28T23:59:59Z"
  
  # 绑定的气象站
  station:
    id: "KJFK"
    name: "John F. Kennedy International Airport"
    source: "NOAA LCD"
    latitude: 40.6413
    longitude: -73.7781
  
  # 风险标注 (per issue #10)
  risk_flags:
    - time_window: "specify exact hour range"
    - timezone: "UTC vs local ambiguous"
    - threshold: "boundary value unclear"
    - data_dispute: "potential correction"
```

### 3.2 Watchlist 输出 Schema

```json
{
  "generated_at": "2026-02-27T17:00:00Z",
  "markets": [
    {
      "market_id": "...",
      "question": "...",
      "liquidity": 0,
      "risk_level": "low|medium|high",
      "risk_flags": [...],
      "official_station": {...},
      "data_source_link": "https://..."
    }
  ]
}
```

---

## 4. 风险标注 (per Issue #10)

每个市场自动标注以下风险 flag：

| Flag | 检查项 |
|------|--------|
| `TIME_WINDOW_UNCLEAR` | 时间窗/时刻未明确 |
| `TIMEZONE_AMBIGUOUS` | UTC vs 本地时未注明 |
| `STATION_UNSPECIFIED` | 未指定具体气象站 |
| `THRESHOLD_VAGUE` | 阈值表述模糊 |
| `DATA_SOURCE_UNCLEAR` | 结算数据源未明确 |
| `BOUNDARY_UNCLEAR` | 边界值处理不明 |
| `NO_VERIFICATION_SOURCE` | 无公开可验证数据源 |

---

## 5. 推荐的 Folder/File 结构

```
polymark-task/
├── scripts/
│   ├── weather-pipeline/
│   │   ├── README.md                    # 使用说明
│   │   ├── config.yaml                  # 配置 (API keys, defaults)
│   │   ├── fetch_weather_markets.py    # 主脚本：拉取 Gamma API
│   │   ├── bind_stations.py             # 绑定气象站
│   │   ├── fetch_weather_data.py       # 获取官方气象数据
│   │   ├── risk_annotator.py            # 风险标注
│   │   ├── output_watchlist.py          # 输出 watchlist
│   │   ├── run.py                       # CLI 入口 (python run.py --help)
│   │   └── requirements.txt             # 依赖
│   │
│   └── generate-watchlist.mjs          # 已有：通用 watchlist 生成
│
├── poly-knowledge/
│   ├── notes/
│   │   ├── weather-resolution-clarity.md   # 已完成 (issue #10)
│   │   ├── weather-data-sources.md           # 已完成 (issue #10)
│   │   └── weather-probability-template.md   # 已完成 (issue #10)
│   │
│   └── outputs/
│       └── weather-watchlist-{date}.json     # pipeline 输出
│
└── docs/
    └── weather-pipeline.md                # 架构文档 (本文档)
```

---

## 6. First Milestone 交付物

### 目标：MVP - 可运行的最小可用版本

**交付内容**：

1. **可执行脚本** (`scripts/weather-pipeline/`)
   - `run.py --fetch` : 拉取天气类市场列表
   - `run.py --bind` : 绑定气象站
   - `run.py --full` : 完整 pipeline

2. **输出示例**
   - 10 个候选市场的 watchlist (JSON + Markdown)
   - 每个市场的官方数据源链接

3. **CLI 帮助**
   ```
   python run.py --help
   Usage: run.py [OPTIONS]
   
     --fetch         Fetch weather markets from Gamma API
     --bind          Bind official weather stations
     --output FILE   Output file path
   ```

### 验收标准

- [ ] 能拉取 Gamma API 天气类市场
- [ ] 能绑定至少 10 个市场的官方数据源
- [ ] 输出可读的 JSON/Markdown watchlist
- [ ] 包含 issue #10 定义的 risk flags
- [ ] 本地一键运行

---

## 7. 下一步 (Next Steps)

1. **创建目录结构** (如上所示)
2. **实现 `fetch_weather_markets.py`** - Gamma API 拉取
3. **实现 `bind_stations.py`** - 关键词 → 气象站映射
4. **实现 `risk_annotator.py`** - 自动风险标注
5. **实现 `run.py`** - CLI 入口
6. **生成示例输出** - 10 个市场示例

---

*Plan created for Issue #12*

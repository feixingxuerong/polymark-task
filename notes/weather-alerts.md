# Weather Alerts 文档

## 概述

Weather Alerts 是 polymark-task 的低打扰提醒系统，专注于 `action=考虑` 的 Top3~5 市场，只在满足特定触发条件时生成提醒，避免 spam。

## 触发条件

### 1. 时间触发

- **T-24h**: 距离市场结算 24 小时内
- **T-6h**: 距离市场结算 6 小时内
- **临近结算**: 无明确 endDate 或已过期

### 2. 数据源更新

当 `weather-aviation-sources` 的 `generated_at` 发生变化时触发。

> 注：数据源更新是全局触发，会附加到所有符合条件的 Top5市场上。

## 产物 Schema

### JSON Schema

```
poly-knowledge/outputs/weather-alerts-YYYY-MM-DD.json
```

结构：

```json
{
  "generated_at": "ISO8601 timestamp",
  "date": "YYYY-MM-DD",
  "version": "1.0.0",
  "summary": {
    "total_alerts": 3,
    "trigger_types": {
      "t_minus_24h": 2,
      "t_minus_6h": 0,
      "source_updated": 0,
      "near_settlement": 1
    },
    "markets_filtered": 30,
    "alerts_sent": 3
  },
  "alerts": [
    {
      "rank": 1,
      "market_id": "123456",
      "slug": "market-slug",
      "question": "Market question",
      "url": "https://polymarket.com/market/...",
      "category": "sports|weather|crypto|unknown",
      "trigger": {
        "type": "t_minus_24h|t_minus_6h|source_updated|near_settlement",
        "reason": "24小时倒计时",
        "timestamp": "ISO8601",
        "details": "endDate: ..."
      },
      "market_data": {
        "end_date": "ISO8601 or null",
        "days_to_event": 0.95,
        "hours_to_event": 22.8,
        "liquidity": 15000.00,
        "action": "观察 - 等待比赛结果",
        "entry_plan": "比赛开始前1小时检查赔率...",
        "stations": ["KNYC", "KJFK"]
      },
      "next_steps": [
        "检查最新天气预报",
        "确认流动性充足",
        "验证结算规则"
      ],
      "kb_link": "/weather/today"
    }
  ],
  "sources": {
    "watchlist": "watchlist-2026-02-27.json",
    "watchlist_diff": "watchlist-diff-2026-02-27.json",
    "weather_sources": "weather-aviation-sources-2026-02-28.json"
  },
  "config": {
    "top_n": 5,
    "trigger_lookahead_hours": 48,
    "min_liquidity": 500
  }
}
```

### Markdown 输出

```
poly-knowledge/outputs/weather-alerts-YYYY-MM-DD.md
```

格式：人类可读的提醒列表，包含触发原因、市场信息和下一步建议。

## 过滤逻辑

1. **读取最新 watchlist**: 优先使用通用 `watchlist-*.json`，其次 `weather-watchlist-*.json`
2. **筛选 action**: 
   - 通用 watchlist: `action` 包含"考虑"或"观察"
   - 天气 watchlist: `weather_signal_score >= 7.0`
3. **排序取 Top 5**: 按 rank 排序
4. **触发检查**: 对每个市场检查是否满足触发条件
5. **生成提醒**: 只对满足条件的生成 alert

## 缓存机制

数据源更新检测使用缓存文件：

```
poly-knowledge/outputs/alerts-cache.json
```

记录上次检查的 `sources_timestamp`。

## 自动化

### 建议：OpenClaw Cron

每 4 小时运行一次：

```bash
# OpenClaw cron 配置示例
0 */4 * * * cd polymark-task && node scripts/generate-weather-alerts.mjs
```

### Discord 通知（可选）

可扩展 `message` 工具发送到指定频道：

- 建议新建 `weather-alerts` 频道
- 或复用 `poly-status` 频道

示例 alert 格式：

> **Weather Alert** 🔔
> 
> **Stade Rennais vs Toulouse: O/U 1.5**
> - 触发: 24小时倒计时
> - 剩余: 22.7小时
> - 流动性: $105,083
> - [查看市场](https://polymarket.com/market/...)

## 文件位置

- **脚本**: `scripts/generate-weather-alerts.mjs`
- **Schema**: `scripts/weather-alerts-schema.mjs`
- **输出**: `poly-knowledge/outputs/weather-alerts-YYYY-MM-DD.json/md`
- **缓存**: `poly-knowledge/outputs/alerts-cache.json`

## 注意事项

- 不要 spam：只有 Top5 + 满足触发才生成
- 优先使用通用 watchlist（覆盖面更广）
- 数据源更新是全局触发，避免频繁打扰
- 所有时间基于 UTC

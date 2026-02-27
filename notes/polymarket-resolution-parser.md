# Polymarket 结算口径解析器

> 从市场规则文本中自动解析结算参数：站点、时间窗、指标、阈值、数据源

## 概述

`scripts/parse-resolution-rules.mjs` 是一个轻量级的结算规则解析器，不引入重依赖，仅使用正则表达式和模板匹配。它从 Polymarket 市场的 `description` 字段中提取结构化信息，帮助自动化生成更精确的入场计划。

## 功能特性

### 支持的解析字段

| 字段 | 说明 | 示例 |
|------|------|------|
| `station` | 气象站/机场代码 | KJFK, EGLL, LHR |
| `geo` | 城市/地区名称 | New York, Tokyo, London |
| `window_start` | 时间窗开始 | 00:00 UTC |
| `window_end` | 时间窗结束 | 23:59 UTC |
| `window_text` | 原始时间描述 | by 23:59 UTC |
| `metric` | 指标类型 | temperature, precipitation, wind, visibility, snow, etc. |
| `metric_unit` | 指标单位分类 | temp, precip, wind, vis, etc. |
| `threshold` | 阈值字符串 | >= 95°F, > 10mm |
| `threshold_type` | 比较类型 | above, below, range |
| `threshold_value` | 数值 | 95, 10 |
| `threshold_unit` | 单位 | °F, mm, knots |
| `resolution_source` | 官方数据源 | NOAA/NWS, Met Office, JMA |

### 支持的指标类型

- **temperature**: 温度 (°C/°F)
- **precipitation**: 降水量 (mm/inches)
- **snow**: 降雪量/积雪深度
- **wind**: 风速 (knots/mph/km/h)
- **visibility**: 能见度 (miles/km)
- **humidity**: 湿度 (%)
- **pressure**: 气压 (hpa/mb)
- **thunderstorm**: 雷暴/闪电
- **air_quality**: 空气质量 (PM2.5/AQI)
- **hurricane**: 飓风/台风

### 支持的站点标识

- **ICAO 代码**: 4字符机场代码 (KJFK, EGLL, RJTT)
- **IATA 代码**: 3字符机场代码 (JFK, LHR, NRT)
- **城市名**: 常见城市英文名称 (New York, Tokyo, London)

### 支持的时间格式

- `by 23:59 UTC`
- `at 12:00 Local`
- `between 00:00 and 23:59`
- `00:00-23:59`
- 日期范围: `2024-06-15` 或 `2024-06-01 - 2024-06-30`

## 使用方法

### 作为模块导入

```javascript
import { parseResolutionRules, enhanceEntryPlan } from './parse-resolution-rules.mjs';

// 解析规则文本
const resolution = parseResolutionRules(
  "Temperature at KJFK exceeds 95°F by 23:59 UTC"
);

// 增强入场计划
const entryPlan = enhanceEntryPlan(
  resolution,
  "T-24h: 检查 NOAA 预报更新；若流动性充足可考虑入场。"
);
```

### CLI 直接运行

```bash
node parse-resolution-rules.mjs "Temperature at KJFK exceeds 95°F by 23:59 UTC"
```

## 示例输入输出

### 示例 1: 温度超过阈值

**输入:**
```
Temperature at KJFK exceeds 95°F by 23:59 UTC
```

**输出:**
```json
{
  "success": true,
  "station": { "type": "icao", "values": ["KJFK"] },
  "geo": null,
  "window_start": null,
  "window_end": "23:59 UTC",
  "window_text": "by 23:59 UTC",
  "metric": "temperature",
  "metric_unit": "temp",
  "threshold": ">= 95 °F",
  "threshold_type": "above",
  "threshold_value": 95,
  "threshold_unit": "°F",
  "resolution_source": null
}
```

### 示例 2: 降水量范围

**输入:**
```
Rainfall at London Heathrow (EGLL) >= 10mm on 2024-06-15
```

**输出:**
```json
{
  "success": true,
  "station": { "type": "icao", "values": ["EGLL"] },
  "geo": null,
  "window_start": null,
  "window_end": null,
  "window_text": null,
  "metric": "precipitation",
  "metric_unit": "precip",
  "threshold": ">= 10 mm",
  "threshold_type": "above",
  "threshold_value": 10,
  "threshold_unit": "mm",
  "resolution_source": null
}
```

### 示例 3: 降雪量 + 时间窗

**输入:**
```
Snowfall at Chicago ORD exceeds 12 inches between 00:00 and 23:59
```

**输出:**
```json
{
  "success": true,
  "station": { "type": "iata", "values": ["ORD"] },
  "geo": null,
  "window_start": "00:00 UTC",
  "window_end": "23:59 UTC",
  "window_text": "between 00:00 and 23:59",
  "metric": "precipitation",
  "metric_unit": "precip",
  "threshold": ">= 12 inches",
  "threshold_type": "above",
  "threshold_value": 12,
  "threshold_unit": "inches",
  "resolution_source": null
}
```

### 示例 4: 能见度低于阈值

**输入:**
```
Visibility at San Francisco SFO drops below 0.5 miles
```

**输出:**
```json
{
  "success": true,
  "station": { "type": "iata", "values": ["SFO"] },
  "geo": null,
  "window_start": null,
  "window_end": null,
  "window_text": null,
  "metric": "visibility",
  "metric_unit": "vis",
  "threshold": "<= 0.5 miles",
  "threshold_type": "below",
  "threshold_value": 0.5,
  "threshold_unit": "miles",
  "resolution_source": null
}
```

### 示例 5: 城市 + 温度

**输入:**
```
Maximum temperature in Tokyo exceeds 35°C
```

**输出:**
```json
{
  "success": true,
  "station": null,
  "geo": { "type": "city", "values": ["Tokyo"] },
  "window_start": null,
  "window_end": null,
  "window_text": null,
  "metric": "temperature",
  "metric_unit": "temp",
  "threshold": ">= 35 °C",
  "threshold_type": "above",
  "threshold_value": 35,
  "threshold_unit": "°C",
  "resolution_source": null
}
```

### 示例 6: 增强后的 entry_plan

**原始 entry_plan:**
```
T-24h: 检查 NOAA 预报更新；T-6h: 确认预报收敛。若流动性充足且 spread<3% 可考虑入场。
```

**解析结果 + enhanceEntryPlan 输出:**
```
结算时间窗: by 23:59 UTC；结算指标: 温度 >= 95 °F；结算站点: KJFK。T-24h: 检查 NOAA 预报更新；T-6h: 确认预报收敛。若流动性充足且 spread<3% 可考虑入场。
```

## 集成到 watchlist 生成

解析器已集成到 `scripts/generate-watchlist.mjs`：

1. 自动从市场 `description` 字段解析结算规则
2. 对于 weather/aviation 类别的市场，会尝试解析
3. 解析结果会增强 `entry_plan` 字段
4. 解析失败不影响原有流程
5. 解析结果存储在 `resolution_parsed` 字段中

### 日志示例

```
[RESOLUTION] Parsed: temperature @ KJFK = >= 95 °F
[RESOLUTION] Parsed: precipitation @ EGLL = >= 10 mm
```

## 限制与注意事项

1. **解析失败不影响流程**: 即使解析失败，也会使用原有的模板化 entry_plan
2. **依赖 description 字段**: 需要市场提供详细的 description 才能解析
3. **识别精度**: 基于正则匹配，可能对非标准格式的规则解析不完整
4. **数据源识别**: 目前仅支持常见数据源名称的识别
5. **不支持的格式**: 复杂的结算规则（如"取前三站平均"）需要更复杂的解析逻辑

## 扩展建议

- 支持更多语言（目前主要是英文）
- 添加更多数据源识别
- 支持更复杂的规则（如"取平均"、"取最大"）
- 与 weather-adapters 集成，自动获取绑定站点的数据

---

*Last updated: 2026-02-28*

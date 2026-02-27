# Weather & Aviation Data Adapters

> NOAA/NWS + METAR/TAF 数据源适配器技术文档

---

## 概述

本适配器提供对 NOAA/NWS 天气数据和航空 METAR/TAF 数据的只读访问，用于 Polymarket 天气市场的结算验证和数据采集。

**约束**：
- ✅ 免费使用（NOAA 公开数据）
- ✅ 无需 API Key
- ✅ 需要设置 User-Agent
- ✅ 遵守服务条款
- ✅ 内置重试和限速机制

---

## 数据源

### 1. NOAA/NWS 天气 API

| 属性 | 值 |
|------|-----|
| **名称** | NOAA/NWS API |
| **基础 URL** | `https://api.weather.gov` |
| **文档** | [NWS API Docs](https://www.weather.gov/documentation/services-web-api) |
| **速率限制** | 宽松（无明确限制） |
| **认证** | 仅需 User-Agent |
| **归属** | National Weather Service (NWS), NOAA |

**支持的端点**：
- `/points/{lat},{lon}` - 获取网格坐标
- `/gridpoints/{wfo}/{x},{y}/forecast` - 12小时预报
- `/gridpoints/{wfo},{x},{y}/forecast/hourly` - 小时预报
- `/stations/{stationId}/observations/latest` - 实时观测
- `/alerts/active?area={state}` - 天气警报

**示例调用**：
```javascript
// 获取某点的天气预报
const gridUrl = `https://api.weather.gov/points/${lat},${lon}`;
const grid = await fetch(gridUrl, {
  headers: { 'User-Agent': 'MyApp/1.0 (contact@example.com)' }
});
const forecastUrl = grid.properties.forecast;
const forecast = await fetch(forecastUrl);
```

### 2. 航空 METAR/TAF API

| 属性 | 值 |
|------|-----|
| **名称** | NWS Aviation Weather |
| **基础 URL** | `https://api.weather.gov/stations/{stationId}/tafs` |
| **文档** | [NWS API Docs](https://www.weather.gov/documentation/services-web-api) |
| **速率限制** | 与 NWS API 相同 |
| **覆盖范围** | 仅美国本土（US stations） |
| **归属** | National Weather Service (NWS), NOAA |

**注意**：NWS API 目前仅支持美国机场的非 TAF 数据（非完整 TAF）。如需完整 TAF 数据，可考虑：
- [AVWX API](https://avwx.rest/) - 免费额度可用
- [Ogimet](https://www.ogimet.com/) - 免费 METAR/TAF
- [CheckWX](https://www.checkwxapi.com/) - 免费 METAR

---

## 输出 Schema

### 天气数据 Schema

```typescript
interface WeatherData {
  generated_at: string;           // ISO8601 时间戳
  source: "noaa-nws-api";
  
  observations: [{
    station: {
      id: string;                  // ICAO 代码 (如 KNYC)
      name: string;               // 站点名称
      coordinates: { lat: number; lon: number };
    };
    
    time_window: {
      start: string;
      end: string;
    };
    
    // 关键字段
    temperature: {
      value_f: number;
      value_c: number;
      feels_like_f?: number;
    };
    
    precipitation: {
      type: "none" | "rain" | "snow" | "freezing" | "mixed";
      amount_inches: number;
      snow_depth_inches?: number;
    };
    
    wind: {
      speed_mph: number;
      direction_degrees: number;
      gust_mph?: number;
    };
    
    visibility: {
      miles: number;
    };
  }];
}
```

### 航空数据 Schema

```typescript
interface AviationData {
  generated_at: string;
  source: "aviation-weather-gov";
  
  metars: [{
    airport: {
      icao: string;                // 如 KJFK
      iata: string;               // 如 JFK
      name: string;
    };
    
    flight_category: "VFR" | "MVFR" | "IFR" | "LIFR";
    
    wind: {
      direction_degrees: number;
      speed_knots: number;
      gust_knots?: number;
    };
    
    visibility: {
      sm: number;                 // Statute miles
      meters: number;
    };
    
    clouds: [{
      cover: "FEW" | "SCT" | "BKN" | "OVC";
      base_ft_agl: number;
    }];
    
    // 衍生字段
    derived: {
      is_vfr: boolean;
      ceiling_ft: number;
      visibility_sm: number;
    };
  }];
  
  // TAF 数据（目前 NWS API 不提供完整 TAF）
  tafs: [];
}
```

---

## 使用方法

### 1. 安装依赖

```bash
# 无需额外依赖，仅使用 Node.js 内置模块
```

### 2. 运行单个数据源

```bash
# 获取 NOAA 天气预报
node scripts/fetch-noaa-forecast.mjs

# 获取 METAR/TAF 数据
node scripts/fetch-metar-taf.mjs
```

### 3. 运行组合生成器

```bash
# 生成组合输出
node scripts/generate-weather-aviation-sources.mjs
```

### 4. 输出文件

生成的文件位于 `poly-knowledge/outputs/`：

```
poly-knowledge/outputs/
├── weather-aviation-sources-YYYY-MM-DD.json   # JSON 数据
└── weather-aviation-sources-YYYY-MM-DD.md     # Markdown 摘要
```

---

## 配置

### 修改默认站点

编辑脚本中的配置：

```javascript
// fetch-noaa-forecast.mjs
const CONFIG = {
  SAMPLE_STATIONS: [
    { id: 'KNYC', name: 'Central Park, NY', lat: 40.7789, lon: -73.9695 },
    // 添加更多站点...
  ]
};

// fetch-metar-taf.mjs
const CONFIG = {
  SAMPLE_AIRPORTS: [
    { icao: 'KJFK', iata: 'JFK', name: 'JFK Airport', city: 'New York', lat: 40.6413, lon: -73.7781 },
    // 添加更多机场...
  ]
};
```

### 修改 User-Agent

```javascript
const CONFIG = {
  USER_AGENT: 'YourApp/1.0 (contact@example.com)'
};
```

---

## 结算验证用例

### 温度市场

```javascript
// 检查温度是否超过阈值
const obs = weatherData.observations[0];
const tempF = obs.temperature.value_f;
const exceedsThreshold = tempF >= 100;
```

### 降水/降雪市场

```javascript
// 检查是否有降水
const precip = obs.precipitation;
const hasSnow = precip.type === 'snow' && precip.snow_accumulation_inches >= 1;
```

### 航班延误市场

```javascript
// 使用 METAR 数据判断天气状况
const metar = aviationData.metars[0];
const isVFR = metar.flight_category === 'VFR';
const badWeather = metar.flight_category === 'IFR' || metar.flight_category === 'LIFR';
```

---

## 限制与注意事项

### API 限制

1. **NWS API 仅覆盖美国**：非美国站点返回 404
2. **TAF 数据不完整**：NWS API 的 TAF 端点可能不返回完整数据
3. **数据延迟**：观测数据可能有 10-20 分钟延迟
4. **预报不确定性**：天气预报存在不确定性，请注意风险

### 使用建议

1. **多源验证**：建议同时记录 2-3 个数据源进行交叉验证
2. **历史回溯**：NWS API 不保留历史快照，建议自行缓存
3. **时区处理**：所有时间明确标注 UTC 或本地时区
4. **单位转换**：美国用华氏度/英里，公制国家用摄氏度/公里

### 替代数据源

| 数据源 | 用途 | 备注 |
|--------|------|------|
| Open-Meteo | 全球天气预报 | 免费，无需 Key |
| Meteostat | 历史气象数据 | Python SDK |
| ECMWF | 专业预报 | 需注册 |
| Ogimet | 全球 METAR/TAF | 免费，网页抓取 |
| AVWX | 航空天气 API | 免费额度 |

---

## 文件结构

```
polymark-task/
├── scripts/
│   ├── data-schemas.mjs                    # 数据 Schema 定义
│   ├── fetch-noaa-forecast.mjs             # NOAA 天气获取
│   ├── fetch-metar-taf.mjs                # METAR/TAF 获取
│   └── generate-weather-aviation-sources.mjs  # 组合生成器
├── poly-knowledge/
│   ├── outputs/
│   │   └── weather-aviation-sources-*.{json,md}  # 生成的输出
│   └── notes/
│       └── weather-aviation-data-adapters.md  # 本文档
└── sources.md                              # 数据源索引
```

---

## 许可与归属

- **数据来源**：National Weather Service (NWS), NOAA
- **API 文档**：[https://www.weather.gov/documentation/services-web-api](https://www.weather.gov/documentation/services-web-api)
- **使用条款**：遵守 NOAA 数据使用政策

---

*Last updated: 2026-02-28*
*Author: Subagent (data-adapters)*

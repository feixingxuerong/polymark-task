# 天气市场结算清晰度指南

> 天气预测市场核心风险：结算口径不明。本文提供 P0 checklist，确保结算争议前识别风险。

---

## 1. P0 结算检查清单

每次评估天气市场时，必须逐项核对以下要素：

### 1.1 时间窗 (Time Window) - [ ] 待检查

- [ ] **结算时刻**：市场指定的"决定时刻"是几点？(UTC / 本地时)
- [ ] **时间范围**：是特定时刻、24小时、还是某个时间段？
- [ ] **时区**：官方数据源的时区与市场描述是否一致？
- [ ] **夏令时**：是否考虑夏令时切换影响？

**常见问题**：
- "Will it snow in NYC on January 15?" - 指的是哪一天的什么时候？
- "Temperature exceeds 35°C" - 是当天最高温？还是特定时刻？

### 1.2 站点/位置 (Station/Location) - [ ] 待检查

- [ ] **数据源指定**：市场明确指定了哪个气象站？
- [ ] **站点代码**：是否有 ICAO / WMO / GHCN 站点代码？
- [ ] **替代方案**：如果主站无数据，是否有备用站点？
- [ ] **城市级别**：说的是"城市"还是"机场"？(机场数据更权威)

**常见问题**：
- "London temperature" - 是 London City Airport 还是 Heathrow？
- "NYC" - 中央公园还是 JFK？

### 1.3 阈值定义 (Threshold Definition) - [ ] 待检查

- [ ] **数值类型**：是 > / < / ≥ / ≤ ？
- [ ] **单位**：°C / °F？mm / inch？mph / km/h？
- [ ] **临界值处理**：边界值如何处理？(如 35.0°C 算不算"超过35°C")
- [ ] **四舍五入**：官方数据通常保留几位小数？

**常见问题**：
- "Above 100°F" - 100.1°F 算吗？100.0°F 呢？
- "More than 10mm rain" - 9.9mm 呢？

### 1.4 数据源 (Data Source) - [ ] 待检查

- [ ] **官方来源**：市场指定的是哪个数据源？
- [ ] **发布机构**：NOAA / NWS / ECMWF / 当地气象局？
- [ ] **数据类型**：是观测值 (observation) 还是预报 (forecast)？
- [ ] **数据层级**：是 surface / upper-air / satellite？

**关键原则**：结算必须基于**已发生的观测数据**，而非预报。

### 1.5 争议风险 (Dispute Risk) - [ ] 待检查

- [ ] **数据修正**：数据源后续修订怎么办？
- [ ] **缺失数据**：指定站点无数据如何处理？
- [ ] **多源冲突**：两个权威来源数据矛盾听谁的？
- [ ] **极端事件**：百年一遇的天气如何验证？

---

## 2. 常见措辞陷阱示例

### 陷阱 1：模糊的时间表述

| ❌ 风险表述 | ✅ 清晰表述 |
|------------|------------|
| "Will it snow in Chicago tomorrow?" | "Will Chicago O'Hare Airport (KORD) record ≥1 inch of snowfall between 00:00-23:59 CST on 2026-02-28, per NOAA/NWS observation data?" |
| "Temperature above 30°C in summer" | "Will Beijing Nanjiao Observatory (54511) record temperature ≥30.0°C on 2026-07-15, per China Meteorological Administration?" |

### 陷阱 2：未指定数据源

| ❌ 风险表述 | ✅ 清晰表述 |
|------------|------------|
| "Will London be the hottest city?" | "Will London Heathrow (EGLL) record higher maximum temperature than Paris Charles de Gaulle (LFPG) on 2026-08-15, per respective national meteorological services?" |
| "Will it be a warm winter?" | "Will Beijing (54511) have average temperature ≥5.0°C for December 2026, per NCMRC?" |

### 陷阱 3：阈值歧义

| ❌ 风险表述 | ✅ 清晰表述 |
|------------|------------|
| "More than 50mm rain" | "Will Shanghai Hongqiao (58362) record precipitation ≥50.0mm in 24-hour period ending 20:00 CST, per CMA?" |
| "Temperature below freezing" | "Will temperature fall below 0.0°C (32.0°F), i.e., frost recorded, at the specified station?" |

### 陷阱 4：位置不明确

| ❌ 风险表述 | ✅ 清晰表述 |
|------------|------------|
| "Hurricane hits Florida" | "Will NOAA/NHC declare a Category 1+ hurricane made landfall on Florida peninsula between 2026-06-01 and 2026-11-30?" |
| "Major earthquake in Japan" | "Will JMA register magnitude ≥6.5 earthquake with epicenter in Japan region (latitude 24-46°N, longitude 123-146°E)?" |

---

## 3. 典型天气市场类型与结算要点

### 3.1 温度类

- **市场示例**："Will Beijing exceed 40°C in summer?"
- **结算要点**：
  - 站点：北京南郊观测站 (54511)
  - 数据源：CMA 国家级气象站数据
  - 阈值：最高温度 ≥40.0°C
  - 时间：指定日期的 02:00-02:00 北京时

### 3.2 降雪/降水类

- **市场示例**："First snow in NYC before December 1?"
- **结算要点**：
  - 站点：Central Park (KNYC) 或 JFK (KJFK)
  - 数据源：NOAA/LCD (Local Climatological Data)
  - 阈值：降水量 ≥0.1 inch (或积雪深度 ≥trace)

### 3.3 台风/飓风类

- **市场示例**："Typhoon makes landfall in Shanghai in 2026?"
- **结算要点**：
  - 数据源：JMA / CMA / JTWC 官方警报
  - 确认标准：台风中心进入指定行政区划边界
  - 等级：热带风暴 (TS) 及以上

### 3.4 极端温度记录

- **市场示例**："Record high temperature in 2026?"
- **结算要点**：
  - 历史对比：CMA/NOAA 官方历史极值库
  - 需要当日数据打破历史记录
  - 需多源验证

---

## 4. 结算争议处理流程

当遇到数据争议时：

1. **记录问题**：截图/存档原始数据页面
2. **多源对比**：检查 2-3 个独立数据源
3. **回溯检查**：查看历史修正记录
4. **社区参考**：查找类似历史结算案例
5. **官方申诉**：通过 Polymarket 争议流程申诉

---

## 5. 快速检查清单 (打印版)

```
□ 时间：结算时刻/时段清晰？
□ 地点：站点/城市明确？有代码？
□ 阈值：数值/单位/边界处理？
□ 数据：官方来源指定？已验证可获取？
□ 争议：潜在冲突点识别？

综合风险评估：□ 低 / □ 中 / □ 高
```

---

*Last updated: 2026-02-27*
*Author: Subagent-Weather-Research*

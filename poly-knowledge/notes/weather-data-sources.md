# 天气数据源综述

> 预测市场需要权威、可回溯、实时更新的天气数据。本文档对比主流数据源，帮你选择最适合的工具。

---

## 1. 官方气象机构数据源

### 1.1 NOAA / NWS (美国)

| 维度 | 详情 |
|------|------|
| **机构** | National Oceanic and Atmospheric Administration / National Weather Service |
| **数据产品** | GHCN (Global Historical Climatology Network), LCD (Local Climatological Data), NOAA Climate Data Online |
| **更新频率** | 每日/每小时更新 |
| **历史数据** | 可追溯 1800 年代 |
| **覆盖范围** | 全球 |
| **访问方式** | FTP, HTTPS, API |
| **免费** | 完全免费 |
| **数据格式** | CSV, JSON, GRIB2 |

**优势**：
- 全球最权威的气象数据机构
- 标准化程度高，站点代码统一 (GHCND, WBAN)
- 历史数据完整，适合回溯验证

**劣势**：
- 界面较老旧，API 文档难懂
- 美国站点数据丰富，海外站点可能稀疏

**适用场景**：美国及全球主要城市的历史/实时数据验证

### 1.2 NCEI (美国国家环境信息中心)

| 维度 | 详情 |
|------|------|
| **机构** | National Centers for Environmental Information |
| **产品** | GHCN-Daily, Global Summary of the Day, Climate Normals |
| **更新频率** | 每日 |
| **历史数据** | 1800 年代至今 |
| **访问方式** | HTTPS, FTP |

**适用场景**：历史气温、降水、风速等标准化数据获取

### 1.3 ECMWF (欧洲中期天气预报中心)

| 维度 | 详情 |
|------|------|
| **机构** | European Centre for Medium-Range Weather Forecasts |
| **核心产品** | IFS (Integrated Forecasting System), ERA5 (再分析数据) |
| **更新频率** | 每日两次 (00:00, 12:00 UTC) |
| **预报时效** | 15天 (高分辨率) + 50天 (集合预报) |
| **空间分辨率** | 9km (HRES) / 18km (ENS) |
| **访问方式** | MARS (档案服务器), API, ADS (数据分发) |
| **免费** | 部分免费 (需注册) |

**优势**：
- 全球最先进的中期数值预报模型
- 集合预报提供概率分布
- ERA5 再分析数据是气候研究金标准

**劣势**：
- 数据访问需要注册和配置
- 非气象专业人士上手困难
- 中国区域预报有时不如本地模型

**适用场景**：中期天气预报、概率预测、气候研究

### 1.4 GFS (全球预报系统)

| 维度 | 详情 |
|------|------|
| **机构** | NCEP (National Centers for Environmental Prediction) |
| **更新频率** | 每日四次 (00/06/12/18 UTC) |
| **预报时效** | 16天 |
| **空间分辨率** | 0.25° (~27km) |
| **数据格式** | GRIB2 |
| **访问方式** | NOMADS, IDD, FTP |
| **免费** | 完全免费 |

**优势**：
- 美国官方全球预报模型
- 更新频繁，数据容易获取
- 许多第三方天气 App 的数据源

**劣势**：
- 精度略低于 ECMWF
- 极端天气事件预报能力有限

**适用场景**：获取全球网格化天气预报数据

---

## 2. 聚合 API 服务

### 2.1 Open-Meteo

| 维度 | 详情 |
|------|------|
| **类型** | 开源免费天气 API |
| **数据源** | DWD, ECMWF, NOAA, JMA 等混合 |
| **更新频率** | 每小时更新本地模型 |
| **预报时效** | 7-14 天 |
| **空间分辨率** | 1-11 km (因地区而异) |
| **历史数据** | 80+ 年 (需 Historical API) |
| **访问方式** | HTTPS JSON API |
| **免费** | 免费 (非商业用途)，无需 API Key |

**核心功能**：
- Current weather (实时天气)
- Hourly forecast (小时预报)
- Daily forecast (每日预报)
- Historical weather (历史数据)
- Marine weather (海洋天气)
- Air quality (空气质量)

**优势**：
- 完全免费，无需注册
- 接口简单，curl 即可调用
- 历史数据丰富 (80年+)
- 支持全球地点

**劣势**：
- 非官方机构数据
- 极端事件可能不如官方准确
- 商业使用有上限 (10,000次/天)

**适用场景**：快速原型开发、免费天气应用、非商业研究

**示例调用**：
```bash
curl "https://api.open-meteo.com/v1/forecast?latitude=39.9&longitude=116.4&current=temperature_2m,wind_speed_10m&hourly=temperature_2m"
```

### 2.2 Meteostat

| 维度 | 详情 |
|------|------|
| **类型** | 历史气候数据平台 |
| **数据源** | NOAA, DWD, 各国气象部门 |
| **历史数据** | 1970 年代至今 (因站点而异) |
| **站点数量** | 100,000+ 气象站 |
| **访问方式** | Python SDK, JSON API, Bulk CSV |
| **免费** | 免费 (非商业用途) |

**核心功能**：
- Hourly/Daily 数据
- 站点搜索
- 气象站元数据

**优势**：
- 站点级历史数据权威
- Python SDK 非常好用
- 数据格式标准化

**劣势**：
- 仅提供历史数据，无实时/预报
- 站点数据完整度参差不齐
- 无 API 实时推送

**适用场景**：历史气候分析、气象站对比、验证历史天气事件

**示例调用 (Python)**：
```python
from meteostat import Stations, Daily
from datetime import datetime

stations = Stations()
stations = stations.nearby(39.9, 116.4)
station = stations.fetch(1)
data = Daily(station, datetime(2026, 2, 1), datetime(2026, 2, 27))
print(data.fetch())
```

### 2.3 OpenWeatherMap

| 维度 | 详情 |
|------|------|
| **类型** | 商业天气 API |
| **免费额度** | 1000 次/天 (免费版) |
| **数据源** | 自有模型 + 官方数据融合 |
| **产品** | Current, Forecast, Historical, Air Pollution, UV Index |

**适用场景**：需要商业级支持的天气应用

---

## 3. 各数据源对比

| 数据源 | 更新频率 | 历史数据 | 免费 | 难度 | 推荐场景 |
|--------|----------|----------|------|------|----------|
| NOAA/NCEI | 每日/每小时 | 1800s+ | ✅ | 中 | 官方结算验证 |
| ECMWF | 12h/次 | ERA5 1940+ | 部分 | 高 | 专业概率预测 |
| GFS | 6h/次 | 有限 | ✅ | 中 | 全球网格预报 |
| Open-Meteo | 每小时 | 80年+ | ✅ (限) | 低 | 快速开发 |
| Meteostat | 每日 | 1970s+ | ✅ | 低 | 历史数据验证 |
| OpenWeatherMap | 实时 | 5年+ | ✅ (限) | 低 | 商业应用 |

---

## 4. 预测市场数据源选择建议

### 4.1 结算验证 (Settlement Verification)

**首选**：NOAA/NCEI (美国) / 各国国家级气象机构

- 官方观测数据，最具权威性
- 数据修正机制完善
- 站点代码标准化

**备选**：Meteostat (全球站点历史数据)

### 4.2 预测建模 (Forecast Modeling)

**首选**：Open-Meteo + ECMWF 集合预报

- Open-Meteo 提供简单易用的 API
- ECMWF 集合预报提供概率分布
- 可获取多模型集成

### 4.3 实时监控 (Real-time Monitoring)

**首选**：Open-Meteo (免费) / NOAA APIs (官方)

- Open-Meteo 每小时更新
- NOAA 提供实时观测数据

---

## 5. 数据可回溯性检查

预测市场需要能**事后验证**，因此必须确认：

- [ ] 数据源是否保留历史快照？
- [ ] 原始数据是否可追溯？(URL/版本/时间戳)
- [ ] 数据修正是否有记录？
- [ ] 多源数据是否一致？

**建议**：同时记录 2-3 个数据源，交叉验证。

---

## 6. API 快速调用示例

### Open-Meteo 获取北京 7 天预报

```bash
curl "https://api.open-meteo.com/v1/forecast?latitude=39.9&longitude=116.4&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia/Shanghai"
```

### Meteostat 获取北京历史数据 (Python)

```python
from meteostat import Stations, Daily
from datetime import datetime

stations = Stations()
stations = stations.nearby(39.9, 116.4)
station = stations.fetch(1)

data = Daily(station, datetime(2026, 1, 1), datetime(2026, 12, 31))
df = data.fetch()
print(df[['tavg', 'tmin', 'tmax', 'prcp']])
```

---

## 7. 注意事项

1. **时区**：所有时间必须明确时区，UTC 还是本地时
2. **单位**：美国用华氏度/英寸，公制国家用摄氏度/毫米
3. **站点迁移**：气象站可能搬迁，站点 ID 可能变化
4. **数据延迟**：官方数据可能有数小时到数天延迟

---

*Last updated: 2026-02-27*
*Author: Subagent-Weather-Research*

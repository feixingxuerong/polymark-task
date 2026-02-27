## 手动收集 Polymarket 天气市场 (Issue #32)

已完成 Polymarket 天气市场的手动收集。以下是 12 个活跃的天气相关市场，适合加入 watchlist：

### 温度市场 (Temperature)

| 市场 | 交易量 | 流动性 | 结束日期 | 结算源 |
|------|--------|--------|----------|---------|
| [Highest temperature in NYC on Feb 27](https://polymarket.com/event/highest-temperature-in-nyc-on-february-27-2026) | $210K | $67K | Feb 27 | Wunderground (KLGA) |
| [Highest temperature in NYC on Feb 28](https://polymarket.com/event/highest-temperature-in-nyc-on-february-28-2026) | $45K | $41K | Feb 28 | Wunderground (KLGA) |
| [Highest temperature in Chicago on Feb 27](https://polymarket.com/event/highest-temperature-in-chicago-on-february-27-2026) | $87K | $45K | Feb 27 | Wunderground (KORD) |
| [Highest temperature in Miami on Feb 27](https://polymarket.com/event/highest-temperature-in-miami-on-february-27-2026) | $98K | $272K | Feb 27 | Wunderground (KMIA) |
| [Highest temperature in Dallas on Feb 27](https://polymarket.com/event/highest-temperature-in-dallas-on-february-27-2026) | $210K | $556K | Feb 27 | Wunderground (KDFW) |
| [Highest temperature in Atlanta on Feb 27](https://polymarket.com/event/highest-temperature-in-atlanta-on-february-27-2026) | $85K | $88K | Feb 27 | Wunderground (KATL) |
| [Highest temperature in Seattle on Feb 27](https://polymarket.com/event/highest-temperature-in-seattle-on-february-27-2026) | $73K | $31K | Feb 27 | Wunderground (KSEA) |

### 降水市场 (Precipitation)

| 市场 | 交易量 | 流动性 | 结束日期 | 结算源 |
|------|--------|--------|----------|---------|
| [Precipitation in NYC in February?](https://polymarket.com/event/precipitation-in-nyc-in-february) | $218K | $11K | Feb 28 | NOAA/NCEI |
| [Precipitation in Seattle in February?](https://polymarket.com/event/precipitation-in-seattle-in-february) | $281K | $15K | Feb 28 | NOAA/NCEI |

### 极端天气 (Severe Weather)

| 市场 | 交易量 | 流动性 | 结束日期 | 结算源 |
|------|--------|--------|----------|---------|
| [How many Tornadoes in the US in February?](https://polymarket.com/event/how-many-tornadoes-in-the-us-in-february) | $197K | $19K | Mar 10 | NCEI |
| [How many 7.0+ earthquakes in 2026?](https://polymarket.com/event/how-many-7pt0-or-above-earthquakes-in-2026) | $734K | $48K | Dec 31 | USGS |
| [Will any Cat 4 hurricane hit US before 2027?](https://polymarket.com/event/will-any-category-4-hurricane-make-landfall-in-the-us-in-before-2027) | $253K | $6K | Dec 31 | NHC |

### 绑定到 stations.yaml

所有温度市场已绑定到 `stations.yaml` 中的对应气象站：
- NYC 市场 -> KJFK, KLGA, KEWR
- Chicago 市场 -> KORD, KMDW  
- Miami 市场 -> KMIA, KFLL
- Dallas 市场 -> KDFW
- Atlanta 市场 -> KATL
- Seattle 市场 -> KSEA

### JSON 输出

完整 JSON 数据已保存至：`polymark-task/notes/weather-markets-collect.json`

### 备注

- 温度市场使用 Weather Underground 数据，结算源明确
- 飓风市场使用 NHC (国家飓风中心) 官方数据
- 地震/龙卷风使用 USGS/NCEI 官方统计
- Dallas 温度市场流动性最高 ($556K)，适合大额交易
- Miami 温度市场次之 ($272K)

**建议**: 优先关注高流动性、温度相关的短期市场进行监控。

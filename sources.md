# Sources

## 项目文档

- Index: [index.md](./index.md)
- 案例研究: [notes/polymarket-event-case-studies.md](./notes/polymarket-event-case-studies.md)
- 纸上回测: [notes/paper-backtest-framework.md](./notes/paper-backtest-framework.md)

Polymarket 官方文档与示例（只读部分）

- Polymarket Docs index: https://docs.polymarket.com/
- Docs LLM index (full page list): https://docs.polymarket.com/llms.txt
- API Introduction (Gamma/Data/CLOB base URLs): https://docs.polymarket.com/api-reference/introduction.md
- Gamma API OpenAPI example (List events): https://docs.polymarket.com/api-reference/events/list-events.md
- CLOB API OpenAPI example (Get order book): https://docs.polymarket.com/api-reference/market-data/get-order-book.md
- Core concepts (Markets & Events): https://docs.polymarket.com/concepts/markets-events.md

Live endpoint sanity check (public):
- Gamma markets sample: https://gamma-api.polymarket.com/markets?limit=1

---

## 资金管理研究 (Issue #17)

### Kelly Criterion 核心资源

- Kelly Criterion 详解: https://www.investopedia.com/terms/k/kellycriterion.asp
- Kelly Criterion 实战应用: https://www.investopedia.com/articles/trading/04/091504.asp
- 维基百科: https://en.wikipedia.org/wiki/Kelly_criterion

### 仓位管理原则

- 单市场最大仓位建议: 20-25% 资金
- 推荐使用 Quarter-Kelly (1/4 凯利) 降低方差
- 预测市场特殊考虑：流动性、手续费、事件风险

### 实时航班数据

- Flightradar24 Airport Disruption: https://www.flightradar24.com/data/airport-disruption (实时Disruption Index)
- Flightradar24 Statistics: https://www.flightradar24.com/data/statistics (全球航班统计)
- FlightAware ADS-B: https://www.flightaware.com/adsb/ (全球航班追踪)
- Aviationstack API: https://aviationstack.com/ (程序化API, 免费100次/月)

### 政府/官方数据

- FAA OPSNET: https://aspm.faa.gov/opsnet/sys/Main.asp (美国机场延误原因分析)
- FAA ADIP: https://adip.faa.gov/agis/public/ (机场元数据)
- BTS: https://www.bts.gov/ (美国航空运输全维度数据)
- EUROCONTROL: https://www.eurocontrol.int/ (欧洲空管performance data)

### 研究/开源

- OpenSky Network: https://opensky-network.org/ (学术用途ADS-B数据)
- ADS-B Exchange: https://www.adsbexchange.com/data/ (全类型航班数据)

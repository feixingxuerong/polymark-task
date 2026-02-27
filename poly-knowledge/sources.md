# Poly Sources

> 所有参考资料的来源清单 - 可追溯、可验证、分类清晰

## 模板

每条来源记录格式：

```markdown
### 来源名称

- **URL**: [链接]
- **类型**: [文档/API/书籍/论文/视频/文章/社区]
- **用途**: [这个来源解决什么问题]
- **可信度**: [高/中/低] - 基于来源官方性、更新时间
- **更新频率**: [实时/每日/每周/不频繁]
- **备注**: [额外说明、关键章节、有效期]
- **验证日期**: YYYY-MM-DD
```

---

## Polymarket 官方来源

### 文档中心

| # | 来源 | 用途 | 可信度 |
|---|------|------|--------|
| 1 | **Polymarket Docs** - 开发者文档首页 | 整体架构、Quickstart、API概览 | 高 |
| 2 | **Core Concepts** - Markets & Events | 理解市场、事件、代币的基本概念 | 高 |
| 3 | **API Reference** - REST/WebSocket | 程序化交易接口详细参数 | 高 |
| 4 | **SDKs** - Python/TypeScript | 官方客户端库使用方法 | 高 |

### 具体页面

#### 1. Polymarket Documentation (Home)

- **URL**: https://docs.polymarket.com
- **类型**: 官方文档
- **用途**: 入口页面，了解整体架构和最新功能
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 包含 Quickstart、概念指南、API参考、SDK
- **验证日期**: 2026-02-27

#### 2. Core Concepts - Markets & Events

- **URL**: https://docs.polymarket.com/concepts/markets-events
- **类型**: 官方文档
- **用途**: 理解市场结构、事件分组、代币化
- **可信度**: 高
- **更新频率**: 低（核心概念稳定）
- **备注**: Binary questions, Yes/No outcomes, Event groups
- **验证日期**: 2026-02-27

#### 3. Quickstart Guide

- **URL**: https://docs.polymarket.com/quickstart
- **类型**: 官方文档
- **用途**: 首次开发的环境配置、API调用示例
- **可信度**: 高
- **更新频率**: 每周
- **备注**: 包含 Python/TypeScript 代码示例
- **验证日期**: 2026-02-27

#### 4. API Reference

- **URL**: https://docs.polymarket.com/api-reference/introduction
- **类型**: API文档
- **用途**: REST/WebSocket 端点、认证方式、限流规则
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 需要深入研究，特别是 WebSocket streams
- **验证日期**: 2026-02-27

#### 5. Python SDK (py_clob_client)

- **URL**: https://github.com/polymarket/py_clob-client
- **类型**: 开源SDK
- **用途**: 程序化交易、订单创建与撤销
- **可信度**: 高
- **更新频率**: 活跃
- **备注**: Python 开发者首选
- **验证日期**: 2026-02-27

#### 6. TypeScript SDK (@polymarket/clob-client)

- **URL**: https://github.com/polymarket/clob-client
- **类型**: 开源SDK
- **用途**: 前端/DApp 集成
- **可信度**: 高
- **更新频率**: 活跃
- **备注**: TypeScript/JavaScript 开发者使用
- **验证日期**: 2026-02-27

---

## 费率与成本

| # | 来源 | 用途 | 可信度 |
|---|------|------|--------|
| 7 | **Fees Overview** | 交易手续费、Gas成本 | 高 |
| 8 | **Neg Risk机制** | 负风险保险费用、AMA | 高 |

#### 7. Trading Fees

- **URL**: https://docs.polymarket.com/concepts/fees
- **类型**: 官方文档
- **用途**: 了解平台费、流动性提供者收益
- **可信度**: 高
- **更新频率**: 低
- **备注**: 需进一步获取具体费率百分比
- **验证日期**: 2026-02-27

#### 8. Neg Risk (Negative Risk)

- **URL**: https://docs.polymarket.com/concepts/neg-risk
- **类型**: 官方文档
- **用途**: 理解AMA保险机制、对冲策略
- **可信度**: 高
- **更新频率**: 低
- **备注**: 对高风险事件交易重要
- **验证日期**: 2026-02-27

---

## 市场数据与赔率

| # | 来源 | 用途 | 可信度 |
|---|------|------|--------|
| 9 | **Markets API** | 获取市场列表、实时赔率 | 高 |
| 10 | **Clob API** | 订单簿数据、深度图 | 高 |
| 11 | **Polymarket主站** | 热门市场、人工智能预测 | 中 |

#### 9. Markets API

- **URL**: https://docs.polymarket.com/api-reference/markets
- **类型**: API文档
- **用途**: 查询市场列表、历史数据、条件筛选
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 研究高流动性市场的关键接口。端点: `GET https://gamma-api.polymarket.com/markets`，支持 liquidity_num_min, volume_num_min, start_date_min 等筛选参数
- **验证日期**: 2026-02-27

#### 10. Order Book / Trading API

- **URL**: https://clob.polymarket.com (需进一步文档)
- **类型**: API文档
- **用途**: 获取订单簿、实时成交数据、计算价差
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 算法交易核心数据源。端点: `GET /orderbook?token_id=xxx`
- **验证日期**: 2026-02-27

#### 11. Polymarket.com (Main Site)

- **URL**: https://polymarket.com
- **类型**: Web应用
- **用途**: 查看热门市场、人工验证赔率
- **可信度**: 中
- **更新频率**: 实时
- **备注**: 适合人工浏览，不适合程序化获取
- **验证日期**: 2026-02-27

---

## 市场数据 API (新增)

| # | 来源 | 用途 | 可信度 |
|---|------|------|--------|
| 19 | **Midpoint Price API** | 实时中间价 (买卖平均价) | 高 |
| 20 | **Last Trade Price** | 最新成交价 | 高 |
| 21 | **Fee Rate API** | 市场交易费率 | 高 |
| 22 | **Events API** | 事件日历、关联市场 | 高 |
| 23 | **Server Time API** | 同步客户端时间 | 高 |

#### 19. Midpoint Price API

- **URL**: https://docs.polymarket.com/api-reference/data/get-midpoint-price.md
- **类型**: API文档
- **用途**: 获取中间价 (best_bid + best_ask) / 2
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 端点: `GET /midpoints?token_id=xxx`
- **验证日期**: 2026-02-27

#### 20. Last Trade Price API

- **URL**: https://docs.polymarket.com/api-reference/market-data/get-last-trade-price.md
- **类型**: API文档
- **用途**: 获取最新成交价和交易方向
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 端点: `GET /last-trade-price?token_id=xxx`
- **验证日期**: 2026-02-27

#### 21. Fee Rate API

- **URL**: https://docs.polymarket.com/api-reference/market-data/get-fee-rate.md
- **类型**: API文档
- **用途**: 获取特定市场的交易费率
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 端点: `GET /fee-rate?token_id=xxx`
- **验证日期**: 2026-02-27

#### 22. Events API

- **URL**: https://docs.polymarket.com/api-reference/events/list-events.md
- **类型**: API文档
- **用途**: 获取事件日历、事件关联的市场列表
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 端点: `GET /events`，可获取未来事件相关市场
- **验证日期**: 2026-02-27

#### 23. Server Time API

- **URL**: https://docs.polymarket.com/api-reference/data/get-server-time.md
- **类型**: API文档
- **用途**: 获取服务器时间戳，用于同步
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 端点: `GET /server-time`
- **验证日期**: 2026-02-27

---

## 只读 API 端点 (2026-02-27 新增)

| # | 来源 | 用途 | 可信度 |
|---|------|------|--------|
| 24 | **Polymarket API 笔记** | 只读 API 完整端点文档 | 高 |
| 25 | **Rate Limits** | API 速率限制详细 | 高 |
| 24 | **Gamma API - Markets** | 市场列表筛选端点 | 高 |
| 25 | **Gamma API - Events** | 事件列表端点 | 高 |
| 26 | **CLOB API - Orderbook** | 订单簿实时数据 | 高 |
| 27 | **CLOB API - Health** | 服务健康检查 | 高 |

#### 24. Polymarket 只读 API 技术笔记

- **URL**: `poly-knowledge/notes/polymarket-api-readonly.md`
- **类型**: 本地技术笔记
- **用途**: 覆盖 Gamma/CLOB 只读端点、请求示例、watchlist 评分应用
- **可信度**: 高
- **更新频率**: 按需
- **备注**: 基于官方 docs.polymarket.com 整理
- **验证日期**: 2026-02-27

#### 25. Rate Limits

- **URL**: https://docs.polymarket.com/api-reference/rate-limits.md
- **类型**: API文档
- **用途**: 了解各端点的速率限制
- **可信度**: 高
- **更新频率**: 低
- **备注**: Gamma: 4k/10s, CLOB: 9k/10s, Data: 1k/10s
- **验证日期**: 2026-02-27

#### 26. Gamma API - Markets

- **URL**: https://gamma-api.polymarket.com/markets
- **类型**: API端点
- **用途**: 获取市场列表，支持 liquidity_num_min, volume_num_min 等筛选
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 核心只读端点，无需认证
- **验证日期**: 2026-02-27

#### 27. Gamma API - Events

- **URL**: https://gamma-api.polymarket.com/events
- **类型**: API端点
- **用途**: 获取事件列表和关联市场
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 用于获取即将到期的事件
- **验证日期**: 2026-02-27

#### 28. CLOB API - Orderbook

- **URL**: https://clob.polymarket.com/orderbook
- **类型**: API端点
- **用途**: 获取订单簿，计算点差
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 核心只读端点，无需认证
- **验证日期**: 2026-02-27

#### 29. CLOB API - Health

- **URL**: https://clob.polymarket.com/health
- **类型**: API端点
- **用途**: 服务健康检查
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 可用于监控服务可用性
- **验证日期**: 2026-02-27

---

## 结算与争议

| # | 来源 | 用途 | 可信度 |
|---|------|------|--------|
| 12 | **Settlement Rules** | 结算条件、延迟处理 | 高 |
| 13 | **Help Center** | 常见问题、争议流程 | 中 |
| 50 | **Order Lifecycle** | 订单匹配、链上结算流程 | 高 |
| 51 | **结算机制详解** | 完整的结算、争议、延迟场景文档 | 高 |

#### 12. Settlement & Resolutions

- **URL**: https://docs.polymarket.com/concepts/settlement
- **类型**: 官方文档
- **用途**: 了解结算时机、结果确定方式
- **可信度**: 高
- **更新频率**: 低
- **备注**: 需深入研究结算争议处理
- **验证日期**: 2026-02-27

#### 13. Help Center / FAQ

- **URL**: https://help.polymarket.com
- **类型**: 帮助文档
- **用途**: 用户常见问题、账户问题
- **可信度**: 中
- **更新频率**: 每周
- **备注**: 补充官方文档未覆盖的问题
- **验证日期**: 2026-02-27

#### 50. Order Lifecycle

- **URL**: https://docs.polymarket.com/concepts/order-lifecycle.md
- **类型**: 官方文档
- **用途**: 理解订单匹配、链上结算流程、交易状态
- **可信度**: 高
- **更新频率**: 低
- **备注**: 包含 MATCHED → MINED → CONFIRMED 状态流转
- **验证日期**: 2026-02-27

#### 51. Polymarket 结算机制详解 (本地笔记)

- **URL**: `poly-knowledge/notes/polymarket-settlement.md`
- **类型**: 本地技术笔记
- **用途**: 完整的结算流程、争议处理 (MIC)、延迟结算场景
- **可信度**: 高
- **更新频率**: 按需
- **备注**: 基于官方文档和 API 分析整理
- **验证日期**: 2026-02-27

---

## 风控与策略

| # | 来源 | 用途 | 可信度 |
|---|------|------|--------|
| 14 | **预测市场书籍/论文** | 理论基础、策略框架 | 中 |
| 15 | **成功案例分享** | 实战经验、盈亏分析 | 低-中 |
| 16 | **社区讨论** | 实时策略交流 | 中 |

#### 待获取来源

- [ ] **"The Wisdom of Crowds"** - James Surowiecki
- [ ] **"Prediction Markets"** - 学术论文
- [ ] **Polymarket Discord** - 社区讨论
- [ ] **Twitter/X 交易者** - 公开策略分享

---

## 第三方工具

| # | 来源 | 用途 | 可信度 |
|---|------|------|--------|
| 17 | **Hyperliquid** | 资金划转、杠杆交易 | 中 |
| 18 | **区块链浏览器** | 链上数据验证 | 高 |

#### 17. Hyperliquid

- **URL**: https://hyperliquid.xyz
- **类型**: 交易平台
- **用途**: Polymarket 资金出入、衍生品
- **可信度**: 中
- **更新频率**: 实时
- **备注**: 需要单独学习其API
- **验证日期**: 2026-02-27

#### 18. Polymarket Contract (Polygon/AMOY)

- **URL**: https://polygonscan.com/address/...
- **类型**: 区块链浏览器
- **用途**: 验证链上交易、智能合约
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 需查找具体合约地址
- **验证日期**: 2026-02-27

---

## Watchlist 生成器使用的端点

| # | 端点 | 用途 | 可信度 |
|---|------|------|--------|
| 30 | **Gamma API - Markets** | 获取市场列表、筛选 | 高 |
| 31 | **CLOB API - Orderbook** | 订单簿数据、计算点差/深度 | 高 |
| 32 | **CLOB API - Midpoints** | 中间价 | 高 |
| 33 | **CLOB API - Last Trade Price** | 最新成交价 | 高 |
| 34 | **CLOB API - Fee Rate** | 交易费率 | 高 |

#### 30. Gamma API - Markets

- **URL**: https://gamma-api.polymarket.com/markets
- **类型**: API端点
- **用途**: 获取市场列表，支持 liquidity_num_min, volume_num_min 等筛选
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 核心只读端点，无需认证。用于 watchlist 候选筛选
- **验证日期**: 2026-02-27

#### 31. CLOB API - Orderbook

- **URL**: https://clob.polymarket.com/orderbook
- **类型**: API端点
- **用途**: 获取订单簿，计算点差 (spread = ask - bid)
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 核心只读端点，无需认证
- **验证日期**: 2026-02-27

#### 32. CLOB API - Midpoints

- **URL**: https://clob.polymarket.com/midpoints
- **类型**: API端点
- **用途**: 获取中间价 (best_bid + best_ask) / 2
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 用于计算隐含概率
- **验证日期**: 2026-02-27

#### 33. CLOB API - Last Trade Price

- **URL**: https://clob.polymarket.com/last-trade-price
- **类型**: API端点
- **用途**: 获取最新成交价和交易方向
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 用于获取当前隐含概率
- **验证日期**: 2026-02-27

#### 34. CLOB API - Fee Rate

- **URL**: https://clob.polymarket.com/fee-rate
- **类型**: API端点
- **用途**: 获取特定市场的交易费率
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 用于计算净预期收益
- **验证日期**: 2026-02-27

---

## 天气数据源 (2026-02-27 新增)

| # | 来源 | 用途 | 可信度 |
|---|------|------|--------|
| 40 | **NOAA/NCEI** | 美国及全球气象观测数据 | 高 |
| 41 | **ECMWF** | 欧洲中期天气预报、集合预报 | 高 |
| 42 | **GFS** | 全球预报系统数据 | 高 |
| 43 | **Open-Meteo** | 免费开源天气 API | 中-高 |
| 44 | **Meteostat** | 历史气象站数据 | 中 |
| 45 | **NWS** | 美国天气预报与警报 | 高 |

#### 40. NOAA/NCEI (National Centers for Environmental Information)

- **URL**: https://www.ncei.noaa.gov/products
- **类型**: 官方数据平台
- **用途**: 获取全球历史气象数据、气候标准值、官方结算验证
- **可信度**: 高
- **更新频率**: 每日/每小时
- **备注**: GHCN-Daily 全球历史气候网络，标准化站点代码 (GHCND)
- **验证日期**: 2026-02-27

#### 41. ECMWF (European Centre for Medium-Range Weather Forecasts)

- **URL**: https://www.ecmwf.int/
- **类型**: 官方气象机构
- **用途**: 中期天气预报、集合预报概率、ERA5 再分析数据
- **可信度**: 高
- **更新频率**: 每日两次 (00:00, 12:00 UTC)
- **备注**: IFS 模型是全球最先进的中期预报系统，集合预报提供概率分布
- **验证日期**: 2026-02-27

#### 42. GFS (Global Forecast System)

- **URL**: https://www.nco.ncep.noaa.gov/pmb/products/gfs/
- **类型**: 官方气象模型
- **用途**: 获取全球网格化天气预报数据
- **可信度**: 高
- **更新频率**: 每日四次 (00/06/12/18 UTC)
- **备注**: 0.25° 分辨率，16天预报时效，GRIB2 格式
- **验证日期**: 2026-02-27

#### 43. Open-Meteo

- **URL**: https://open-meteo.com/
- **类型**: 开源天气 API
- **用途**: 快速获取全球天气预报、历史数据 (80+ 年)
- **可信度**: 中-高
- **更新频率**: 每小时更新本地模型
- **备注**: 完全免费，无需 API Key，JSON API 易于使用
- **验证日期**: 2026-02-27

#### 44. Meteostat

- **URL**: https://meteostat.net/ / https://dev.meteostat.net/
- **类型**: 历史气候数据平台
- **用途**: 获取全球气象站历史数据、验证历史天气事件
- **可信度**: 中
- **更新频率**: 每日
- **备注**: 100,000+ 站点，Python SDK 非常好用，1970s 至今
- **验证日期**: 2026-02-27

#### 45. NWS (National Weather Service)

- **URL**: https://www.weather.gov/
- **类型**: 官方气象服务
- **用途**: 美国天气预报、警报、实时观测数据
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 美国官方天气预报，站点代码标准化
- **验证日期**: 2026-02-27

#### 45a. NWS API (api.weather.gov)

- **URL**: https://www.weather.gov/documentation/services-web-api
- **类型**: 官方API
- **用途**: 程序化获取美国天气预报、观测、TAF/METAR数据
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 免费，无需API Key，需要User-Agent头，速率限制~5000次/日
- **验证日期**: 2026-02-28

#### 45b. Weather Data Adapters (本地实现)

- **URL**: `scripts/fetch-noaa-forecast.mjs`, `scripts/fetch-metar-taf.mjs`
- **类型**: 自定义脚本
- **用途**: 从NWS API批量获取天气预报和航空天气数据
- **可信度**: 高 (基于NWS API)
- **更新频率**: 按需
- **备注**: 
  - `fetch-noaa-forecast.mjs`: 获取NWS网格预报、小时预报、实时观测
  - `fetch-metar-taf.mjs`: 获取METAR/TAF飞行天气报告、飞行规则分类(VFR/MVFR/IFR/LIFR)
  - 位置: `polymark-task/scripts/`
- **验证日期**: 2026-02-28

---

## 航空数据源 (2026-02-27 新增)

| # | 来源 | 用途 | 可信度 |
|---|------|------|--------|
| 46 | **FAA OPSNET** | 美国航班延误统计、延误原因分类 | 高 |
| 47 | **Flightradar24 Disruption** | 全球机场实时 disruption 指数 | 高 |
| 48 | **FlightAware** | 全球航班追踪、航路分析 | 中-高 |
| 49 | **Aviationstack API** | 程序化航班状态查询 | 中-高 |
| 50 | **BTS** | 美国航空运输历史数据 | 高 |

#### 46. FAA OPSNET

- **URL**: https://aspm.faa.gov/opsnet/sys/Main.asp
- **类型**: 政府公开数据
- **用途**: 美国机场天气影响评估、延误原因分类（Weather vs Carrier vs NAS）
- **可信度**: 高
- **更新频率**: 每日/每月
- **备注**: 提供延误原因分类，可有效排除非天气因素
- **验证日期**: 2026-02-27

#### 47. Flightradar24 Airport Disruption Map

- **URL**: https://www.flightradar24.com/data/airport-disruption
- **类型**: 商业平台（免费+付费）
- **用途**: 实时机场 disruption 监控、天气影响快速评估
- **可信度**: 高
- **更新频率**: 实时
- **备注**: Disruption Index 0-5.0，全球约300个繁忙机场
- **验证日期**: 2026-02-27

#### 48. FlightAware ADS-B

- **URL**: https://www.flightaware.com/adsb/
- **类型**: 商业平台
- **用途**: 实时航班追踪、航路分析、绕飞检测
- **可信度**: 中-高
- **更新频率**: 实时
- **备注**: 全球 70% 客机覆盖，需付费获取历史数据
- **验证日期**: 2026-02-27

#### 49. Aviationstack API

- **URL**: https://aviationstack.com/
- **类型**: 商业API（免费Tier可用）
- **用途**: 程序化获取航班状态、机场时刻表
- **可信度**: 中-高
- **更新频率**: 实时
- **备注**: 免费版100次/月，适合测试和轻量使用
- **验证日期**: 2026-02-27

#### 50. Bureau of Transportation Statistics (BTS)

- **URL**: https://www.bts.gov/
- **类型**: 美国政府数据
- **用途**: 美国航班延误原因深度分析、乘客流量统计
- **可信度**: 高
- **更新频率**: 每日/每月
- **备注**: 历史数据丰富，权威性强
- **验证日期**: 2026-02-27

| # | 来源 | 用途 | 可信度 |
|---|------|------|--------|
| 60 | **Prediction Market (Wikipedia)** | 预测市场基础概念、历史发展 | 中 |
| 61 | **"The Wisdom of Crowds"** - James Surowiecki | 群体智慧理论框架 | 高 |
| 62 | **"The Use of Knowledge in Society"** - Hayek | 价格作为信息聚合机制 | 高 |

#### 60. Prediction Market (Wikipedia)

- **URL**: https://en.wikipedia.org/wiki/Prediction_market
- **类型**: 百科全书
- **用途**: 预测市场基础概念、历史发展、信息效率理论基础
- **可信度**: 中
- **更新频率**: 低
- **备注**: 包含 Iowa Electronic Markets、Intrade、Augur 等历史脉络
- **验证日期**: 2026-02-27

#### 61. "The Wisdom of Crowds" - James Surowiecki

- **URL**: https://en.wikipedia.org/wiki/The_Wisdom_of_the_Crowds
- **类型**: 书籍
- **用途**: 理解群体预测优于个体的条件与机制
- **可信度**: 高
- **更新频率**: 不频繁
- **备注**: 预测市场的核心理论基础之一
- **验证日期**: 2026-02-27

#### 62. "The Use of Knowledge in Society" - Friedrich Hayek

- **URL**: https://en.wikipedia.org/wiki/The_Use_of_Knowledge_in_Society
- **类型**: 经典论文
- **用途**: 理解市场价格作为信息聚合机制的理论基础
- **可信度**: 高
- **更新频率**: 不频繁
- **备注**: 1945 年经典论文，经济学必读
- **验证日期**: 2026-02-27

---

## 来源更新优先级

### 当前优先补充

1. **API Reference** - 完整端点清单
2. **结算规则** - 争议处理流程
3. **历史争议案例** - 社区讨论

### 后续补充

4. **策略书籍** - 理论框架
5. **成功/失败案例** - 实战复盘

---

## 天气 & 航空数据适配器 (2026-02-28 新增)

| # | 来源 | 用途 | 可信度 |
|---|------|------|--------|
| 70 | **NWS API** | 美国天气/航空数据官方 API | 高 |
| 71 | **fetch-noaa-forecast.mjs** | NOAA 天气预报批量获取脚本 | 高 |
| 72 | **fetch-metar-taf.mjs** | METAR/TAF 数据获取脚本 | 高 |
| 73 | **generate-weather-aviation-sources.mjs** | 组合输出生成器 | 高 |

#### 70. NWS API (api.weather.gov)

- **URL**: https://www.weather.gov/documentation/services-web-api
- **类型**: 官方 API
- **用途**: 程序化获取美国天气预报、观测、TAF/METAR 数据
- **可信度**: 高
- **更新频率**: 实时
- **备注**: 免费，无需 API Key，需要 User-Agent 头，速率限制宽松
- **验证日期**: 2026-02-28

#### 71. fetch-noaa-forecast.mjs

- **URL**: `scripts/fetch-noaa-forecast.mjs`
- **类型**: 自定义脚本
- **用途**: 从 NWS API 批量获取天气预报、小时预报、实时观测
- **可信度**: 高 (基于 NWS API)
- **更新频率**: 按需
- **备注**: 
  - 支持重试和限速
  - 输出 JSON + Markdown 摘要
  - 位置: `polymark-task/scripts/`
- **验证日期**: 2026-02-28

#### 72. fetch-metar-taf.mjs

- **URL**: `scripts/fetch-metar-taf.mjs`
- **类型**: 自定义脚本
- **用途**: 获取 METAR/TAF 飞行天气报告、飞行规则分类
- **可信度**: 高 (基于 NWS API)
- **更新频率**: 按需
- **备注**: 
  - 支持 VFR/MVFR/IFR/LIFR 分类
  - 支持风、能见度、云高等字段
  - 仅支持美国机场
  - 位置: `polymark-task/scripts/`
- **验证日期**: 2026-02-28

#### 73. generate-weather-aviation-sources.mjs

- **URL**: `scripts/generate-weather-aviation-sources.mjs`
- **类型**: 组合生成器
- **用途**: 聚合天气和航空数据，输出统一 JSON/MD
- **可信度**: 高
- **更新频率**: 按需
- **备注**: 
  - 输出到 `poly-knowledge/outputs/weather-aviation-sources-YYYY-MM-DD.json`
  - 包含数据源信息、摘要表、详细数据
  - 位置: `polymark-task/scripts/`
- **验证日期**: 2026-02-28

---

*Last updated: 2026-02-28 by Subagent (data-adapters)*

---

## 更新日志

### 2026-02-28

- 新增天气/航空数据适配器 (70-73)
- 新增 NWS API 数据源
- 新增 fetch-noaa-forecast.mjs、fetch-metar-taf.mjs、generate-weather-aviation-sources.mjs 脚本
- 更新人: Subagent (data-adapters)

### 2026-02-27

- 新增 Polymarket 官方文档来源 (1-6)
- 新增费率相关来源 (7-8)
- 新增市场数据API来源 (9-11)
- 新增结算争议来源 (12-13)
- 新增第三方工具来源 (17-18)
- 新增 watchlist 生成器使用的 API 端点 (30-34)
- 新增天气数据源 (40-45): NOAA/NCEI, ECMWF, GFS, Open-Meteo, Meteostat, NWS
- 标记待获取来源 (策略书籍、社区)
- 更新人: Subagent-Weather-Research (kb)

### 2026-02-27 (流动性分析)

- 新增流动性分析来源：
  - Markets API (流动性/成交量筛选参数)
  - Order Book API (订单簿深度、点差计算)
  - Fee Rate API (交易费率)
- 更新人: Subagent-Poly-Liquidity

### 2026-02-27

- 新增预测市场理论与行为金融来源 (60-62)
- 新增来源: Wikipedia, The Wisdom of Crowds, Hayek 经典论文
- 更新人: Subagent-Poly-Odds-Psych

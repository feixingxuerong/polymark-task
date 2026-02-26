# Polymarket 官方文档笔记

## 核心概念

### Markets (市场)
- 每个市场是一个二元预测问题 Yes/No
- 代表单一结果预测

### Events (事件)
- 多个相关市场的集合
- 例如: "2024年美国大选" 是一个 Event，包含多个市场

### Tokens (代币)
- 每个市场 outcome 对应一个 token (Yes token / No token)
- Token ID 是交易的核心参数

## API 要点

### Fee Rate (费率)
- API: `GET /fee-rate?token_id=xxx`
- 返回: `{"base_fee": 30}`
- **Fee 以 basis points (bps) 表示**: 30 = 0.30%
- 这是交易手续费，买卖双向收取

### 主要端点
- CLOB API: `https://clob.polymarket.com`
- 市场数据: 价格、交易量、订单簿
- 账户: 持仓、交易历史、余额

### SDKs
- TypeScript: `@polymarket/clob-client`
- Python: `py_clob_client`

## 下一步
- [ ] 获取实际费率数据 (测试环境)
- [ ] 了解流动性机制 (订单簿)
- [ ] 研究盈亏计算方式
- [ ] 查看热门市场列表

---
*更新: 2026-02-26*

# Polymarket 官方文档深挖（Issue #3）

> 更新：2026-02-27 - 基于官方 docs.polymarket.com 文档重写

---

## 一、核心机制概览

### 1.1 平台架构
- **CLOB (Central Limit Order Book)** + 链上结算的混合架构
- **预言机**：UMA Optimistic Oracle，去中心化、无需许可的结算机制
- **链**：Polygon (MATIC) 主网
- **资产**：USDC.e (USDC on Polygon)

### 1.2 交易标的
- 每个事件对应 YES/NO 两个 outcome tokens
- 价格 = 市场隐含概率 (0-1)
- 结算：赢家代币可兑换 $1，输家归零

---

## 二、手续费规则 (Fees)

### 2.1 费率市场 vs 免费市场

| 市场类型 | 费率 | Maker 返利 |
|---------|------|-----------|
| 大多数市场 | **0%** | N/A |
| 5分钟/15分钟加密货币市场 | **最高 1.56%** | 20% |
| NCAAB (大学篮球) 市场 | **最高 0.44%** | 25% |
| Serie A (足球) 市场 | **最高 0.44%** | 25% |

### 2.2 费率计算公式
```
fee = C × feeRate × (p × (1 - p))^exponent
```
- C = 交易数量
- p = 代币价格
- **费率在 50% 概率时达到峰值**，向两端递减

### 2.3 关键点
- 费用以 USDC 计价
- 买入时扣份额，卖出时扣 USDC
- **最小计费单位：0.0001 USDC**
- SDK 会自动处理 feeRateBps，需在订单中包含此字段

---

## 三、结算与争议 (Resolution)

### 3.1 结算流程
1. **提议 (Proposal)**：任何人可提议结果，质押 ~$750 USDC.e 债券
2. **挑战期 (Challenge Period)**：2小时内可争议
3. **争议处理**：
   - 无争议 → ~2小时结案
   - 1次争议 → 进入第二轮提议
   - 2次争议 → UMA DVM 投票 (~48小时)

### 3.2 结算时间线
| 阶段 | 时长 |
|-----|------|
| 挑战期 | 2小时 |
| 辩论期 (如有) | 24-48小时 |
| UMA 投票 (如有) | ~48小时 |

**总计**：
- 无争议：~2小时
- 有争议：4-6天

### 3.3 风险点
- **提前提议会丢失全部债券**
- 50-50 平局时，市场按 50/50 结案（每枚代币兑 $0.50）
- 规则可通过 "Additional context" 澄清，但不能改变问题本质

---

## 四、订单类型与生命周期

### 4.1 订单类型

| 类型 | 行为 | 使用场景 |
|-----|------|---------|
| GTC | Good Till Cancelled | 标准限价单 |
| GTD | Good Till Date | 定时失效订单 |
| FOK | Fill Or Kill | 全部成交或取消 |
| FAK | Fill And Kill | 部分成交，剩余取消 |

### 4.2 Post-Only 订单
- 仅挂单，不立即成交
- 如果会立即成交则被拒绝
- 确保永远是 Maker，不付 taker 费

### 4.3 订单状态
- `live` - 挂单中
- `matched` - 立即成交
- `delayed` - 待匹配延迟 (体育市场 3秒)
- `unmatched` - 延迟后未成交

### 4.4 交易状态
- `MATCHED` → `MINED` → `CONFIRMED` (成功)
- `RETRYING` → 最终 `FAILED`

---

## 五、API 速率限制

### 5.1 各 API 端点限制

| API | 基础限制 |
|-----|---------|
| Gamma API | 4,000 req/10s |
| Data API | 1,000 req/10s |
| CLOB API | 9,000 req/10s |
| 下单 (POST /order) | 3,500 req/10s (突发), 36,000 req/10min (持续) |
| 撤单 (DELETE /order) | 3,000 req/10s (突发) |

### 5.2 重要限制
- 订单/交易/通知：900 req/10s
- 公共行情 API：无认证即可用

---

## 六、地理限制 (Geoblock)

### 6.1 完全禁止国家
**美国 (US), 澳大利亚 (AU), 德国 (DE), 法国 (FR), 英国 (GB), 意大利 (IT), 荷兰 (NL), 比利时 (BE), 俄罗斯 (RU), 伊朗 (IR), 朝鲜 (KP), 叙利亚 (SY), 委内瑞拉 (VE)** 等 30+ 国家

### 6.2 仅平仓国家
- **波兰 (PL)** - 可平仓，不可开新仓
- **新加坡 (SG)** - 可平仓，不可开新仓
- **泰国 (TH)** - 可平仓，不可开新仓
- **台湾 (TW)** - 可平仓，不可开新仓

### 6.3 特定区域限制
- 加拿大 Ontario 省
- 乌克兰 Crimea, Donetsk, Luhansk

### 6.4 API 检查
```bash
GET https://polymarket.com/api/geoblock
```

---

## 七、关键风险与坑 (交易/风控必读)

### 7.1 费用相关
1. **大部分市场免手续费**，但加密货币短期市场和部分体育市场有高达 1.56% 的 taker 费
2. **费率在 50% 概率时最高**，两端趋近于 0
3. SDK 会自动处理费用，但自行调用 API 时必须手动包含 `feeRateBps` 字段

### 7.2 结算相关
4. **UMA 投票可能耗时 4-6 天**，期间无法交易
5. **提前提议会损失全部 $750 债券**
6. **50-50 平局结算**：每枚代币只值 $0.50
7. 结算规则中的 "Additional context" 可能影响结果，但不会改变问题本质

### 7.3 订单/交易相关
8. **仅支持限价单**，市价单通过设置即时成交价格实现
9. **Post-Only 订单**如果会立即成交会被拒绝（保护 maker 身份）
10. **体育市场有 3 秒匹配延迟**，可能导致滑点
11. **撤单需在成交前**，部分成交后只能撤未成交部分

### 7.4 地理/合规相关
12. **美国/欧盟等主要市场被封锁**，交易前需检查 geoblock
13. **VPN 用户需注意 IP**，可能被误判为限制地区
14. 需遵守当地法规，Polymarket 不提供法律建议

### 7.5 技术/操作相关
15. **API 速率限制严格**，高频交易需注意 burst/ sustained 限制
16. 链上结算失败 (`FAILED`) 永久无法恢复
17. 订单簿深度可能很差，**滑点可能很大**

---

## 八、信息来源

- [Polymarket Docs](https://docs.polymarket.com/)
- [Fees Documentation](https://docs.polymarket.com/trading/fees.md)
- [Resolution Concepts](https://docs.polymarket.com/concepts/resolution.md)
- [Order Lifecycle](https://docs.polymarket.com/concepts/order-lifecycle.md)
- [Rate Limits](https://docs.polymarket.com/api-reference/rate-limits.md)
- [Geographic Restrictions](https://docs.polymarket.com/api-reference/geoblock.md)
- [Help Center](https://help.polymarket.com/)

---

*Last updated: 2026-02-27*

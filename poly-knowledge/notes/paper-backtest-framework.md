# 纸上回测框架

## 概述

纸上回测（Paper Backtest）是一种无需实际资金投入的策略验证方法，通过历史数据模拟交易决策，评估信号的有效性。本框架用于：

1. **验证信号质量** - 评估每日 TopN 关注组合的稳定性
2. **识别模式** - 发现重复出现的交易机会
3. **优化参数** - 为实盘交易提供参数参考

## 数据来源

- **输入**: `poly-knowledge/outputs/watchlist-YYYY-MM-DD.json`
- **差异**: `poly-knowledge/outputs/watchlist-diff-YYYY-MM-DD.json`
- **输出**: `poly-knowledge/outputs/backtest-weekly-YYYY-MM-DD.md/json`

## 核心指标

### 1. 信号稳定性指标

由于预测市场缺乏历史价格数据，我们使用以下代理指标：

| 指标 | 说明 | 理想值 |
|------|------|--------|
| **一致性得分** | 多天内重复出现在 TopN 的市场比例 | 高 (>30%) |
| **覆盖率** | 每日 TopN 市场的数量 | 稳定 |
| **独立性** | 独立市场数量 / 总信号数 | 适中 |

### 2. 市场质量指标

| 指标 | 说明 |
|------|------|
| **分类分布** | crypto/sports/politics 等类别的占比 |
| **风险分布** | low/medium/high 风险的占比 |
| **流动性统计** | 平均/最大流动性 |
| **评分统计** | 平均市场评分 |

### 3. Top Movers

高频出现在每日 TopN 的市场，表明这些是稳定的信号源。

## 使用方法

### 命令行运行

```bash
# 基础用法（Top10，过去7天）
node scripts/paper-backtest.mjs

# 自定义参数
node scripts/paper-backtest.mjs --topN 5 --days 14
node scripts/paper-backtest.mjs --topN 20 --days 30
```

### 参数说明

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `--topN` | 10 | 每日选取的 TopN 市场数量 |
| `--days` | 7 | 回测的历史天数 |
| `--output` | json | 输出格式 (json/md) |

## 输出示例

### JSON 格式

```json
{
  "generated_at": "2026-02-28T00:31:31.000Z",
  "config": {
    "topN": 10,
    "days": 7,
    "dateRange": {
      "start": "2026-02-27",
      "end": "2026-02-27"
    }
  },
  "summary": {
    "totalDays": 1,
    "totalSignals": 10,
    "uniqueMarkets": 10,
    "avgSignalsPerDay": "10.0",
    "consistencyScore": "0.00%"
  },
  "topMovers": [...]
}
```

### Markdown 格式

每周生成的报告包含：
- 摘要统计
- 每日覆盖情况
- 分类分布
- Top Movers 列表
- 评分和流动性统计
- 风险分布

## 与实盘的关系

### 当前限制

1. **无价格数据** - 无法计算实际收益
2. **无滑点** - 假设成交价格为中间价
3. **无手续费** - 忽略交易成本

### 未来扩展

1. **价格数据集成** - 调用 Polymarket API 获取历史价格
2. **收益模拟** - 计算 close-to-close 收益
3. **信号触发率** - 统计信号产生后的实际走势

## 积分卡

| 指标 | 当前状态 | 目标 |
|------|----------|------|
| 覆盖率 | ✓ 已实现 | - |
| 一致性 | ✓ 已实现 | - |
| Top Movers | ✓ 已实现 | - |
| 收益 Proxy | ⏳ 待开发 | 集成价格数据 |

## 文件结构

```
polymark-task/
├── scripts/
│   └── paper-backtest.mjs       # 回测脚本
├── poly-knowledge/
│   ├── outputs/
│   │   ├── backtest-weekly-YYYY-MM-DD.json
│   │   ├── backtest-weekly-YYYY-MM-DD.md
│   │   └── backtest-weekly-latest.json/md
│   └── notes/
│       └── paper-backtest-framework.md  # 本文档
└── index.md                     # 需更新
```

## 注意事项

1. **数据依赖** - 需要至少1天的 watchlist 数据才能生成报告
2. **时间范围** - 回测天数越多，一致性得分越有意义
3. **仅供研究** - 本框架不构成投资建议

---

*最后更新: 2026-02-28*

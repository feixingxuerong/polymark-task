# Polymarket 研究索引

## 目录

### 基础知识
- [Polymarket API 只读接入](./notes/polymarket-api-readonly.md) - API 文档与示例

### 市场分析
- [天气市场案例分析](./notes/weather-market-examples.md) - 历史案例研究
- [市场指标](./notes/market-metrics.md) - 核心指标定义

### 交易策略
- [资金管理策略](./notes/polymarket-bankroll-management.md) - Kelly Criterion 与仓位分配
- [纸上回测框架](./notes/paper-backtest-framework.md) - 信号稳定性与历史回测

### 数据源
- [Sources](./sources.md) - 外部数据源汇总

---

## 当前目标

**Issue #21**: 实现纸上回测框架

---

## 项目结构

```
polymark-task/
├── index.md              # 本索引
├── sources.md           # 数据源
├── notes/               # 研究笔记
├── poly-knowledge/      # 知识库
└── scripts/             # 自动化脚本
```

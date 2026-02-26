# Polymarket：Negative Risk (Neg Risk) 笔记

来源：Polymarket 官方文档 https://docs.polymarket.com/advanced/neg-risk.md

## Neg Risk 是什么
- 面向“多结果事件（multi-outcome event）且**只会有一个结果胜出**”的资本效率机制。
- 通过 **conversion（转换）** 把各 outcome 的仓位联系起来。

## 核心规则（最重要）
- 在一个 neg risk event 中：
  - **任意一个市场的 1 份 No** 可以转换为 **其他所有市场各 1 份 Yes**。
- 直观理解：
  - “押某个 outcome 不会发生（买它的 No）” ≈ “押其他所有 outcome 会发生（买它们的 Yes）”。

## 如何识别
- Gamma API 的 event / market 字段：`negRisk: true`。
- Augmented neg risk 还会有：`enableNegRisk: true` 且 `negRiskAugmented: true`。

## 下单注意
- 对 neg risk 市场下单时，SDK 下单 options 需要 `negRisk: true`（Python 为 `neg_risk: True`）。

## Augmented Neg Risk（增强型）
- 解决“交易开始后才出现新结果（例如新候选人）”的问题。
- 通过三类 outcome：
  - Named outcomes：已知结果
  - Placeholder outcomes：预留槽位，后续可被“澄清/命名”
  - Explicit Other：兜底项
- 交易规则（文档警告）：
  - **只交易 named outcomes**。
  - Placeholder 未命名前应忽略。
  - “Other” 的定义会随着 placeholder 被分配而变化，避免直接交易。

## 合约
- Neg risk 使用不同合约（Neg Risk Adapter 等），地址见文档的 Contract Addresses。

---
更新：2026-02-26

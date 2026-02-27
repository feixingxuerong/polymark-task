✅ Issue #23 已完成：已建立天气/航空市场的结算口径模板库（resolution templates + 风险清单）。

主汇总：
- `poly-knowledge/issue-23-resolution-template-library.md`

模板库目录：`notes/resolution-templates/`
- `README.md`（索引）
- `temperature-threshold.md`（温度阈值）
- `precipitation-accumulation.md`（降水/积雪累积）
- `hurricane-category.md`（飓风等级/登陆）
- `flight-cancellation.md`（航班取消）
- `airport-disruption.md`（机场 disruption 指数/运行）

每个模板都包含：
- Required fields（结算必需字段）
- Official sources（官方/权威数据源）
- Pitfalls / risk flags（常见争议点）
- Resolution checklist（逐步核验清单）

后续建议：将模板字段与 watchlist 的 risk_annotator / executable card 结合，做到自动提示“缺什么字段就高风险”。

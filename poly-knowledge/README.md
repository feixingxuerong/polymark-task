# Poly 知识库（poly-knowledge/）

目标：为 Polymarket 研究提供**可复用、可追溯、可执行**的知识库，服务于「净盈利 $1000」项目。

## 基本原则

- **中文优先**：知识库内容默认使用中文撰写；引用英文原文时保留链接与关键原句即可。
- **Index-First**：新增知识先更新 `index.md`（目录/状态），再写正文。
- **可回溯**：重要结论必须能追溯到来源（见 `sources.md`）。

## 结构

- `index.md`：知识库索引与章节状态（导航中心）
- `sources.md`：来源清单（URL/用途/可信度/更新频率）
- `notes/`：按主题拆分的详细笔记
- `temp/`：临时草稿（需要定期整理入 notes）
- `outputs/`：自动生成的输出文件（如 watchlist）

## 更新约束（仓库级）

- 本仓库 `poly-knowledge/` 的更新**必须使用中文**（除非是代码/配置字段名、或引用原文）。
- 新增/修改文件时：
  1) 先改 `index.md` 状态
  2) 再补充正文/来源

---

## Watchlist 生成器

### 快速开始

```bash
# 安装依赖（如需要）
cd polymark-task
npm install

# 运行 watchlist 生成
node scripts/generate-watchlist.mjs --limit 50 --min-liquidity 1000
```

### 参数说明

| 参数 | 默认值 | 说明 |
|-----|-------|------|
| `--limit` | 50 | 从 API 获取的市场数量 |
| `--min-liquidity` | 1000 | 最小流动性门槛（USDC） |

### 输出文件

- `outputs/watchlist-YYYY-MM-DD.json` - 完整 JSON 数据
- `outputs/watchlist-YYYY-MM-DD.md` - 可读 Markdown 摘要

### 定时运行（可选）

可通过 GitHub Actions 或系统 cron 定时执行：

```bash
# 每日 UTC 0 点运行
0 0 * * * cd /path/to/polymark-task && node scripts/generate-watchlist.mjs
```

### 指标说明

生成的 watchlist 包含以下核心指标（详见 `notes/market-metrics.md`）：

- **implied_probability**: 隐含概率（来自 last-trade 或 midpoint）
- **spread_pct**: 买卖点差百分比
- **depth_proxy**: 订单簿深度（前 5 档累计）
- **days_to_event**: 距离事件到期天数
- **fee_rate**: 交易费率（如有）

### 评分逻辑

评分基于 `watchlist-scoring.yaml` 的权重配置：

- 流动性 20%
- 点差 15%
- 波动率 15%
- 结算清晰度 15%
- 事件日历 10%
- 对冲性 10%
- 风险等级 15%


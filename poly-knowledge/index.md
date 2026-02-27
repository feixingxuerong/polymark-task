# Poly Knowledge Index

> 知识库索引 - Polymarket 预测市场研究的中心枢纽

## 知识库定位

本知识库服务于 Poly 项目的预测市场研究，目标是在 Polymarket 上实现净盈利 $1000。所有学习成果、策略分析、风控规则都集中管理，避免重复劳动。

**核心原则：Index-First** - 每次新增知识必须先更新索引，保证可追溯性。

**语言约束：中文优先** - `poly-knowledge/` 默认使用中文撰写；引用英文原文时保留链接与关键原句即可。

---

## 知识结构

```
poly-knowledge/
|-- index.md              # 本文件 - 知识索引与导航
|-- sources.md            # 来源清单 - 所有参考资料的URL、可信度、用途
|-- notes/                # 详细笔记（按主题分类）
|   |-- polymarket-fees.md
|   |-- polymarket-neg-risk.md
|   |-- ...
|-- temp/                 # 临时草稿（待整理）
|-- issue-*.md             # 各 GitHub Issue 对应的研究成果
```

---

## 章节/主题

| 章节 | 描述 | 状态 |
|------|------|------|
| **基础概念** | 市场/事件/代币结构、交易机制 | ✅ 已获取 |
| **费率结构** | Gas费、平台费、流动性提供者收益 | ✅ 已获取 |
| **Neg Risk** | 负风险保险机制、AMA | ✅ 已获取 |
| **API 集成** | REST API、WebSocket、SDK使用 | 待补充 |
| **策略研究** | 盈利方法论、案例分析、书籍文献 | 待开始 |
| **风控框架** | 风险矩阵、资金管理、止损规则 | ✅ 已完成 | `risk-and-bankroll.md` |
| **结算争议** | 结算规则、争议处理、极端情况 | ✅ 已完成 | `notes/polymarket-settlement.md` |
| **市场数据** | 热门市场、赔率解读、流动性分析 | ✅ 已完成 | `notes/polymarket-liquidity-analysis.md` |

---

## 更新规则 (Index-First)

1. **新增知识前**：先在 `index.md` 创建条目大纲
2. **获取来源**：先在 `sources.md` 记录来源信息
3. **完成笔记**：写入 `notes/` 目录，更新 index.md 状态
4. **定期同步**：每次会话结束前更新本索引

---

## 命名约定

| 类型 | 命名规则 | 示例 |
|------|----------|------|
| 笔记文件 | `polymarket-{主题}.md` | `polymarket-fees.md` |
| Issue 笔记 | `issue-{编号}-{描述}.md` | `issue-3-docs-dive.md` |
| 来源记录 | 使用 sources.md 模板 | - |
| 目录 | 复数名词 | `notes/`, `temp/` |

---

## 已有关联 Issue

| Issue | 主题 | 状态 | 笔记位置 |
|-------|------|------|----------|
| #1 | Mission Charter + Roadmap | 进行中 | - |
| #2 | Knowledge Base Index (本文档) | ✅ 已完成 | index.md |
| #3 | Polymarket 官方文档 | 进行中 | `notes/polymarket-*.md` |
| #4 | 盈利方法论与案例 | 待开始 | - |
| #5 | 风险框架 + 资金管理 | ✅ 已完成 | `risk-and-bankroll.md` |

| #14 | Polymarket 结算机制 | ✅ 已完成 | `notes/polymarket-settlement.md` |
| #15 | Polymarket 赔率心理学 | ✅ 已完成 | `notes/polymarket-odds-psychology.md` |
| #22 | 数据源适配器: NOAA/NWS + METAR/TAF | ✅ 已完成 | `scripts/weather-adapters/` |
| #23 | 天气/航空结算口径库 | ✅ 已完成 | `notes/weather-aviation-resolution-library.md` |

---

## 建议新增条目

基于当前研究进度，建议按优先级新增：

### 高优先级

- [x] **Polymarket API Reference** - REST/WebSocket 端点详解
- [x] **市场流动性分析** - 如何识别高流动性市场、点差分析、订单簿深度
- [x] **结算机制详解** - 争议处理、延迟结算场景 (Issue #14)
- [x] **赔率心理学** - 价格形成机制、信息反映效率、行为偏差 (Issue #15)

### 中优先级

- [x] **赔率心理学** - 价格形成机制、信息反映效率 (Issue #15)
- [ ] **历史事件复盘** - 重大事件市场的盈亏分析
- [ ] **资金管理策略** - Kelly Criterion、仓位分配

### 低优先级

- [ ] **跨平台比较** - Polymarket vs 其他预测市场
- [ ] **监管合规** - 法律风险、税务考量
- [ ] **自动化交易** - 机器人策略、API 限流

---

## 待获取数据（阻塞项）

- Polymarket 热门市场排名数据
- 历史结算争议案例
- 成功交易者的公开策略分享
- 实时 odds API 流数据

---

## 模板：知识条目

```markdown
### [主题名称]

- **来源**: [sources.md 中的编号或直接链接]
- **摘要**: [1-2句话核心要点]
- **验证状态**: [待验证 / 已验证 / 需要更新]
- **相关Issue**: #[编号]
- **创建时间**: YYYY-MM-DD
```

---

## 模板：更新日志

每次更新知识库时，在文件末尾添加：

```markdown
### YYYY-MM-DD

- [新增/更新] 主题: [描述]
- 来源: [URL]
- 更新人: [署名]
```

### 2026-02-27

- [新增] 市场流动性分析 - 完整的流动性指标体系与API筛选方法
- 来源: Polymarket Docs (API Reference)
- 更新人: Subagent-Poly-Liquidity

### 2026-02-27

- [新增] 赔率心理学 - 价格形成机制、信息反映效率、行为偏差
- 来源: Wikipedia, 预测市场文献, 行为金融学
- 更新人: Subagent-Poly-Odds-Psych

### 2026-02-27

- [新增] Watchlist 可执行清单 - 每日 watchlist 升级为可执行清单
- 改动: 新增 action, entry_plan, key_risks[], monitor_sources[], thesis 字段
- 类别模板: weather/aviation, macro/politics, crypto, sports, entertainment, economy
- 来源: scripts/generate-watchlist.mjs
- 更新人: Subagent-Watchlist-Executable

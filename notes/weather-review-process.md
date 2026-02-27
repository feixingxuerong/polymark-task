# Weather Review Process - 每日复盘流程

> 天气主战场每日复盘产物生成流程

## 概述

本流程定义如何生成每日复盘产物，包括：
- 筛选 action=考虑 的 Top3~5 市场
- 生成复盘字段：checks, falsifiers, todo
- 设置 status=unknown，记录 next_check 时间
- 提供规则迭代建议入口

**核心原则**：
- 只做 paper review（不涉及真实交易）
- 自动生成复盘文件到 poly-knowledge/outputs/
- 优雅降级：缺字段不报错

---

## 一、输入文件

### 1.1 必须输入

| 文件 | 描述 | 优先级 |
|------|------|--------|
| watchlist-YYYY-MM-DD.json | 当日观察列表 | P0 |
| weather-alerts-YYYY-MM-DD.json | 天气警报 | P1 |
| weather-aviation-sources-YYYY-MM-DD.json | 气象/航空数据源 | P2 |

### 1.2 文件优先级

脚本按以下顺序查找输入文件：
1. 当日日期 (YYYY-MM-DD)
2. 昨日日期
3. 最新文件（按文件名排序）

---

## 二、筛选标准

### 2.1 action 字段筛选

筛选条件：`action` 字段包含关键词：

- **主要关键词**：考虑
- **回退关键词**：观察

如果主要关键词没有匹配项，自动使用回退关键词。

### 2.2 Top N 限制

默认取 Top5 市场进行复盘，可在配置中修改：

```javascript
const CONFIG = {
  top_n: 5,  // Top3~5 markets to review
};
```

---

## 三、输出文件

### 3.1 JSON 输出

文件路径：`poly-knowledge/outputs/weather-review-YYYY-MM-DD.json`

字段说明：

| 字段 | 类型 | 描述 |
|------|------|------|
| generated_at | string | 生成时间 |
| review_date | string | 复盘日期 |
| watchlist_file | string | 使用的 watchlist 文件 |
| total_reviewed | number | 复盘市场数量 |
| action_filter | string | 筛选使用的关键词 |
| summary | object | 汇总信息 |
| reviews | array | 市场复盘详情 |

### 3.2 Markdown 输出

文件路径：`poly-knowledge/outputs/weather-review-YYYY-MM-DD.md`

结构：
- 概览表格
- 每个市场的复盘详情
- 说明与脚注

---

## 四、复盘字段说明

### 4.1 原始信息（来自 watchlist）

| 字段 | 描述 |
|------|------|
| thesis | 投资论点 |
| entry_plan | 入场计划 |
| monitor_sources | 监控源列表 |
| key_risks | 关键风险列表 |
| station | 气象站点信息 |
| resolution_parsed | 结算解析结果 |

### 4.2 生成的复盘字段

| 字段 | 描述 |
|------|------|
| status | 状态：unknown / resolved |
| next_check | 下次检查时间 |
| checks | 下一次要核对的点 |
| falsifiers | 证伪条件 |
| todo | 待办/缺口 |

### 4.3 状态说明

- **unknown**：暂时无法确定结果，等待结算
- **resolved**：已结算，等待 resolution_parsed

### 4.4 下次检查时间 (next_check)

根据 endDate 自动估算：

| 时间范围 | 建议检查时间 |
|----------|--------------|
| > 48h | T-24h |
| 24h ~ 48h | T-12h |
| 6h ~ 24h | T-6h |
| < 6h | 即时 |

---

## 五、规则迭代建议

### 5.1 建议类型

| 类型 | 描述 |
|------|------|
| score_adjustment | 评分调整建议 |
| weight_review | 权重复核建议 |
| risk_filter | 风险过滤建议 |

### 5.2 建议格式

```json
{
  "type": "score_adjustment",
  "field": "total_score",
  "current": 4.5,
  "suggestion": "总分偏低，考虑是否筛选标准过于严格"
}
```

### 5.3 使用方式

- 建议仅供参考，不自动修改
- 人工复核后决定是否调整
- 调整后更新评分权重配置文件

---

## 六、使用方法

### 6.1 运行脚本

```bash
cd polymark-task
node scripts/generate-weather-review.mjs
```

### 6.2 定时任务

建议每日固定时间运行（如 UTC 8:00）：

```bash
# crontab 示例
0 8 * * * cd /path/to/polymark-task && node scripts/generate-weather-review.mjs
```

### 6.3 集成到 CI/CD

可集成到 GitHub Actions：

```yaml
name: Daily Weather Review
on:
  schedule:
    - cron: '0 8 * * *'
jobs:
  generate-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Generate review
        run: node scripts/generate-weather-review.mjs
      - name: Commit and push
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add poly-knowledge/outputs/weather-review-*.json poly-knowledge/outputs/weather-review-*.md
          git commit -m "Update weather review" || exit 0
          git push
```

---

## 七、注意事项

1. **不交易**：本流程仅做 paper review，不涉及真实交易
2. **优雅降级**：缺少字段时使用默认值，不报错
3. **时区**：所有时间使用 UTC 或明确标注时区
4. **中文**：输出使用中文（除 URL 等必要英文）

---

## 八、文件结构

```
polymark-task/
├── scripts/
│   └── generate-weather-review.mjs    # 复盘生成脚本
├── poly-knowledge/
│   ├── outputs/
│   │   └── weather-review-YYYY-MM-DD.json
│   │   └── weather-review-YYYY-MM-DD.md
│   └── notes/
│       └── weather-review-process.md  # 本流程文档
└── index.md                           # 需更新索引
```

---

## 九、相关 Issue

- Issue #31: 复盘闭环 - action=考虑 Top3 每日复盘产物

---

*本流程文档由 scripts/generate-weather-review.mjs 自动生成示例后人工整理*

# Issue #31: 复盘闭环 - Daily Review Loop Workflow

> 设计复盘闭环工作流：捕获每日 "action=考虑" Top3 候选，跟踪结果（结算、价格变动、信号），计算信号类型命中率，识别模式漂移，并创建规则/分数调整的迭代循环。

---

## 1. 当前状态分析

### 已有的基础设施

| 组件 | 位置 | 功能 |
|------|------|------|
| `generate-watchlist.mjs` | `scripts/` | 生成每日观察列表 |
| `generate-weather-review.mjs` | `scripts/` | 生成每日复盘（Top3~5） |
| `score-weather-signals.mjs` | `scripts/` | 信号评分 |
| `daily-watchlist.yml` | `.github/workflows/` | 每日自动执行 |

### 当前缺失的闭环能力

1. **结果跟踪** - 缺少结算结果、价格变动的追踪
2. **命中率计算** - 缺少按信号类型统计命中率
3. **模式漂移识别** - 缺少历史模式变化检测
4. **规则迭代入口** - 缺少反馈到评分规则的机制

---

## 2. 增强的数据 Schema

### 2.1 Review Outcome Schema (新增)

```typescript
// poly-knowledge/outputs/review-outcomes.json

{
  "version": "1.0",
  "generated_at": "2026-02-28T12:00:00Z",
  
  // 每日汇总
  "daily_summary": {
    "date": "2026-02-27",
    "total_markets_reviewed": 5,
    "resolved_count": 3,
    "pending_count": 2,
    
    // 命中率统计
    "hit_rate": {
      "overall": 0.67,  // 2/3
      "by_signal_type": {
        "weather_precipitation": 0.80,  // 4/5
        "weather_temperature": 0.75,   // 3/4
        "sports_result": 0.50,         // 2/4
        "crypto_direction": 0.33       // 1/3
      },
      "by_confidence": {
        "high": 0.85,   // 评分 >= 8
        "medium": 0.60, // 评分 5-7
        "low": 0.33     // 评分 < 5
      }
    },
    
    // 盈亏统计 (paper trading)
    "pnl": {
      "total": 45.50,  // USD
      "winners": 2,
      "losers": 1,
      "by_signal_type": {
        "weather_precipitation": 30.00,
        "weather_temperature": 15.50,
        "sports_result": 0.00,
        "crypto_direction": -10.00
      }
    }
  },
  
  // 市场详情
  "outcomes": [
    {
      "market_id": "1378487",
      "slug": "fr2-lav-asn-2026-02-27-total-3pt5",
      "question": "Stade Lavallois Mayenne FC vs. AS Nancy-Lorraine: O/U 3.5",
      "category": "sports",
      
      // 信号信息 (来自评分阶段)
      "signal": {
        "type": "sports_result",
        "direction": "over",      // over / under / yes / no
        "confidence": 7,           // 1-10
        "thesis_summary": "主队进攻火力强劲",
        "key_indicators": [
          "主队近5场场均进球2.4",
          "客队防守排名第15"
        ]
      },
      
      // 入场记录 (paper trading)
      "entry": {
        "date": "2026-02-27",
        "odds": 0.55,
        "size_usd": 100,
        "entry_price_yes": 0.55,
        "entry_price_no": 0.45
      },
      
      // 结果追踪
      "outcome": {
        "status": "resolved",      // resolved / pending / cancelled
        "resolved_at": "2026-02-27T21:30:00Z",
        "result": "under",         // 实际结果
        "won": true,
        
        // 价格变动
        "price_movement": {
          "entry_odds": 0.55,
          "final_odds": 0.35,
          "max_odds": 0.60,
          "min_odds": 0.30,
          "change_pct": -36.4  // (0.35-0.55)/0.55
        },
        
        // 结算结果
        "resolution": {
          "source": "official_score",
          "actual_score": "1-1",  // 总进球2，小于3.5
          "settled_as": "under",
          "disputed": false
        }
      },
      
      // 复盘分析
      "review": {
        "signal_correct": true,
        "why_correct": "分析逻辑正确：客队防守确实稳固",
        "missed_signals": [],
        "unexpected_factors": ["红牌导致进攻受阻"],
        "lesson": "需关注球队比赛状态变化"
      },
      
      // 规则迭代建议
      "rule_feedback": {
        "adjustments": [
          {
            "type": "weight_increase",
            "field": "home_attack_strength",
            "current_weight": 0.15,
            "suggested_weight": 0.20,
            "reason": "该因子在近期命中率高于预期"
          },
          {
            "type": "new_factor",
            "suggestion": "加入比赛状态因子（近3场得失球）",
            "reason": "当前模型未考虑球队近期状态"
          }
        ]
      }
    }
  ],
  
  // 模式漂移检测
  "pattern_drift": {
    "detected": true,
    "drifts": [
      {
        "signal_type": "crypto_direction",
        "metric": "hit_rate",
        "previous_period": "2026-02-20 to 2026-02-26",
        "previous_value": 0.55,
        "current_value": 0.33,
        "change_pct": -40.0,
        "severity": "high",
        "possible_causes": [
          "近期市场受SEC审批消息影响较大",
          "巨鲸操作频率增加"
        ],
        "recommendation": "降低crypto_signal权重或暂停该类型信号"
      },
      {
        "signal_type": "weather_precipitation",
        "metric": "false_positive_rate",
        "previous_period": "2026-02-20 to 2026-02-26",
        "previous_value": 0.15,
        "current_value": 0.25,
        "change_pct": 66.7,
        "severity": "medium",
        "possible_causes": [
          "NOAA预报模型更新导致误差增加",
          "季节性气候异常"
        ],
        "recommendation": "复核气象站点数据源的时效性"
      }
    ]
  },
  
  // 规则调整建议汇总
  "rule_iteration_summary": {
    "pending_changes": 3,
    "approved_changes": 0,
    "changes": [
      {
        "id": "adj-001",
        "type": "weight_adjustment",
        "field": "crypto_volume_weight",
        "current": 0.20,
        "suggested": 0.10,
        "reason": "crypto方向信号命中率下降40%",
        "status": "pending_review"
      }
    ]
  }
}
```

### 2.2 修改现有 Review Schema

在 `generate-weather-review.mjs` 的输出中增加字段：

```typescript
// 现有结构 + 新增字段

{
  // ... 现有字段 ...
  
  // 新增: 信号信息
  "signal_info": {
    "type": "weather_precipitation",  // 信号类型
    "direction": "yes",              // yes/no/over/under
    "confidence": 8,                  // 1-10
    "key_factors": ["降水概率>70%", "气象模型一致"]
  },
  
  // 新增: 入场记录 (paper trading)
  "entry_record": {
    "date": "2026-02-27",
    "odds": 0.72,
    "size_usd": 100,
    "paper_trade": true,
    "entry_price_yes": 0.72,
    "entry_price_no": 0.28
  },
  
  // 新增: 追踪字段
  "tracking": {
    "status": "pending",  // pending / resolved / cancelled
    "resolved_at": null,
    "actual_result": null,
    "won": null,
    "final_odds": null,
    "pnl": null
  }
}
```

---

## 3. 新增脚本计划

### 3.1 `generate-review-loop.mjs` - 复盘闭环主脚本

**位置**: `scripts/generate-review-loop.mjs`

**功能**:
1. 加载历史 review 数据
2. 加载结算结果 (resolution)
3. 计算命中率统计
4. 检测模式漂移
5. 生成规则迭代建议

```javascript
// 伪代码结构

import { loadHistoricalReviews } from './lib/reviews.mjs';
import { fetchResolutions } from './lib/polymarket-api.mjs';
import { computeHitRates } from './lib/statistics.mjs';
import { detectPatternDrift } from './lib/drift-detection.mjs';
import { generateRuleSuggestions } from './lib/rule-iteration.mjs';

async function main() {
  // 1. 加载过去N天的review数据
  const historicalReviews = await loadHistoricalReviews({ days: 7 });
  
  // 2. 获取结算结果
  const resolutions = await fetchResolutions(historicalReviews.map(r => r.market_id));
  
  // 3. 匹配结果与信号
  const matchedOutcomes = matchOutcomesWithSignals(historicalReviews, resolutions);
  
  // 4. 计算命中率
  const hitRates = computeHitRates(matchedOutcomes);
  
  // 5. 检测模式漂移
  const patternDrifts = detectPatternDrift(hitRates, { windowDays: 7, threshold: 0.2 });
  
  // 6. 生成规则迭代建议
  const ruleSuggestions = generateRuleSuggestions(patternDrifts, hitRates);
  
  // 7. 输出结果
  await writeOutput({
    daily_summary: hitRates,
    outcomes: matchedOutcomes,
    pattern_drift: patternDrifts,
    rule_iteration_summary: ruleSuggestions
  });
}
```

### 3.2 `lib/statistics.mjs` - 统计计算模块

```javascript
// 计算命中率

export function computeHitRates(outcomes) {
  const byType = {};      // 按信号类型
  const byConfidence = {}; // 按置信度
  
  // 按信号类型分组
  for (const outcome of outcomes) {
    const type = outcome.signal.type;
    if (!byType[type]) {
      byType[type] = { total: 0, hits: 0, pnl: 0 };
    }
    byType[type].total++;
    if (outcome.outcome.won) {
      byType[type].hits++;
      byType[type].pnl += outcome.outcome.pnl;
    } else {
      byType[type].pnl -= outcome.entry.size_usd;
    }
  }
  
  // 计算命中率
  for (const type in byType) {
    byType[type].hit_rate = byType[type].hits / byType[type].total;
  }
  
  return {
    overall: /* ... */,
    by_signal_type: byType,
    by_confidence: byConfidence
  };
}
```

### 3.3 `lib/drift-detection.mjs` - 模式漂移检测

```javascript
// 检测模式漂移

export function detectPatternDrift(hitRates, { windowDays = 7, threshold = 0.2 }) {
  const previousPeriod = loadPreviousPeriod(windowDays * 2); // 前两周
  const currentPeriod = loadCurrentPeriod(windowDays);        // 本周
  
  const drifts = [];
  
  for (const signalType of Object.keys(hitRates.by_signal_type)) {
    const prevRate = previousPeriod[signalType]?.hit_rate || 0.5;
    const currRate = currentPeriod[signalType]?.hit_rate || 0.5;
    
    const changePct = (currRate - prevRate) / prevRate;
    
    if (Math.abs(changePct) > threshold) {
      drifts.push({
        signal_type: signalType,
        metric: 'hit_rate',
        previous_value: prevRate,
        current_value: currRate,
        change_pct: changePct * 100,
        severity: Math.abs(changePct) > 0.4 ? 'high' : 'medium'
      });
    }
  }
  
  return { detected: drifts.length > 0, drifts };
}
```

---

## 4. 规则迭代工作流

### 4.1 迭代流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                    Daily Review Loop                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Generate    │    │ Fetch        │    │ Compute      │      │
│  │ Watchlist   │───▶│ Resolutions  │───▶│ Hit Rates    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                  │              │
│                                                  ▼              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │ Update       │◀───│ Detect       │◀───│ Generate     │      │
│  │ Scoring      │    │ Pattern      │    │ Rule         │      │
│  │ Config       │    │ Drifts       │    │ Suggestions  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 配置文件更新机制

**配置文件**: `poly-knowledge/config/scoring-weights.yaml`

```yaml
# 动态评分权重 (由脚本自动更新)

scoring_weights:
  liquidity: 0.20
  volatility: 0.15
  confidence: 0.25
  sentiment: 0.20
  weather_model_agreement: 0.20

# 信号类型权重 (基于命中率动态调整)
signal_type_weights:
  weather_precipitation: 0.80  # 高命中率 -> 高权重
  weather_temperature: 0.75
  sports_result: 0.50
  crypto_direction: 0.30       # 低命中率 -> 低权重

# 置信度阈值
confidence_thresholds:
  high: 8
  medium: 5
  low: 0

# 模式漂移响应
drift_response:
  severity_high:
    action: "disable_signal"
    cooldown_days: 7
  severity_medium:
    action: "reduce_weight"
    reduction_pct: 0.25
  severity_low:
    action: "monitor"
    alert_only: true
```

### 4.3 GitHub Issue 自动创建

当检测到高严重性模式漂移时，自动创建 Issue:

```javascript
// 自动创建 Issue

import { execSync } from 'child_process';

async function createDriftIssue(drift) {
  const title = `[Drift] ${drift.signal_type} 模式漂移 ${drift.change_pct.toFixed(1)}%`;
  const body = `
## 检测到模式漂移

- **信号类型**: ${drift.signal_type}
- **变化率**: ${drift.change_pct.toFixed(1)}%
- **严重性**: ${drift.severity}
- **前期命中率**: ${(drift.previous_value * 100).toFixed(1)}%
- **当前命中率**: ${(drift.current_value * 100).toFixed(1)}%

## 可能原因

${drift.possible_causes.map(c => `- ${c}`).join('\n')}

## 建议行动

${drift.recommendation}

---
*由 review-loop 脚本自动生成*
  `;
  
  execSync(`gh issue create --title "${title}" --body "${body}" --label "drift,auto-generated"`);
}
```

---

## 5. 每日运行流程

### 5.1 GitHub Actions Workflow 更新

```yaml
# .github/workflows/daily-review-loop.yml

name: Daily Review Loop

on:
  schedule:
    - cron: '0 8 * * *'  # 每日 8:00 UTC 执行
  workflow_dispatch:

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      # Step 1: Generate daily watchlist (existing)
      - name: Generate Watchlist
        run: node scripts/generate-watchlist.mjs
      
      # Step 2: Generate review (existing)
      - name: Generate Review
        run: node scripts/generate-weather-review.mjs
      
      # Step 3: NEW - Compute hit rates and detect drifts
      - name: Compute Review Loop
        run: node scripts/generate-review-loop.mjs
        env:
          POLYMARKET_API_KEY: ${{ secrets.POLYMARKET_API_KEY }}
      
      # Step 4: Check for high severity drifts
      - name: Check Pattern Drifts
        id: drift-check
        run: |
          # 检查是否有高严重性漂移
          node scripts/check-drift-severity.mjs
          echo "has_high_severity=$(cat .drift-severity)" >> $GITHUB_OUTPUT
      
      # Step 5: Create issue if needed
      - name: Create Drift Issue
        if: steps.drift-check.outputs.has_high_severity == 'true'
        run: |
          node scripts/create-drift-issue.mjs
      
      # Step 6: Commit and push changes
      - name: Commit Changes
        run: |
          git config --local user.email "poly-agent@openclaw.local"
          git config --local user.name "Poly Agent"
          git add -A
          git diff --staged --quiet || git commit -m "Update review loop outputs"
          git push
```

### 5.2 本地开发测试

```bash
# 手动运行

# 1. 生成观察列表
node scripts/generate-watchlist.mjs

# 2. 生成复盘
node scripts/generate-weather-review.mjs

# 3. 运行复盘闭环 (新增)
node scripts/generate-review-loop.mjs

# 4. 检查漂移
node scripts/check-drift-severity.mjs
```

---

## 6. 文件清单

### 6.1 新增文件

| 文件 | 描述 |
|------|------|
| `scripts/generate-review-loop.mjs` | 复盘闭环主脚本 |
| `scripts/lib/statistics.mjs` | 命中率计算模块 |
| `scripts/lib/drift-detection.mjs` | 模式漂移检测模块 |
| `scripts/lib/polymarket-api.mjs` | Polymarket API 集成 |
| `scripts/check-drift-severity.mjs` | 漂移严重性检查 |
| `scripts/create-drift-issue.mjs` | 自动创建 Issue |
| `poly-knowledge/config/scoring-weights.yaml` | 动态评分配置 |

### 6.2 修改文件

| 文件 | 修改内容 |
|------|------|
| `scripts/generate-weather-review.mjs` | 增加 signal_info, entry_record, tracking 字段 |
| `.github/workflows/daily-watchlist.yml` | 添加 review-loop 步骤 |
| `poly-knowledge/index.md` | 更新索引，添加新知识条目 |

---

## 7. 输出文件

### 7.1 JSON 输出

```
poly-knowledge/outputs/
  |-- review-loop-2026-02-27.json    # 每日复盘闭环结果
  |-- review-loop-latest.json         # 最新 (symlink)
  |-- review-outcomes-2026-02-27.json # 历史结果存档
```

### 7.2 Markdown 输出

```markdown
# Review Loop - 2026-02-27

## 命中率统计

| 信号类型 | 命中率 | 交易数 | P&L |
|----------|--------|--------|-----|
| weather_precipitation | 80% | 5 | +$30 |
| weather_temperature | 75% | 4 | +$15.50 |
| sports_result | 50% | 4 | $0 |
| crypto_direction | 33% | 3 | -$10 |

## 模式漂移检测

⚠️ **高严重性**: crypto_direction 命中率下降 40%

## 规则迭代建议

1. 降低 crypto_direction 权重 20% → 10%
2. 增加 weather_precipitation 权重
3. 暂停 crypto 信号 7 天

## 操作建议

- [ ] 确认规则调整
- [ ] 更新 scoring-weights.yaml
- [ ] 复查高置信度但失败的市场
```

---

## 8. 下一步行动

- [ ] 确认 Schema 设计
- [ ] 实现 `generate-review-loop.mjs` 
- [ ] 实现 `lib/statistics.mjs`
- [ ] 实现 `lib/drift-detection.mjs`
- [ ] 更新 `generate-weather-review.mjs` 增加字段
- [ ] 创建 GitHub Actions workflow
- [ ] 测试完整流程

---

*本文档由 Subagent-Poly-Research 生成*
*Issue #31 - Review Loop Workflow Design*

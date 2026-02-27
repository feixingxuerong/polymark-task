## 已完成 ✅

实现内容：

### 1. 新增脚本 `scripts/score-weather-signals.mjs`
- 读取最新的 `weather-aviation-sources-*.json` + watchlist
- 输出每个 market 的 `weather_signal_score` (0-10)
- 输出 JSON + Markdown 两种格式

### 2. 评分组件 (Components)

| 组件 | 权重 | 说明 |
|------|------|------|
| **recency** | 30% | 数据时效性（观测时间距现在的小时数） |
| **model_agreement** | 30% | 多站点温度一致性 (stdDev proxy) |
| **volatility** | 20% | 预报多样性/稳定性 (站点间差异 proxy) |
| **data_gap_risk** | 20% | 缺测/字段缺失惩罚 |

### 3. 输出示例

```json
{
  "weather_signal_score": 7.8,
  "weather_signal_components": {
    "recency": { "score": 9.9, "value_hours": 0.1 },
    "model_agreement": { "score": 5.0 },
    "volatility": { "score": 6.4 },
    "data_gap_risk": { "score": 10.0 }
  }
}
```

### 4. 文档
- `notes/weather-signal-scoring.md` - 评分方法说明与局限性

### 5. 验证
```
node scripts/score-weather-signals.mjs
# 输出: weather-watchlist-2026-02-28-scored.json + .md
# 平均得分: 7.7/10, 高置信度: 10个
```

后续迭代：
- [ ] 接入 GFS/ECMWF 多模型预报
- [ ] 增加历史数据对比
- [ ] 支持自定义权重

#!/usr/bin/env node

/**
 * Weather Signal Scoring Script
 * 
 * 对天气市场 watchlist 进行信号评分
 * 输出 weather_signal_score (0-10) 及各 components
 * 
 * Components:
 * - recency: 数据更新时间距离现在（越新越高）
 * - model_agreement: 多站点/多模型一致性
 * - volatility: 预测变化幅度（站点多样性 proxy）
 * - data_gap_risk: 缺测/解析失败/字段缺失惩罚
 * 
 * Usage: node score-weather-signals.mjs [--date YYYY-MM-DD]
 * 
 * Output:
 *   - poly-knowledge/outputs/weather-watchlist-{date}-scored.json
 *   - poly-knowledge/outputs/weather-watchlist-{date}-scored.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// Configuration
// ============================================================

const CONFIG = {
  OUTPUT_DIR: path.join(__dirname, '..', 'poly-knowledge', 'outputs'),
  
  // 评分权重（可调整）
  WEIGHTS: {
    recency: 0.30,           // 数据时效性
    model_agreement: 0.30,    // 多站点一致性
    volatility: 0.20,        // 预测稳定性
    data_gap_risk: 0.20      // 数据质量
  },
  
  // Recency 评分配置（小时）
  RECENCY_THRESHOLDS: {
    max: 24,                 // 超过24小时不计分
    optimal: 1,              // 1小时内满分
  },
  
  // Data Gap Risk 扣分配置
  DATA_GAP_PENALTIES: {
    missing_station: -2,    // 站点缺失
    missing_observation: -1, // 观测数据缺失
    missing_forecast: -1,   // 预报数据缺失
    parse_error: -1.5,      // 解析失败
  }
};

// ============================================================
// Utility Functions
// ============================================================

function getTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getLatestWeatherSourcesFile(date) {
  const files = fs.readdirSync(CONFIG.OUTPUT_DIR)
    .filter(f => f.startsWith('weather-aviation-sources-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    throw new Error('No weather-aviation-sources file found');
  }
  
  return path.join(CONFIG.OUTPUT_DIR, files[0]);
}

function getWatchlistFile(date) {
  // 尝试找 weather-watchlist 文件
  const patterns = [
    `weather-watchlist-${date}-final.json`,
    `weather-watchlist-${date}.json`,
    `weather-watchlist-${date.replace(/-\d{2}$/, '')}-final.json`, // 尝试月末
  ];
  
  for (const pattern of patterns) {
    const filePath = path.join(CONFIG.OUTPUT_DIR, pattern);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  
  // 如果没有找到，回退到最新的 weather-watchlist
  const files = fs.readdirSync(CONFIG.OUTPUT_DIR)
    .filter(f => f.startsWith('weather-watchlist-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    throw new Error('No watchlist file found');
  }
  
  return path.join(CONFIG.OUTPUT_DIR, files[0]);
}

// ============================================================
// Scoring Functions
// ============================================================

/**
 * 计算数据时效性得分
 * @param {Date} observationTime - 观测时间
 * @param {Date} now - 当前时间
 * @returns {number} 0-10 分
 */
function calculateRecencyScore(observationTime, now) {
  const hoursDiff = (now - observationTime) / (1000 * 60 * 60);
  
  if (hoursDiff <= CONFIG.RECENCY_THRESHOLDS.optimal) {
    return 10;
  }
  
  if (hoursDiff >= CONFIG.RECENCY_THRESHOLDS.max) {
    return 0;
  }
  
  // 线性插值
  const score = 10 * (1 - (hoursDiff - CONFIG.RECENCY_THRESHOLDS.optimal) / 
    (CONFIG.RECENCY_THRESHOLDS.max - CONFIG.RECENCY_THRESHOLDS.optimal));
  
  return Math.round(score * 10) / 10;
}

/**
 * 计算站点一致性得分
 * 衡量多个站点之间预测/观测数据的一致性
 * @param {Array} stations - 站点数据数组
 * @returns {number} 0-10 分
 */
function calculateModelAgreementScore(stations) {
  if (!stations || stations.length < 2) {
    return 5; // 单一站点给中等分
  }
  
  // 提取关键气象变量
  const temps = [];
  const conditions = [];
  
  for (const stationData of stations) {
    const obs = stationData.observations?.[0];
    if (obs?.temperature?.value_f) {
      temps.push(obs.temperature.value_f);
    }
    if (obs?.textDescription) {
      conditions.push(obs.textDescription);
    }
  }
  
  if (temps.length < 2) {
    return 5;
  }
  
  // 计算温度标准差
  const mean = temps.reduce((a, b) => a + b, 0) / temps.length;
  const variance = temps.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / temps.length;
  const stdDev = Math.sqrt(variance);
  
  // 标准差越小，一致性越高
  // 温差5度以内算高一致性
  let score;
  if (stdDev <= 2) {
    score = 10;
  } else if (stdDev >= 15) {
    score = 0;
  } else {
    score = 10 * (1 - (stdDev - 2) / 13);
  }
  
  return Math.round(score * 10) / 10;
}

/**
 * 计算预测波动性得分
 * 使用站点间多样性作为 proxy
 * @param {Array} stations - 站点数据
 * @returns {number} 0-10 分
 */
function calculateVolatilityScore(stations) {
  if (!stations || stations.length < 2) {
    return 5; // 单一站点给中等分
  }
  
  // 统计站点间预报的多样性
  const forecasts = [];
  for (const stationData of stations) {
    const fc = stationData.forecast;
    if (fc && fc.length > 0) {
      forecasts.push(...fc.slice(0, 6).map(f => f.shortForecast));
    }
  }
  
  if (forecasts.length === 0) {
    return 5;
  }
  
  // 计算预报类型的唯一值比例
  const unique = new Set(forecasts).size;
  const diversity = unique / forecasts.length;
  
  // 多样性高说明预测不稳定 -> 低分
  // 多样性低说明预测一致 -> 高分
  let score;
  if (diversity <= 0.2) {
    score = 10;
  } else if (diversity >= 0.8) {
    score = 0;
  } else {
    score = 10 * (1 - (diversity - 0.2) / 0.6);
  }
  
  return Math.round(score * 10) / 10;
}

/**
 * 计算数据缺失风险得分
 * @param {Object} stationData - 站点数据
 * @param {string} stationId - 站点ID
 * @returns {number} 0-10 分
 */
function calculateDataGapRiskScore(stationData, stationId) {
  let penalty = 0;
  
  if (!stationData) {
    penalty += CONFIG.DATA_GAP_PENALTIES.missing_station;
    return Math.max(0, 10 + penalty);
  }
  
  // 检查观测数据
  if (!stationData.observations || stationData.observations.length === 0) {
    penalty += CONFIG.DATA_GAP_PENALTIES.missing_observation;
  }
  
  // 检查预报数据
  if (!stationData.forecast || stationData.forecast.length === 0) {
    penalty += CONFIG.DATA_GAP_PENALTIES.missing_forecast;
  }
  
  // 检查关键字段
  const obs = stationData.observations?.[0];
  if (obs) {
    if (!obs.temperature || obs.temperature.value_f === undefined) {
      penalty += 0.5;
    }
    if (!obs.precipitation) {
      penalty += 0.5;
    }
  }
  
  return Math.max(0, Math.min(10, Math.round((10 + penalty) * 10) / 10));
}

/**
 * 查找匹配的站点数据
 * @param {Object} sourcesData - 天气源数据
 * @param {string} stationId - 站点ID
 * @returns {Object|null}
 */
function findMatchingStation(sourcesData, stationId) {
  const weatherStations = sourcesData?.data?.weather?.stations || [];
  
  // 直接匹配
  for (const s of weatherStations) {
    if (s.station?.id === stationId) {
      return s;
    }
  }
  
  // 模糊匹配（城市名）
  const station = stationId.toUpperCase();
  const cityMatch = station.replace(/[A-Z]{2}$/, ''); // 去掉国家代码
  
  for (const s of weatherStations) {
    const sId = s.station?.id || '';
    if (sId.includes(cityMatch) || sId.startsWith(station.substring(0, 2))) {
      return s;
    }
  }
  
  return null;
}

// ============================================================
// Main Scoring Function
// ============================================================

function scoreWatchlist(watchlistData, sourcesData, now) {
  const scoredMarkets = [];
  
  for (const market of watchlistData.markets || []) {
    const stationId = market.station?.id;
    
    // 查找匹配的站点数据
    const stationData = stationId ? findMatchingStation(sourcesData, stationId) : null;
    
    // 获取观测时间
    let observationTime = now;
    if (stationData?.observations?.[0]?.observationTime) {
      observationTime = new Date(stationData.observations[0].observationTime);
    }
    
    // 计算各 component 得分
    const recency = calculateRecencyScore(observationTime, now);
    
    // 多站点一致性
    const allStations = sourcesData?.data?.weather?.stations || [];
    const modelAgreement = calculateModelAgreementScore(allStations);
    
    // 预测波动性
    const volatility = calculateVolatilityScore(allStations);
    
    // 数据缺失风险
    const dataGapRisk = calculateDataGapRiskScore(stationData, stationId);
    
    // 计算总分
    const totalScore = 
      recency * CONFIG.WEIGHTS.recency +
      modelAgreement * CONFIG.WEIGHTS.model_agreement +
      volatility * CONFIG.WEIGHTS.volatility +
      dataGapRisk * CONFIG.WEIGHTS.data_gap_risk;
    
    const weatherSignalScore = Math.round(totalScore * 10) / 10;
    
    // 构建评分结果
    const scoredMarket = {
      ...market,
      weather_signal_score: weatherSignalScore,
      weather_signal_components: {
        recency: {
          score: recency,
          value_hours: Math.round((now - observationTime) / (1000 * 60 * 60) * 10) / 10,
          note: '数据更新距现在的小时数'
        },
        model_agreement: {
          score: modelAgreement,
          note: '多站点温度一致性 (stdDev proxy)'
        },
        volatility: {
          score: volatility,
          note: '预报多样性 (站点间差异 proxy)'
        },
        data_gap_risk: {
          score: dataGapRisk,
          note: '缺测/字段缺失惩罚'
        }
      }
    };
    
    if (stationData) {
      scoredMarket.weather_signal_components.data_source = {
        station_id: stationData.station?.id,
        station_name: stationData.station?.name,
        observations_count: stationData.observations?.length || 0,
        forecast_count: stationData.forecast?.length || 0
      };
    }
    
    scoredMarkets.push(scoredMarket);
  }
  
  // 按得分排序
  scoredMarkets.sort((a, b) => b.weather_signal_score - a.weather_signal_score);
  
  return {
    generated_at: new Date().toISOString(),
    scoring_version: '1.0.0',
    weights_used: CONFIG.WEIGHTS,
    sources_file: path.basename(getLatestWeatherSourcesFile()),
    markets: scoredMarkets,
    summary: {
      total_markets: scoredMarkets.length,
      avg_score: Math.round(scoredMarkets.reduce((sum, m) => sum + m.weather_signal_score, 0) / scoredMarkets.length * 10) / 10,
      high_confidence_count: scoredMarkets.filter(m => m.weather_signal_score >= 7).length,
      low_confidence_count: scoredMarkets.filter(m => m.weather_signal_score < 4).length
    }
  };
}

// ============================================================
// Output Functions
// ============================================================

function saveResults(scoredData, date) {
  // JSON 输出
  const jsonPath = path.join(CONFIG.OUTPUT_DIR, `weather-watchlist-${date}-scored.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(scoredData, null, 2), 'utf-8');
  console.log(`✓ Saved: ${jsonPath}`);
  
  // Markdown 输出
  const mdContent = generateMarkdown(scoredData, date);
  const mdPath = path.join(CONFIG.OUTPUT_DIR, `weather-watchlist-${date}-scored.md`);
  fs.writeFileSync(mdPath, mdContent, 'utf-8');
  console.log(`✓ Saved: ${mdPath}`);
}

function generateMarkdown(data, date) {
  let md = `# Weather Watchlist 评分结果 (${date})\n\n`;
  md += `生成时间: ${data.generated_at}\n`;
  md += `评分版本: ${data.scoring_version}\n\n`;
  
  md += `## 评分权重\n\n`;
  for (const [key, value] of Object.entries(data.weights_used)) {
    md += `- **${key}**: ${(value * 100).toFixed(0)}%\n`;
  }
  md += '\n';
  
  md += `## 汇总统计\n\n`;
  md += `- 市场总数: ${data.summary.total_markets}\n`;
  md += `- 平均得分: ${data.summary.avg_score}/10\n`;
  md += `- 高置信度 (≥7分): ${data.summary.high_confidence_count}\n`;
  md += `- 低置信度 (<4分): ${data.summary.low_confidence_count}\n\n`;
  
  md += `## 评分详情\n\n`;
  md += `| 市场 | 站点 | 总分 | 时效性 | 一致性 | 稳定性 | 数据质量 |\n`;
  md += `| ---- | ---- | ---- | ------ | ------ | ------ | -------- |\n`;
  
  for (const market of data.markets) {
    const comp = market.weather_signal_components;
    md += `| ${market.question.substring(0, 30)}... `;
    md += `| ${market.station?.id || 'N/A'} `;
    md += `| **${market.weather_signal_score}** `;
    md += `| ${comp.recency.score} `;
    md += `| ${comp.model_agreement.score} `;
    md += `| ${comp.volatility.score} `;
    md += `| ${comp.data_gap_risk.score} |\n`;
  }
  
  md += `\n---\n*数据源: ${data.sources_file}*\n`;
  
  return md;
}

// ============================================================
// Main Entry Point
// ============================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Weather Signal Scoring');
  console.log('='.repeat(60));
  
  // 解析命令行参数
  const args = process.argv.slice(2);
  let date = getTimestamp();
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--date' && args[i + 1]) {
      date = args[i + 1];
    }
  }
  
  console.log(`Date: ${date}`);
  console.log('');
  
  // 确保输出目录存在
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  }
  
  // 读取天气源数据
  console.log('[1/2] Loading weather sources...');
  const sourcesPath = getLatestWeatherSourcesFile(date);
  const sourcesData = JSON.parse(fs.readFileSync(sourcesPath, 'utf-8'));
  console.log(`  Source: ${path.basename(sourcesPath)}`);
  
  // 读取 watchlist
  console.log('[2/2] Loading watchlist...');
  const watchlistPath = getWatchlistFile(date);
  const watchlistData = JSON.parse(fs.readFileSync(watchlistPath, 'utf-8'));
  console.log(`  Source: ${path.basename(watchlistPath)}`);
  console.log(`  Markets: ${watchlistData.markets?.length || 0}`);
  
  // 计算评分
  console.log('\n[Scoring] Calculating weather signal scores...');
  const now = new Date();
  const scoredData = scoreWatchlist(watchlistData, sourcesData, now);
  
  // 保存结果
  console.log('\n[Saving] Writing results...');
  saveResults(scoredData, date);
  
  // 打印摘要
  console.log('\n' + '='.repeat(60));
  console.log('Summary');
  console.log('='.repeat(60));
  console.log(`Total markets: ${scoredData.summary.total_markets}`);
  console.log(`Average score: ${scoredData.summary.avg_score}/10`);
  console.log(`High confidence: ${scoredData.summary.high_confidence_count}`);
  console.log(`Low confidence: ${scoredData.summary.low_confidence_count}`);
  console.log('');
  
  // 打印前5名
  console.log('Top 5:');
  for (let i = 0; i < Math.min(5, scoredData.markets.length); i++) {
    const m = scoredData.markets[i];
    console.log(`  ${i + 1}. [${m.weather_signal_score}] ${m.question.substring(0, 50)}...`);
  }
  
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

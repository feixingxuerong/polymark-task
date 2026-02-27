/**
 * paper-backtest.mjs - 纸上回测框架
 * 
 * 功能：
 * - 读取历史 watchlist 数据
 * - 选取每日 TopN 作为"关注组合"
 * - 计算信号稳定性指标（覆盖率/一致性/触发率）
 * - 生成周报/月报
 * 
 * 使用方法：
 *   node scripts/paper-backtest.mjs [--topN 10] [--days 7] [--output json|md]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'poly-knowledge', 'outputs');
const NOTES_DIR = path.join(__dirname, '..', 'poly-knowledge', 'notes');

// 默认配置
const DEFAULT_TOP_N = 10;
const DEFAULT_DAYS = 7;

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    topN: DEFAULT_TOP_N,
    days: DEFAULT_DAYS,
    output: 'json'
  };
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--topN' && args[i + 1]) {
      config.topN = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--days' && args[i + 1]) {
      config.days = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      config.output = args[i + 1];
      i++;
    }
  }
  
  return config;
}

// 获取日期范围内的 watchlist 文件
function getWatchlistFiles(days) {
  const files = [];
  const now = new Date();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const fileName = `watchlist-${dateStr}.json`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    
    if (fs.existsSync(filePath)) {
      files.push({
        date: dateStr,
        path: filePath
      });
    }
  }
  
  return files.reverse(); // 从最早到最新
}

// 读取 watchlist 文件
function readWatchlistFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`读取文件失败: ${filePath}`, error.message);
    return null;
  }
}

// 提取 TopN 市场
function extractTopN(watchlist, topN) {
  if (!watchlist || !watchlist.watchlist) {
    return [];
  }
  return watchlist.watchlist.slice(0, topN).map(m => ({
    market_id: m.market_id,
    slug: m.slug,
    question: m.question,
    category: m.category,
    liquidity: m.liquidity,
    risk: m.risk,
    action: m.action,
    scores: m.scores
  }));
}

// 计算信号稳定性指标
function calculateSignalStability(dailyTopN) {
  const result = {
    totalSignals: 0,
    uniqueMarkets: new Set(),
    categoryDistribution: {},
    riskDistribution: {},
    actionDistribution: {},
    liquidityStats: {
      sum: 0,
      count: 0,
      avg: 0,
      max: 0
    },
    scoreStats: {
      sum: 0,
      count: 0,
      avg: 0,
      max: 0
    },
    coverageByDay: [],
    consistencyScore: 0
  };

  // 按日期统计
  dailyTopN.forEach(dayData => {
    const day = dayData.date;
    const markets = dayData.markets;
    
    result.coverageByDay.push({
      date: day,
      count: markets.length
    });
    
    markets.forEach(m => {
      result.totalSignals++;
      result.uniqueMarkets.add(m.market_id);
      
      // 分类统计
      const cat = m.category || 'unknown';
      result.categoryDistribution[cat] = (result.categoryDistribution[cat] || 0) + 1;
      
      // 风险分布
      const risk = m.risk || 'unknown';
      result.riskDistribution[risk] = (result.riskDistribution[risk] || 0) + 1;
      
      // 行动分布
      const action = m.action || 'unknown';
      result.actionDistribution[action] = (result.actionDistribution[action] || 0) + 1;
      
      // 流动性统计
      if (m.liquidity) {
        result.liquidityStats.sum += m.liquidity;
        result.liquidityStats.count++;
        result.liquidityStats.max = Math.max(result.liquidityStats.max, m.liquidity);
      }
      
      // 评分统计
      if (m.scores && m.scores.total) {
        result.scoreStats.sum += m.scores.total;
        result.scoreStats.count++;
        result.scoreStats.max = Math.max(result.scoreStats.max, m.scores.total);
      }
    });
  });

  // 计算平均值
  result.liquidityStats.avg = result.liquidityStats.count > 0 
    ? result.liquidityStats.sum / result.liquidityStats.count 
    : 0;
  result.scoreStats.avg = result.scoreStats.count > 0 
    ? result.scoreStats.sum / result.scoreStats.count 
    : 0;

  // 计算一致性得分
  // 一致性 = 每天出现在 TopN 的市场数量 / 总天数
  const marketCounts = new Map();
  dailyTopN.forEach(dayData => {
    dayData.markets.forEach(m => {
      marketCounts.set(m.market_id, (marketCounts.get(m.market_id) || 0) + 1);
    });
  });
  
  // 计算重复出现的频率
  let repeatedMarkets = 0;
  marketCounts.forEach(count => {
    if (count > 1) repeatedMarkets++;
  });
  
  result.consistencyScore = dailyTopN.length > 0 
    ? (repeatedMarkets / dailyTopN.length * 100).toFixed(2) 
    : 0;

  // 转换 Set 为数字
  result.uniqueMarketCount = result.uniqueMarkets.size;
  delete result.uniqueMarkets;

  return result;
}

// 识别 Top Movers（高频出现的市场）
function identifyTopMovers(dailyTopN, topN) {
  const marketCounts = new Map();
  const marketDetails = new Map();

  dailyTopN.forEach(dayData => {
    dayData.markets.forEach(m => {
      marketCounts.set(m.market_id, (marketCounts.get(m.market_id) || 0) + 1);
      
      if (!marketDetails.has(m.market_id)) {
        marketDetails.set(m.market_id, {
          market_id: m.market_id,
          slug: m.slug,
          question: m.question,
          category: m.category,
          count: 0,
          totalLiquidity: 0,
          avgScore: 0,
          scores: []
        });
      }
      
      const details = marketDetails.get(m.market_id);
      details.count++;
      details.totalLiquidity += (m.liquidity || 0);
      if (m.scores && m.scores.total) {
        details.scores.push(m.scores.total);
      }
    });
  });

  // 计算平均值并排序
  const movers = [];
  marketDetails.forEach((details, marketId) => {
    details.avgLiquidity = details.totalLiquidity / details.count;
    if (details.scores.length > 0) {
      details.avgScore = details.scores.reduce((a, b) => a + b, 0) / details.scores.length;
    }
    details.frequency = (details.count / dailyTopN.length * 100).toFixed(1);
    movers.push(details);
  });

  // 按出现频率排序
  return movers.sort((a, b) => b.count - a.count).slice(0, topN);
}

// 生成回测报告
function generateReport(dailyTopN, config) {
  const stability = calculateSignalStability(dailyTopN);
  const topMovers = identifyTopMovers(dailyTopN, 10);
  
  const report = {
    generated_at: new Date().toISOString(),
    config: {
      topN: config.topN,
      days: config.days,
      dateRange: {
        start: dailyTopN[0]?.date || null,
        end: dailyTopN[dailyTopN.length - 1]?.date || null
      }
    },
    summary: {
      totalDays: dailyTopN.length,
      totalSignals: stability.totalSignals,
      uniqueMarkets: stability.uniqueMarketCount,
      avgSignalsPerDay: dailyTopN.length > 0 
        ? (stability.totalSignals / dailyTopN.length).toFixed(1) 
        : 0,
      consistencyScore: stability.consistencyScore
    },
    coverage: stability.coverageByDay,
    categories: stability.categoryDistribution,
    riskDistribution: stability.riskDistribution,
    actionDistribution: stability.actionDistribution,
    liquidityStats: stability.liquidityStats,
    scoreStats: stability.scoreStats,
    topMovers: topMovers.map(m => ({
      market_id: m.market_id,
      slug: m.slug,
      question: m.question?.substring(0, 80) + '...',
      frequency: m.frequency,
      daysAppeared: m.count,
      avgLiquidity: m.avgLiquidity?.toFixed(2),
      avgScore: m.avgScore?.toFixed(2)
    }))
  };

  return report;
}

// 格式化 Markdown 报告
function formatMarkdownReport(report) {
  let md = `# 纸上回测周报\n\n`;
  md += `**生成时间**: ${new Date(report.generated_at).toLocaleString('zh-CN')}\n\n`;
  md += `**回测周期**: ${report.config.dateRange.start} ~ ${report.config.dateRange.end}\n\n`;
  md += `**TopN 设置**: ${report.config.topN}\n\n`;
  
  // 摘要
  md += `## 摘要\n\n`;
  md += `- 交易天数: ${report.summary.totalDays}\n`;
  md += `- 总信号数: ${report.summary.totalSignals}\n`;
  md += `- 独立市场: ${report.summary.uniqueMarkets}\n`;
  md += `- 日均信号: ${report.summary.avgSignalsPerDay}\n`;
  md += `- 一致性得分: ${report.summary.consistencyScore}%\n\n`;
  
  // 每日覆盖
  md += `## 每日覆盖\n\n`;
  md += `| 日期 | 信号数 |\n`;
  md += `|------|--------|\n`;
  report.coverage.forEach(day => {
    md += `| ${day.date} | ${day.count} |\n`;
  });
  md += `\n`;
  
  // 分类分布
  md += `## 分类分布\n\n`;
  Object.entries(report.categories).forEach(([cat, count]) => {
    const pct = (count / report.summary.totalSignals * 100).toFixed(1);
    md += `- ${cat}: ${count} (${pct}%)\n`;
  });
  md += `\n`;
  
  // Top Movers
  md += `## Top Movers (高频出现)\n\n`;
  md += `| 排名 | 市场 | 出现天数 | 频率 | 平均流动性 |\n`;
  md += `|------|------|----------|------|------------|\n`;
  report.topMovers.forEach((m, i) => {
    md += `| ${i + 1} | ${m.slug} | ${m.daysAppeared} | ${m.frequency}% | $${m.avgLiquidity} |\n`;
  });
  md += `\n`;
  
  // 评分统计
  md += `## 评分统计\n\n`;
  md += `- 平均分: ${report.scoreStats.avg?.toFixed(2)}\n`;
  md += `- 最高分: ${report.scoreStats.max?.toFixed(2)}\n`;
  md += `- 平均流动性: $${report.liquidityStats.avg?.toFixed(2)}\n\n`;
  
  // 风险分布
  md += `## 风险分布\n\n`;
  Object.entries(report.riskDistribution).forEach(([risk, count]) => {
    const pct = (count / report.summary.totalSignals * 100).toFixed(1);
    md += `- ${risk}: ${count} (${pct}%)\n`;
  });
  md += `\n`;
  
  // 说明
  md += `---\n\n`;
  md += `**说明**:\n`;
  md += `- 一致性得分: 每天重复出现在 TopN 的市场比例\n`;
  md += `- 高频出现的市场可能是稳定的交易机会\n`;
  md += `- 本报告仅供研究参考，不构成投资建议\n`;

  return md;
}

// 主函数
async function main() {
  const config = parseArgs();
  
  console.log(`📊 纸上回测框架`);
  console.log(`================`);
  console.log(`TopN: ${config.topN}, 回测天数: ${config.days}`);
  
  // 获取历史文件
  const files = getWatchlistFiles(config.days);
  console.log(`找到 ${files.length} 个历史文件`);
  
  if (files.length === 0) {
    console.log('❌ 没有找到历史 watchlist 文件');
    process.exit(1);
  }
  
  // 提取每日 TopN
  const dailyTopN = [];
  files.forEach(file => {
    const watchlist = readWatchlistFile(file.path);
    if (watchlist) {
      const markets = extractTopN(watchlist, config.topN);
      dailyTopN.push({
        date: file.date,
        markets
      });
      console.log(`✓ ${file.date}: ${markets.length} 个市场`);
    }
  });
  
  // 生成报告
  const report = generateReport(dailyTopN, config);
  
  // 保存 JSON 报告
  const today = new Date().toISOString().split('T')[0];
  const jsonPath = path.join(OUTPUT_DIR, `backtest-weekly-${today}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  console.log(`✓ 保存 JSON: ${jsonPath}`);
  
  // 保存 Markdown 报告
  const mdContent = formatMarkdownReport(report);
  const mdPath = path.join(OUTPUT_DIR, `backtest-weekly-${today}.md`);
  fs.writeFileSync(mdPath, mdContent, 'utf-8');
  console.log(`✓ 保存 Markdown: ${mdPath}`);
  
  // 同时保存一份 latest
  const latestJsonPath = path.join(OUTPUT_DIR, `backtest-weekly-latest.json`);
  const latestMdPath = path.join(OUTPUT_DIR, `backtest-weekly-latest.md`);
  fs.writeFileSync(latestJsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(latestMdPath, mdContent, 'utf-8');
  console.log(`✓ 保存 Latest 版本`);
  
  console.log(`\n✅ 回测完成!`);
  console.log(`\n摘要:`);
  console.log(`- 总信号: ${report.summary.totalSignals}`);
  console.log(`- 独立市场: ${report.summary.uniqueMarkets}`);
  console.log(`- 一致性得分: ${report.summary.consistencyScore}%`);
  
  return report;
}

main().catch(console.error);

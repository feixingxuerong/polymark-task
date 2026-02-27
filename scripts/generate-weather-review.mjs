/**
 * Weather Review Generator
 * 
 * 每日复盘脚本 - 针对 action=考虑 Top3~5 的市场
 * 
 * 输入：当日 watchlist + diff + alerts + resolution_parsed + stations + sources
 * 输出：poly-knowledge/outputs/weather-review-YYYY-MM-DD.json/.md
 * 
 * 功能：
 * - 筛选 action=考虑 的 Top3~5 市场
 * - 生成复盘字段：checks, falsifiers, todo
 * - 设置 status=unknown，记录 next_check 时间
 * - 提供规则迭代建议入口
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const POLY_KNOWLEDGE = path.join(__dirname, '..', 'poly-knowledge', 'outputs');
const CONFIG_DIR = path.join(__dirname, '..', 'poly-knowledge', 'config');
const NOTES_DIR = path.join(__dirname, '..', 'notes');
const ROOT_DIR = path.join(__dirname, '..');

const OUTPUT_DIR = POLY_KNOWLEDGE;

// Config
const CONFIG = {
  top_n: 5,  // Top3~5 markets to review
  action_keyword: '考虑',  // Filter for action containing this keyword
  fallback_keywords: ['观察', '考虑'],  // Fallback if no markets match primary keyword
};

/**
 * Get today's date string
 */
function getTodayDate() {
  const now = new Date();
  // Adjust for timezone if needed
  return now.toISOString().split('T')[0];
}

/**
 * Get yesterday's date string
 */
function getYesterdayDate() {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  return now.toISOString().split('T')[0];
}

/**
 * Get current timestamp
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * Find latest file matching pattern
 * Priority: watchlist-YYYY-MM-DD.json (prefer today's, then yesterday's)
 */
function findLatestWatchlist() {
  const today = getTodayDate();
  const yesterday = getYesterdayDate();
  
  // Try today's file first
  const todayFile = `watchlist-${today}.json`;
  const todayPath = path.join(POLY_KNOWLEDGE, todayFile);
  if (fs.existsSync(todayPath)) {
    return todayFile;
  }
  
  // Try yesterday's file
  const yesterdayFile = `watchlist-${yesterday}.json`;
  const yesterdayPath = path.join(POLY_KNOWLEDGE, yesterdayFile);
  if (fs.existsSync(yesterdayPath)) {
    return yesterdayFile;
  }
  
  // Fallback: find latest watchlist file
  const files = fs.readdirSync(POLY_KNOWLEDGE)
    .filter(f => f.startsWith('watchlist-') && f.endsWith('.json'))
    .filter(f => !f.includes('diff') && !f.includes('-latest'))
    .sort()
    .reverse();
  
  return files.length > 0 ? files[0] : null;
}

/**
 * Find latest weather alerts file
 */
function findLatestAlerts() {
  const today = getTodayDate();
  const yesterday = getYesterdayDate();
  
  // Try today's file first
  const todayFile = `weather-alerts-${today}.json`;
  const todayPath = path.join(POLY_KNOWLEDGE, todayFile);
  if (fs.existsSync(todayPath)) {
    return todayFile;
  }
  
  // Try yesterday's file
  const yesterdayFile = `weather-alerts-${yesterday}.json`;
  const yesterdayPath = path.join(POLY_KNOWLEDGE, yesterdayFile);
  if (fs.existsSync(yesterdayPath)) {
    return yesterdayFile;
  }
  
  // Fallback: find latest alerts file
  const files = fs.readdirSync(POLY_KNOWLEDGE)
    .filter(f => f.startsWith('weather-alerts-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  return files.length > 0 ? files[0] : null;
}

/**
 * Find latest weather aviation sources file
 */
function findLatestSources() {
  const today = getTodayDate();
  const yesterday = getYesterdayDate();
  
  // Try today's file first
  const todayFile = `weather-aviation-sources-${today}.json`;
  const todayPath = path.join(POLY_KNOWLEDGE, todayFile);
  if (fs.existsSync(todayPath)) {
    return todayFile;
  }
  
  // Try yesterday's file
  const yesterdayFile = `weather-aviation-sources-${yesterday}.json`;
  const yesterdayPath = path.join(POLY_KNOWLEDGE, yesterdayFile);
  if (fs.existsSync(yesterdayPath)) {
    return yesterdayFile;
  }
  
  return null;
}

/**
 * Load JSON file
 */
function loadJson(filename) {
  if (!filename) return null;
  const filepath = path.join(POLY_KNOWLEDGE, filename);
  if (!fs.existsSync(filepath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (e) {
    console.error(`Error loading ${filename}:`, e.message);
    return null;
  }
}

/**
 * Filter markets with action containing keyword
 */
function filterByAction(watchlist, keyword) {
  if (!watchlist || !watchlist.watchlist) return [];
  
  return watchlist.watchlist.filter(market => {
    const action = market.action || '';
    return action.includes(keyword);
  });
}

/**
 * Filter markets with multiple fallback keywords
 */
function filterByActionWithFallback(watchlist, primaryKeyword, fallbackKeywords) {
  // Try primary keyword first
  let markets = filterByAction(watchlist, primaryKeyword);
  
  // If no results, try fallback keywords
  if (markets.length === 0 && fallbackKeywords) {
    for (const keyword of fallbackKeywords) {
      markets = filterByAction(watchlist, keyword);
      if (markets.length > 0) {
        console.log(`Using fallback keyword: "${keyword}" (found ${markets.length} markets)`);
        break;
      }
    }
  }
  
  return markets;
}

/**
 * Estimate next check time based on end date
 */
function estimateNextCheck(endDate, daysToEvent) {
  if (endDate) {
    const end = new Date(endDate);
    const now = new Date();
    
    // If event is in the future, check 24h before
    if (end > now) {
      const hoursUntil = (end - now) / (1000 * 60 * 60);
      if (hoursUntil > 48) {
        return `T-24h: 赛事/事件前24小时检查`;
      } else if (hoursUntil > 24) {
        return `T-12h: 赛事/事件前12小时检查`;
      } else if (hoursUntil > 6) {
        return `T-6h: 赛事/事件前6小时检查`;
      } else {
        return `即时: 赛事/事件即将开始`;
      }
    }
    
    // If event has passed, check for resolution
    return `即时: 检查结算结果`;
  }
  
  // Fallback based on days to event
  if (daysToEvent !== undefined && daysToEvent !== null) {
    if (daysToEvent > 3) {
      return `T-24h: 3天前检查`;
    } else if (daysToEvent > 1) {
      return `T-12h: 1天前检查`;
    } else {
      return `即时: 不足1天`;
    }
  }
  
  return `T-24h: 每日例行检查`;
}

/**
 * Generate checks (what to verify next time)
 */
function generateChecks(market) {
  const checks = [];
  
  // Liquidity check
  if (market.liquidity && market.liquidity < 5000) {
    checks.push('流动性下降检查');
  }
  
  // Spread check
  if (market.spread_abs && market.spread_abs > 0.05) {
    checks.push('价差扩大检查');
  }
  
  // Time-based checks
  if (market.days_to_event !== undefined) {
    if (market.days_to_event <= 1) {
      checks.push('赛前赔率变化检查');
    } else if (market.days_to_event <= 3) {
      checks.push('赛前趋势形成检查');
    }
  }
  
  // Resolution source check
  if (!market.resolution_source || market.resolution_source === 'unknown') {
    checks.push('结算规则确认');
  }
  
  // Key risks from the market
  if (market.key_risks && market.key_risks.length > 0) {
    checks.push(`风险监控: ${market.key_risks[0]}`);
  }
  
  return checks.length > 0 ? checks : ['常规监控'];
}

/**
 * Generate falsifiers (conditions that would invalidate the thesis)
 */
function generateFalsifiers(market) {
  const falsifiers = [];
  
  // Thesis-based falsifiers
  if (market.thesis) {
    // Extract key claims from thesis and create falsifiers
    if (market.thesis.includes('结算')) {
      falsifiers.push('结算规则发生变化');
    }
    if (market.thesis.includes('流动性')) {
      falsifiers.push('流动性枯竭或大幅下降');
    }
    if (market.thesis.includes('风险')) {
      falsifiers.push('出现未预见的高风险事件');
    }
  }
  
  // Category-specific falsifiers
  if (market.category === 'sports') {
    falsifiers.push('比赛推迟或取消');
    falsifiers.push('关键球员伤病');
    falsifiers.push('裁判判罚重大争议');
  } else if (market.category === 'crypto') {
    falsifiers.push('重大监管消息');
    falsifiers.push('交易所技术故障');
    falsifiers.push('巨鲸操纵');
  } else if (market.category === 'weather') {
    falsifiers.push('预报模型大幅修正');
    falsifiers.push('极端天气事件');
  }
  
  // Generic falsifiers
  falsifiers.push('市场被下架或关闭');
  falsifiers.push('流动性不足以执行');
  
  return falsifiers.length > 0 ? falsifiers : ['无明确证伪条件'];
}

/**
 * Generate todo (data gaps to fill)
 */
function generateTodo(market) {
  const todo = [];
  
  // Check resolution data
  if (!market.resolution_parsed || market.resolution_parsed === null) {
    todo.push('待结算: 等待市场结算结果');
  }
  
  // Check monitor sources
  if (!market.monitor_sources || market.monitor_sources.length === 0) {
    todo.push('缺失: 监控源未配置');
  }
  
  // Check entry plan
  if (!market.entry_plan || market.entry_plan.trim() === '') {
    todo.push('缺失: 入场计划未填写');
  }
  
  // Check thesis
  if (!market.thesis || market.thesis.trim() === '') {
    todo.push('缺失: 投资论点未填写');
  }
  
  // Check key risks
  if (!market.key_risks || market.key_risks.length === 0) {
    todo.push('缺失: 关键风险未识别');
  }
  
  // Check station data for weather markets
  if (!market.station && market.category === 'weather') {
    todo.push('缺失: 气象站点数据');
  }
  
  return todo.length > 0 ? todo : ['数据完整'];
}

/**
 * Extract station info from market
 */
function extractStation(market) {
  // Try to get station from various possible locations
  if (market.station) {
    return market.station;
  }
  
  // Try to extract from description or question
  const question = market.question || '';
  const stationMatch = question.match(/\(([A-Z]{3,4})\)/);
  if (stationMatch) {
    return { id: stationMatch[1], extracted: true };
  }
  
  return null;
}

/**
 * Generate rule iteration suggestions
 */
function generateRuleSuggestions(market, watchlistData) {
  const suggestions = [];
  
  // Check scoring
  if (market.scores) {
    const totalScore = market.scores.total || 0;
    if (totalScore < 5) {
      suggestions.push({
        type: 'score_adjustment',
        field: 'total_score',
        current: totalScore,
        suggestion: '总分偏低，考虑是否筛选标准过于严格'
      });
    }
    
    // Check individual scores
    if (market.scores.liquidity_score && market.scores.liquidity_score < 5) {
      suggestions.push({
        type: 'weight_review',
        field: 'liquidity_weight',
        current: watchlistData?.scoring_weights?.liquidity || 0.2,
        suggestion: '流动性评分偏低，可能需要调整权重或筛选阈值'
      });
    }
  }
  
  // Check risk level
  if (market.risk === 'high') {
    suggestions.push({
      type: 'risk_filter',
      field: 'risk_level',
      current: 'high',
      suggestion: '高风险市场，建议复核是否应进入观察池'
    });
  }
  
  return suggestions;
}

/**
 * Main review generation
 */
function generateReview() {
  console.log('=== Weather Review Generator ===');
  console.log(`Running at: ${getCurrentTimestamp()}`);
  
  // Find latest watchlist
  const watchlistFile = findLatestWatchlist();
  if (!watchlistFile) {
    console.error('No watchlist file found!');
    return null;
  }
  console.log(`Using watchlist: ${watchlistFile}`);
  
  // Load watchlist
  const watchlistData = loadJson(watchlistFile);
  if (!watchlistData) {
    console.error('Failed to load watchlist!');
    return null;
  }
  
  // Filter by action (with fallback)
  const considerMarkets = filterByActionWithFallback(watchlistData, CONFIG.action_keyword, CONFIG.fallback_keywords);
  console.log(`Found ${considerMarkets.length} markets with action containing review keywords`);
  
  // Take top N
  const topMarkets = considerMarkets.slice(0, CONFIG.top_n);
  console.log(`Reviewing top ${topMarkets.length} markets`);
  
  // Try to load additional data
  const alertsFile = findLatestAlerts();
  const alertsData = alertsFile ? loadJson(alertsFile) : null;
  console.log(`Alerts file: ${alertsFile || 'none'}`);
  
  const sourcesFile = findLatestSources();
  const sourcesData = sourcesFile ? loadJson(sourcesFile) : null;
  console.log(`Sources file: ${sourcesFile || 'none'}`);
  
  // Generate review for each market
  const reviews = topMarkets.map((market, index) => {
    const station = extractStation(market);
    
    return {
      rank: index + 1,
      market_id: market.market_id,
      slug: market.slug,
      question: market.question,
      url: market.url,
      category: market.category,
      
      // Original fields from watchlist
      thesis: market.thesis || '未填写',
      entry_plan: market.entry_plan || '未填写',
      monitor_sources: market.monitor_sources || [],
      key_risks: market.key_risks || [],
      station: station,
      resolution_parsed: market.resolution_parsed || null,
      
      // Review fields
      status: market.resolution_parsed ? 'resolved' : 'unknown',
      next_check: estimateNextCheck(market.endDate, market.days_to_event),
      checks: generateChecks(market),
      falsifiers: generateFalsifiers(market),
      todo: generateTodo(market),
      
      // Rule iteration suggestions
      rule_suggestions: generateRuleSuggestions(market, watchlistData),
      
      // Additional context
      generated_at: getCurrentTimestamp()
    };
  });
  
  // Build output
  const outputDate = getTodayDate();
  const output = {
    generated_at: getCurrentTimestamp(),
    review_date: outputDate,
    watchlist_file: watchlistFile,
    total_reviewed: reviews.length,
    action_filter: CONFIG.action_keyword,
    
    // Summary
    summary: {
      unknown_count: reviews.filter(r => r.status === 'unknown').length,
      resolved_count: reviews.filter(r => r.status === 'resolved').length,
    },
    
    // Reviews
    reviews: reviews,
    
    // Metadata
    inputs_used: {
      watchlist: watchlistFile,
      alerts: alertsFile,
      sources: sourcesFile
    }
  };
  
  // Write JSON output
  const jsonFilename = `weather-review-${outputDate}.json`;
  const jsonPath = path.join(OUTPUT_DIR, jsonFilename);
  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`Written: ${jsonPath}`);
  
  // Generate markdown
  const mdContent = generateMarkdown(output);
  const mdFilename = `weather-review-${outputDate}.md`;
  const mdPath = path.join(OUTPUT_DIR, mdFilename);
  fs.writeFileSync(mdPath, mdContent, 'utf-8');
  console.log(`Written: ${mdPath}`);
  
  return { json: jsonFilename, md: mdFilename, output };
}

/**
 * Generate markdown output
 */
function generateMarkdown(output) {
  const date = output.review_date;
  
  let md = `# Weather Review - ${date}\n\n`;
  md += `> 自动生成于 ${output.generated_at}\n\n`;
  md += `---\n\n`;
  md += `## 概览\n\n`;
  md += `- 复盘日期: ${date}\n`;
  md += `- 输入文件: ${output.watchlist_file}\n`;
  md += `- 复盘市场数: ${output.total_reviewed}\n`;
  md += `- 筛选条件: action="${output.action_filter}"\n\n`;
  md += `| 状态 | 数量 |\n`;
  md += `|------|------|\n`;
  md += `| 待判定 (unknown) | ${output.summary.unknown_count} |\n`;
  md += `| 已结算 (resolved) | ${output.summary.resolved_count} |\n\n`;
  md += `---\n\n`;
  
  // Each market review
  output.reviews.forEach((review, index) => {
    md += `## ${index + 1}. ${review.question}\n\n`;
    md += `**市场ID**: ${review.market_id}  \n`;
    md += `**分类**: ${review.category}  \n`;
    md += `**链接**: [Polymarket](${review.url})\n\n`;
    
    md += `### 原始信息\n\n`;
    md += `- **投资论点 (Thesis)**: ${review.thesis}\n`;
    md += `- **入场计划**: ${review.entry_plan}\n`;
    md += `- **监控源**: ${review.monitor_sources.join(', ') || '未配置'}\n`;
    md += `- **关键风险**: ${review.key_risks.join(', ') || '未识别'}\n`;
    if (review.station) {
      md += `- **气象站点**: ${JSON.stringify(review.station)}\n`;
    }
    md += `- **结算解析**: ${review.resolution_parsed || '未结算'}\n\n`;
    
    md += `### 复盘\n\n`;
    md += `- **状态**: ${review.status}\n`;
    md += `- **下次检查**: ${review.next_check}\n\n`;
    
    md += `#### 下次核对点 (Checks)\n`;
    review.checks.forEach(check => {
      md += `- ${check}\n`;
    });
    md += `\n`;
    
    md += `#### 证伪条件 (Falsifiers)\n`;
    review.falsifiers.forEach(f => {
      md += `- ${f}\n`;
    });
    md += `\n`;
    
    md += `#### 待办/缺口 (Todo)\n`;
    review.todo.forEach(t => {
      md += `- ${t}\n`;
    });
    md += `\n`;
    
    // Rule suggestions
    if (review.rule_suggestions && review.rule_suggestions.length > 0) {
      md += `#### 规则迭代建议\n`;
      review.rule_suggestions.forEach(s => {
        md += `- **[${s.type}]** ${s.suggestion}\n`;
      });
      md += `\n`;
    }
    
    md += `---\n\n`;
  });
  
  md += `## 说明\n\n`;
  md += `- 本复盘仅针对 action=考虑 的 Top${output.total_reviewed} 市场\n`;
  md += `- 状态为 unknown 时，将根据 next_check 时间进行下一次核对\n`;
  md += `- 规则迭代建议仅供参考，需人工复核\n`;
  md += `- 不涉及真实交易，仅做 paper review\n\n`;
  md += `---\n\n`;
  md += `*本文件由 scripts/generate-weather-review.mjs 自动生成*\n`;
  
  return md;
}

// Run - always run when executed directly
generateReview();

export { generateReview };

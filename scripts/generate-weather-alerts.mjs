/**
 * Weather Alerts Generator
 * 
 * Generates low-disturbance alerts for Top3 action=考虑 markets
 * Trigger conditions:
 * 1) T-24h / T-6h countdown
 * 2) Data source updated
 * 3) Near settlement (no end date)
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
const SCRIPTS_DIR = path.join(__dirname);

// Cache file for source timestamps
const CACHE_FILE = path.join(POLY_KNOWLEDGE, 'alerts-cache.json');

// Config
const CONFIG = {
  top_n: 5,
  trigger_lookahead_hours: 48,
  min_liquidity: 500,
  // Actions to consider (from watchlist)
  action_keywords: ['考虑', '观察'],
  // Category to filter (weather-related)
  category_filter: ['weather', 'sports', 'crypto', 'unknown']
};

/**
 * Get today's date string
 */
function getTodayDate() {
  const now = new Date();
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
 * Priority: watchlist-* (not diff) > weather-watchlist-*
 */
function findLatestFile(pattern) {
  const files = fs.readdirSync(POLY_KNOWLEDGE)
    .filter(f => f.includes(pattern) && f.endsWith('.json'))
    .filter(f => !f.includes('diff') && !f.includes('-latest')) // Exclude diff and latest symlinks
    .sort()
    .reverse();
  
  if (files.length === 0) return null;
  
  // Prefer generic watchlist over weather-watchlist
  if (pattern === 'watchlist-') {
    const generic = files.find(f => f.startsWith('watchlist-') && !f.includes('weather-'));
    return generic || files[0];
  }
  
  return files[0];
}

/**
 * Load JSON file
 */
function loadJson(filename) {
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
 * Calculate hours to event
 */
function getHoursToEvent(endDate, daysToEvent) {
  if (endDate) {
    const end = new Date(endDate);
    const now = new Date();
    const hours = (end - now) / (1000 * 60 * 60);
    return hours;
  }
  // Fallback to days_to_event
  if (daysToEvent !== undefined && daysToEvent !== null) {
    return daysToEvent * 24;
  }
  return null;
}

/**
 * Determine trigger type
 */
function getTriggerType(hoursToEvent, endDate) {
  // If no end date, it's near settlement (cannot determine time)
  if (!endDate) {
    return { type: 'near_settlement', reason: '结算时间不明确' };
  }
  
  // If hoursToEvent is null or negative (past), also near settlement
  if (hoursToEvent === null || hoursToEvent <= 0) {
    return { type: 'near_settlement', reason: '已过期或结算时间不明确' };
  }
  
  if (hoursToEvent <= 6) {
    return { type: 't_minus_6h', reason: '6小时倒计时' };
  }
  if (hoursToEvent <= 24) {
    return { type: 't_minus_24h', reason: '24小时倒计时' };
  }
  if (hoursToEvent <= 48) {
    return { type: 't_minus_48h', reason: '48小时倒计时（可选）' };
  }
  return null; // Not triggered
}

/**
 * Check if source was updated
 */
function checkSourceUpdate(sourcesFile) {
  const sources = loadJson(sourcesFile);
  if (!sources) return { updated: false, reason: 'sources文件不存在' };
  
  // Get current generated_at
  const currentGeneratedAt = sources.generated_at;
  
  // Load cache
  let cache = { sources_timestamp: null };
  if (fs.existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    } catch (e) {
      // Ignore
    }
  }
  
  // Check if updated
  if (cache.sources_timestamp !== currentGeneratedAt) {
    // Update cache
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      sources_timestamp: currentGeneratedAt,
      last_check: getCurrentTimestamp()
    }, null, 2));
    
    return { 
      updated: true, 
      reason: `数据源已更新: ${currentGeneratedAt}`,
      timestamp: currentGeneratedAt
    };
  }
  
  return { 
    updated: false, 
    reason: '数据源无变化',
    timestamp: currentGeneratedAt
  };
}

/**
 * Filter markets by action (supports both formats)
 * - Generic watchlist: action field with 考虑/观察 keywords
 * - Weather watchlist: use weather_signal_score threshold
 */
function filterActionConsider(markets) {
  // Check if this is generic watchlist (has 'action' field)
  if (markets.length > 0 && markets[0].action !== undefined) {
    return markets.filter(m => {
      const action = m.action || '';
      return action.includes('考虑') || action.includes('观察');
    });
  }
  
  // Weather watchlist: use weather_signal_score >= 7.0
  return markets.filter(m => (m.weather_signal_score || 0) >= 7.0);
}

/**
 * Get market action/priority label
 */
function getMarketAction(market) {
  if (market.action) return market.action;
  if (market.weather_signal_score !== undefined) {
    if (market.weather_signal_score >= 8.0) return '高优先级';
    if (market.weather_signal_score >= 7.0) return '考虑';
    return '观察';
  }
  return '未知';
}

/**
 * Get market liquidity
 */
function getMarketLiquidity(market) {
  return market.liquidity || market.liquidity_usd || 0;
}

/**
 * Generate alerts
 */
function generateAlerts() {
  console.log('=== Weather Alerts Generator ===\n');
  
  const today = getTodayDate();
  console.log(`Date: ${today}\n`);
  
  // Find latest files
  const watchlistFile = findLatestFile('watchlist-');
  const watchlistDiffFile = findLatestFile('watchlist-diff-');
  const sourcesFile = findLatestFile('weather-aviation-sources-');
  
  console.log('Files:');
  console.log(`  - Watchlist: ${watchlistFile || 'N/A'}`);
  console.log(`  - Watchlist Diff: ${watchlistDiffFile || 'N/A'}`);
  console.log(`  - Sources: ${sourcesFile || 'N/A'}\n`);
  
  if (!watchlistFile) {
    console.error('No watchlist file found!');
    return null;
  }
  
  // Load data
  const watchlist = loadJson(watchlistFile);
  const sources = loadJson(sourcesFile);
  const sourceUpdate = checkSourceUpdate(sourcesFile);
  
  console.log(`Source update status: ${sourceUpdate.updated ? 'UPDATED' : 'No change'}\n`);
  
  if (!watchlist || (!watchlist.watchlist && !watchlist.markets)) {
    console.error('Invalid watchlist format!');
    return null;
  }
  
  // Handle both formats
  const marketList = watchlist.watchlist || watchlist.markets || [];
  console.log(`Loaded ${marketList.length} markets\n`);
  
  // Filter action=考虑/观察 markets
  const considerMarkets = filterActionConsider(marketList);
  console.log(`Found ${considerMarkets.length} action=考虑/观察 markets\n`);
  
  // Sort by rank and take top N
  const topMarkets = considerMarkets
    .sort((a, b) => (a.rank || 999) - (b.rank || 999))
    .slice(0, CONFIG.top_n);
  
  console.log(`Top ${CONFIG.top_n} markets to check:\n`);
  
  // Generate alerts
  const alerts = [];
  const triggerCounts = {
    t_minus_24h: 0,
    t_minus_6h: 0,
    source_updated: 0,
    near_settlement: 0
  };
  
  for (const market of topMarkets) {
    // Get endDate from either format
    const endDate = market.end_date || market.endDate || null;
    const hoursToEvent = getHoursToEvent(endDate, market.days_to_event);
    const trigger = getTriggerType(hoursToEvent, endDate);
    
    // Check if triggered
    let isTriggered = false;
    
    // 1. Time-based trigger
    if (trigger && (trigger.type === 't_minus_24h' || trigger.type === 't_minus_6h' || trigger.type === 'near_settlement')) {
      isTriggered = true;
      triggerCounts[trigger.type]++;
    }
    
    // 2. Source update trigger (global, applies to all)
    const sourceTriggered = sourceUpdate.updated;
    if (sourceTriggered) {
      triggerCounts.source_updated++;
    }
    
    // Only add alert if triggered
    if (isTriggered || sourceTriggered) {
      const alert = {
        rank: market.rank || market.market_id,
        market_id: market.market_id,
        slug: market.slug,
        question: market.question,
        url: market.url || `https://polymarket.com/market/${market.slug}`,
        category: market.category || (market.station?.city ? 'weather' : 'unknown'),
        trigger: {
          type: trigger?.type || 'source_updated',
          reason: trigger?.reason || sourceUpdate.reason,
          timestamp: getCurrentTimestamp(),
          details: market.end_date ? `endDate: ${market.end_date}` : (market.endDate ? `endDate: ${market.endDate}` : 'N/A')
        },
        market_data: {
          end_date: market.end_date || market.endDate,
          days_to_event: market.days_to_event,
          hours_to_event: hoursToEvent ? Math.round(hoursToEvent * 10) / 10 : null,
          liquidity: getMarketLiquidity(market),
          action: getMarketAction(market),
          entry_plan: market.entry_plan || (market.resolution_criteria ? `结算规则: ${market.resolution_criteria}` : ''),
          stations: market.station ? [market.station.id] : (market.monitor_sources?.filter(s => s.includes('Weather') || s.includes('NOAA')) || [])
        },
        next_steps: [
          '检查最新天气预报',
          '确认流动性充足',
          '验证结算规则'
        ],
        kb_link: '/weather/today'
      };
      
      alerts.push(alert);
      console.log(`  [${market.rank}] ${market.question.substring(0, 50)}...`);
      console.log(`      Trigger: ${alert.trigger.type} - ${alert.trigger.reason}`);
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Total alerts: ${alerts.length}`);
  console.log(`Trigger breakdown:`, triggerCounts);
  
  // Build output
  const output = {
    generated_at: getCurrentTimestamp(),
    date: today,
    version: '1.0.0',
    summary: {
      total_alerts: alerts.length,
      trigger_types: triggerCounts,
      markets_filtered: considerMarkets.length,
      alerts_sent: alerts.length
    },
    alerts,
    sources: {
      watchlist: watchlistFile,
      watchlist_diff: watchlistDiffFile,
      weather_sources: sourcesFile
    },
    config: {
      top_n: CONFIG.top_n,
      trigger_lookahead_hours: CONFIG.trigger_lookahead_hours,
      min_liquidity: CONFIG.min_liquidity
    }
  };
  
  return output;
}

/**
 * Save output files
 */
function saveOutput(output) {
  if (!output) return;
  
  const today = getTodayDate();
  const jsonFile = path.join(POLY_KNOWLEDGE, `weather-alerts-${today}.json`);
  const mdFile = path.join(POLY_KNOWLEDGE, `weather-alerts-${today}.md`);
  
  // Save JSON
  fs.writeFileSync(jsonFile, JSON.stringify(output, null, 2));
  console.log(`\nSaved: ${jsonFile}`);
  
  // Save Markdown
  const md = generateMarkdown(output);
  fs.writeFileSync(mdFile, md);
  console.log(`Saved: ${mdFile}`);
}

/**
 * Generate markdown output
 */
function generateMarkdown(output) {
  const { date, summary, alerts } = output;
  
  let md = `# Weather Alerts - ${date}\n\n`;
  md += `> Generated: ${output.generated_at}\n\n`;
  
  if (alerts.length === 0) {
    md += `## 无触发提醒\n\n`;
    md += `检查了 ${summary.markets_filtered} 个市场，未满足触发条件。\n`;
    return md;
  }
  
  md += `## 触发统计\n\n`;
  md += `- 总提醒数: ${summary.total_alerts}\n`;
  md += `- 24小时倒计时: ${summary.trigger_types.t_minus_24h}\n`;
  md += `- 6小时倒计时: ${summary.trigger_types.t_minus_6h}\n`;
  md += `- 数据源更新: ${summary.trigger_types.source_updated}\n`;
  md += `- 临近结算: ${summary.trigger_types.near_settlement}\n\n`;
  
  md += `## 提醒列表\n\n`;
  
  for (const alert of alerts) {
    md += `### ${alert.rank}. ${alert.question}\n\n`;
    md += `- **触发**: ${alert.trigger.reason}\n`;
    md += `- **类型**: ${alert.trigger.type}\n`;
    md += `- **到期**: ${alert.market_data.end_date || 'N/A'}\n`;
    md += `- **剩余**: ${alert.market_data.hours_to_event ? `${alert.market_data.hours_to_event}小时` : '临近结算'}\n`;
    md += `- **流动性**: $${alert.market_data.liquidity?.toFixed(2) || 'N/A'}\n`;
    md += `- **操作**: ${alert.market_data.action}\n`;
    md += `- **入场计划**: ${alert.market_data.entry_plan}\n`;
    md += `- **链接**: ${alert.url}\n\n`;
    md += `**下一步**:\n`;
    for (const step of alert.next_steps) {
      md += `- ${step}\n`;
    }
    md += `\n---\n\n`;
  }
  
  md += `\n*知识库: ${output.config.kb_link || '/weather/today'}*\n`;
  
  return md;
}

// Main
const output = generateAlerts();
if (output) {
  saveOutput(output);
  console.log('\nDone!');
} else {
  console.log('\nNo alerts generated.');
}

#!/usr/bin/env node

/**
 * Watchlist Diff Generator (异动雷达)
 * 
 * Compares today's watchlist with yesterday's to detect changes.
 * 
 * Usage: node generate-watchlist-diff.mjs
 * 
 * Output:
 *   - poly-knowledge/outputs/watchlist-diff-YYYY-MM-DD.json
 *   - poly-knowledge/outputs/watchlist-diff-YYYY-MM-DD.md
 * 
 * Diff dimensions:
 *   - new_entries: markets in today's list but not in yesterday's
 *   - dropped_entries: markets in yesterday's list but not in today's
 *   - score_jumps: score changes >= 1.0
 *   - spread_moves: spread changes (threshold: 1%)
 *   - liquidity_moves: liquidity changes (threshold: 20%)
 *   - top_movers: largest combined changes
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// === CONFIG ===
const OUTPUT_DIR = join(__dirname, '..', 'poly-knowledge', 'outputs');
const SCORE_JUMP_THRESHOLD = 1.0;
const SPREAD_MOVE_THRESHOLD = 1.0;  // percentage points
const LIQUIDITY_MOVE_THRESHOLD = 0.20;  // 20%
const TOP_MOVERS_LIMIT = 10;

// === HELPERS ===
function getLatestWatchlistFile() {
  const files = readdirSync(OUTPUT_DIR)
    .filter(f => f.match(/^watchlist-\d{4}-\d{2}-\d{2}\.json$/))
    .sort()
    .reverse();
  
  if (files.length === 0) return null;
  return files[0];
}

function findPreviousDayFile(targetDate) {
  const target = new Date(targetDate);
  const files = readdirSync(OUTPUT_DIR)
    .filter(f => f.match(/^watchlist-\d{4}-\d{2}-\d{2}\.json$/))
    .sort();
  
  for (let i = files.length - 1; i >= 0; i--) {
    const match = files[i].match(/watchlist-(\d{4}-\d{2}-\d{2})\.json/);
    if (match) {
      const fileDate = new Date(match[1]);
      if (fileDate < target) {
        return { file: files[i], date: match[1] };
      }
    }
  }
  return null;
}

function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// === MAIN ===
function main() {
  console.log('=== Watchlist Diff Generator (异动雷达) ===');
  
  const today = new Date();
  const todayStr = formatDate(today);
  
  // Find today's watchlist file
  const todayFile = getLatestWatchlistFile();
  if (!todayFile) {
    console.error('[ERROR] No watchlist file found');
    process.exit(1);
  }
  
  const todayMatch = todayFile.match(/watchlist-(\d{4}-\d{2}-\d{2})\.json/);
  const todayDateStr = todayMatch ? todayMatch[1] : todayStr;
  
  console.log(`[INFO] Today's file: ${todayFile}`);
  
  // Find yesterday's file
  const yesterdayInfo = findPreviousDayFile(todayDateStr);
  
  let yesterdayData = null;
  let yesterdayDateStr = null;
  let isFirstRun = false;
  
  if (!yesterdayInfo) {
    console.log('[INFO] No previous day file found, marking as first_run');
    isFirstRun = true;
    yesterdayDateStr = null;
  } else {
    yesterdayDateStr = yesterdayInfo.date;
    console.log(`[INFO] Yesterday's file: ${yesterdayInfo.file}`);
    
    try {
      const yesterdayContent = readFileSync(join(OUTPUT_DIR, yesterdayInfo.file), 'utf-8');
      yesterdayData = JSON.parse(yesterdayContent);
    } catch (e) {
      console.error('[ERROR] Failed to parse yesterday file:', e.message);
      process.exit(1);
    }
  }
  
  // Read today's watchlist
  let todayData;
  try {
    const todayContent = readFileSync(join(OUTPUT_DIR, todayFile), 'utf-8');
    todayData = JSON.parse(todayContent);
  } catch (e) {
    console.error('[ERROR] Failed to parse today file:', e.message);
    process.exit(1);
  }
  
  const todayWatchlist = todayData.watchlist || [];
  const yesterdayWatchlist = yesterdayData ? (yesterdayData.watchlist || []) : [];
  
  // Create maps for quick lookup
  const todayMap = new Map();
  todayWatchlist.forEach(item => todayMap.set(item.market_id, item));
  
  const yesterdayMap = new Map();
  yesterdayWatchlist.forEach(item => yesterdayMap.set(item.market_id, item));
  
  // === CALCULATE DIFF ===
  const diff = {
    generated_at: new Date().toISOString(),
    today_date: todayDateStr,
    yesterday_date: yesterdayDateStr,
    first_run: isFirstRun,
    summary: {
      today_count: todayWatchlist.length,
      yesterday_count: yesterdayWatchlist.length,
      new_count: 0,
      dropped_count: 0,
      score_jumps_count: 0,
      spread_moves_count: 0,
      liquidity_moves_count: 0
    },
    new_entries: [],
    dropped_entries: [],
    score_jumps: [],
    spread_moves: [],
    liquidity_moves: [],
    top_movers: []
  };
  
  if (!isFirstRun) {
    // New entries (in today but not in yesterday)
    todayWatchlist.forEach(item => {
      if (!yesterdayMap.has(item.market_id)) {
        diff.new_entries.push({
          market_id: item.market_id,
          question: item.question,
          rank: item.rank,
          score: item.scores?.total,
          liquidity: item.liquidity,
          implied_probability: item.implied_probability,
          reason: `新上榜，排名 #${item.rank}，评分 ${item.scores?.total?.toFixed(1)}`
        });
      }
    });
    diff.summary.new_count = diff.new_entries.length;
    
    // Dropped entries (in yesterday but not in today)
    yesterdayWatchlist.forEach(item => {
      if (!todayMap.has(item.market_id)) {
        diff.dropped_entries.push({
          market_id: item.market_id,
          question: item.question,
          yesterday_rank: item.rank,
          yesterday_score: item.scores?.total,
          yesterday_liquidity: item.liquidity,
          reason: `跌出榜单昨日排名 #${item.rank}`
        });
      }
    });
    diff.summary.dropped_count = diff.dropped_entries.length;
    
    // Score jumps (>= 1.0)
    todayWatchlist.forEach(todayItem => {
      const yesterdayItem = yesterdayMap.get(todayItem.market_id);
      if (yesterdayItem) {
        const scoreDiff = (todayItem.scores?.total || 0) - (yesterdayItem.scores?.total || 0);
        if (Math.abs(scoreDiff) >= SCORE_JUMP_THRESHOLD) {
          const direction = scoreDiff > 0 ? 'up' : 'down';
          diff.score_jumps.push({
            market_id: todayItem.market_id,
            question: todayItem.question,
            today_rank: todayItem.rank,
            yesterday_rank: yesterdayItem.rank,
            today_score: todayItem.scores?.total,
            yesterday_score: yesterdayItem.scores?.total,
            score_change: scoreDiff,
            direction,
            reason: `评分${scoreDiff > 0 ? '上升' : '下降'} ${Math.abs(scoreDiff).toFixed(1)}分 (${yesterdayItem.scores?.total?.toFixed(1)} → ${todayItem.scores?.total?.toFixed(1)})`
          });
        }
      }
    });
    diff.summary.score_jumps_count = diff.score_jumps.length;
    
    // Spread moves
    todayWatchlist.forEach(todayItem => {
      const yesterdayItem = yesterdayMap.get(todayItem.market_id);
      if (yesterdayItem && yesterdayItem.spread_pct !== null && todayItem.spread_pct !== null) {
        const spreadDiff = todayItem.spread_pct - yesterdayItem.spread_pct;
        if (Math.abs(spreadDiff) >= SPREAD_MOVE_THRESHOLD) {
          const direction = spreadDiff > 0 ? 'widened' : 'narrowed';
          diff.spread_moves.push({
            market_id: todayItem.market_id,
            question: todayItem.question,
            today_spread_pct: todayItem.spread_pct,
            yesterday_spread_pct: yesterdayItem.spread_pct,
            spread_change: spreadDiff,
            direction,
            reason: `点差${spreadDiff > 0 ? '扩大' : '收窄'} ${Math.abs(spreadDiff).toFixed(1)}% (${yesterdayItem.spread_pct?.toFixed(1)}% → ${todayItem.spread_pct?.toFixed(1)}%)`
          });
        }
      }
    });
    diff.summary.spread_moves_count = diff.spread_moves.length;
    
    // Liquidity moves
    todayWatchlist.forEach(todayItem => {
      const yesterdayItem = yesterdayMap.get(todayItem.market_id);
      if (yesterdayItem && yesterdayItem.liquidity > 0 && todayItem.liquidity > 0) {
        const liquidityRatio = (todayItem.liquidity - yesterdayItem.liquidity) / yesterdayItem.liquidity;
        if (Math.abs(liquidityRatio) >= LIQUIDITY_MOVE_THRESHOLD) {
          const direction = liquidityRatio > 0 ? 'increased' : 'decreased';
          diff.liquidity_moves.push({
            market_id: todayItem.market_id,
            question: todayItem.question,
            today_liquidity: todayItem.liquidity,
            yesterday_liquidity: yesterdayItem.liquidity,
            liquidity_change_pct: liquidityRatio * 100,
            direction,
            reason: `流动性${liquidityRatio > 0 ? '增加' : '减少'} ${Math.abs(liquidityRatio * 100).toFixed(0)}% ($${Math.round(yesterdayItem.liquidity).toLocaleString()} → $${Math.round(todayItem.liquidity).toLocaleString()})`
          });
        }
      }
    });
    diff.summary.liquidity_moves_count = diff.liquidity_moves.length;
    
    // Top movers (combined change score)
    const allMovers = [];
    todayWatchlist.forEach(todayItem => {
      const yesterdayItem = yesterdayMap.get(todayItem.market_id);
      if (yesterdayItem) {
        // Calculate composite change score
        let changeScore = 0;
        changeScore += Math.abs((todayItem.scores?.total || 0) - (yesterdayItem.scores?.total || 0));
        
        if (yesterdayItem.spread_pct !== null && todayItem.spread_pct !== null) {
          changeScore += Math.abs(todayItem.spread_pct - yesterdayItem.spread_pct);
        }
        
        if (yesterdayItem.liquidity > 0 && todayItem.liquidity > 0) {
          changeScore += Math.abs((todayItem.liquidity - yesterdayItem.liquidity) / yesterdayItem.liquidity) * 10;
        }
        
        allMovers.push({
          market_id: todayItem.market_id,
          question: todayItem.question,
          today_rank: todayItem.rank,
          yesterday_rank: yesterdayItem.rank,
          change_score: changeScore,
          reason: `综合变化得分 ${changeScore.toFixed(1)}，排名 ${yesterdayItem.rank} → ${todayItem.rank}`
        });
      }
    });
    
    // Sort by change score and take top movers
    allMovers.sort((a, b) => b.change_score - a.change_score);
    diff.top_movers = allMovers.slice(0, TOP_MOVERS_LIMIT);
  }
  
  // === OUTPUT FILES ===
  const outputDateStr = todayDateStr;
  const jsonPath = join(OUTPUT_DIR, `watchlist-diff-${outputDateStr}.json`);
  const mdPath = join(OUTPUT_DIR, `watchlist-diff-${outputDateStr}.md`);
  
  // JSON output
  writeFileSync(jsonPath, JSON.stringify(diff, null, 2));
  console.log(`[OUTPUT] JSON: ${jsonPath}`);
  
  // Markdown output
  let md = `# Watchlist Diff - ${outputDateStr}\n\n`;
  md += `> Generated: ${new Date().toISOString()}\n`;
  md += `> Today: ${outputDateStr}\n`;
  md += `> Yesterday: ${yesterdayDateStr || 'N/A (first run)'}\n`;
  md += `> First Run: ${isFirstRun ? 'Yes' : 'No'}\n\n`;
  
  // Summary
  md += `## Summary\n\n`;
  md += `- Today's count: ${diff.summary.today_count}\n`;
  md += `- Yesterday's count: ${diff.summary.yesterday_count}\n`;
  md += `- New entries: ${diff.summary.new_count}\n`;
  md += `- Dropped: ${diff.summary.dropped_count}\n`;
  md += `- Score jumps (>=${SCORE_JUMP_THRESHOLD}): ${diff.summary.score_jumps_count}\n`;
  md += `- Spread moves (>${SPREAD_MOVE_THRESHOLD}%): ${diff.summary.spread_moves_count}\n`;
  md += `- Liquidity moves (>${LIQUIDITY_MOVE_THRESHOLD * 100}%): ${diff.summary.liquidity_moves_count}\n\n`;
  
  if (isFirstRun) {
    md += `> 首次运行，无历史数据对比\n\n`;
  } else {
    // New entries
    md += `---\n\n## New Entries (新增)\n\n`;
    if (diff.new_entries.length === 0) {
      md += `_No new entries_\n\n`;
    } else {
      md += `| # | Question | Rank | Score | Liquidity | Reason |\n`;
      md += `|---|----------|------|-------|-----------|--------|\n`;
      const newTop10 = diff.new_entries.slice(0, 10);
      newTop10.forEach((item, i) => {
        const question = item.question ? item.question.substring(0, 30) + '...' : 'N/A';
        const liq = item.liquidity ? `$${Math.round(item.liquidity / 1000).toFixed(0)}k` : 'N/A';
        md += `| ${i + 1} | ${question} | #${item.rank} | ${item.score?.toFixed(1) || 'N/A'} | ${liq} | ${item.reason} |\n`;
      });
      if (diff.new_entries.length > 10) {
        md += `\n_... and ${diff.new_entries.length - 10} more_\n`;
      }
      md += `\n`;
    }
    
    // Dropped entries
    md += `## Dropped Entries (移除)\n\n`;
    if (diff.dropped_entries.length === 0) {
      md += `_No dropped entries_\n\n`;
    } else {
      md += `| # | Question | Yesterday Rank | Reason |\n`;
      md += `|---|----------|----------------|--------|\n`;
      const dropTop10 = diff.dropped_entries.slice(0, 10);
      dropTop10.forEach((item, i) => {
        const question = item.question ? item.question.substring(0, 30) + '...' : 'N/A';
        md += `| ${i + 1} | ${question} | #${item.yesterday_rank} | ${item.reason} |\n`;
      });
      if (diff.dropped_entries.length > 10) {
        md += `\n_... and ${diff.dropped_entries.length - 10} more_\n`;
      }
      md += `\n`;
    }
    
    // Score jumps
    md += `## Score Jumps (分数跳变)\n\n`;
    if (diff.score_jumps.length === 0) {
      md += `_No significant score jumps_\n\n`;
    } else {
      // Sort by absolute change
      const sortedJumps = [...diff.score_jumps].sort((a, b) => Math.abs(b.score_change) - Math.abs(a.score_change));
      md += `| # | Question | Change | Today | Yesterday | Reason |\n`;
      md += `|---|----------|--------|-------|-----------|--------|\n`;
      const jumpsTop10 = sortedJumps.slice(0, 10);
      jumpsTop10.forEach((item, i) => {
        const question = item.question ? item.question.substring(0, 25) + '...' : 'N/A';
        const sign = item.score_change > 0 ? '+' : '';
        md += `| ${i + 1} | ${question} | ${sign}${item.score_change.toFixed(1)} | ${item.today_score?.toFixed(1)} | ${item.yesterday_score?.toFixed(1)} | ${item.reason} |\n`;
      });
      if (diff.score_jumps.length > 10) {
        md += `\n_... and ${diff.score_jumps.length - 10} more_\n`;
      }
      md += `\n`;
    }
    
    // Spread moves
    md += `## Spread Moves (点差变化)\n\n`;
    if (diff.spread_moves.length === 0) {
      md += `_No significant spread moves_\n\n`;
    } else {
      const sortedSpreads = [...diff.spread_moves].sort((a, b) => Math.abs(b.spread_change) - Math.abs(a.spread_change));
      md += `| # | Question | Change | Today | Yesterday | Reason |\n`;
      md += `|---|----------|--------|-------|-----------|--------|\n`;
      const spreadsTop10 = sortedSpreads.slice(0, 10);
      spreadsTop10.forEach((item, i) => {
        const question = item.question ? item.question.substring(0, 25) + '...' : 'N/A';
        const sign = item.spread_change > 0 ? '+' : '';
        md += `| ${i + 1} | ${question} | ${sign}${item.spread_change.toFixed(1)}% | ${item.today_spread_pct?.toFixed(1)}% | ${item.yesterday_spread_pct?.toFixed(1)}% | ${item.reason} |\n`;
      });
      if (diff.spread_moves.length > 10) {
        md += `\n_... and ${diff.spread_moves.length - 10} more_\n`;
      }
      md += `\n`;
    }
    
    // Liquidity moves
    md += `## Liquidity Moves (流动性变化)\n\n`;
    if (diff.liquidity_moves.length === 0) {
      md += `_No significant liquidity moves_\n\n`;
    } else {
      const sortedLiquidity = [...diff.liquidity_moves].sort((a, b) => Math.abs(b.liquidity_change_pct) - Math.abs(a.liquidity_change_pct));
      md += `| # | Question | Change | Today | Yesterday | Reason |\n`;
      md += `|---|----------|--------|-------|-----------|--------|\n`;
      const liquidityTop10 = sortedLiquidity.slice(0, 10);
      liquidityTop10.forEach((item, i) => {
        const question = item.question ? item.question.substring(0, 25) + '...' : 'N/A';
        const sign = item.liquidity_change_pct > 0 ? '+' : '';
        const todayLiq = item.today_liquidity ? `$${Math.round(item.today_liquidity / 1000).toFixed(0)}k` : 'N/A';
        const yesterdayLiq = item.yesterday_liquidity ? `$${Math.round(item.yesterday_liquidity / 1000).toFixed(0)}k` : 'N/A';
        md += `| ${i + 1} | ${question} | ${sign}${item.liquidity_change_pct.toFixed(0)}% | ${todayLiq} | ${yesterdayLiq} | ${item.reason} |\n`;
      });
      if (diff.liquidity_moves.length > 10) {
        md += `\n_... and ${diff.liquidity_moves.length - 10} more_\n`;
      }
      md += `\n`;
    }
    
    // Top movers
    md += `## Top Movers (综合异动)\n\n`;
    if (diff.top_movers.length === 0) {
      md += `_No significant movers_\n\n`;
    } else {
      md += `| # | Question | Change Score | Rank Change | Reason |\n`;
      md += `|---|----------|--------------|-------------|--------|\n`;
      diff.top_movers.forEach((item, i) => {
        const question = item.question ? item.question.substring(0, 25) + '...' : 'N/A';
        const rankChange = item.yesterday_rank - item.today_rank;
        const rankStr = rankChange > 0 ? `↑${rankChange}` : rankChange < 0 ? `↓${Math.abs(rankChange)}` : '-';
        md += `| ${i + 1} | ${question} | ${item.change_score.toFixed(1)} | ${item.yesterday_rank}→${item.today_rank} (${rankStr}) | ${item.reason} |\n`;
      });
      md += `\n`;
    }
  }
  
  md += `---\n\n## Methodology\n\n`;
  md += `- Compares today's watchlist with yesterday's\n`;
  md += `- Score jump threshold: ${SCORE_JUMP_THRESHOLD}\n`;
  md += `- Spread move threshold: ${SPREAD_MOVE_THRESHOLD}%\n`;
  md += `- Liquidity move threshold: ${LIQUIDITY_MOVE_THRESHOLD * 100}%\n`;
  md += `- Top movers: combined change score, limited to ${TOP_MOVERS_LIMIT}\n`;
  
  writeFileSync(mdPath, md);
  console.log(`[OUTPUT] Markdown: ${mdPath}`);
  
  console.log('=== Done ===');
}

main();

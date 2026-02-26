#!/usr/bin/env node

/**
 * Daily Watchlist Generator
 * 
 * Fetches Polymarket markets via Gamma/CLOB APIs, calculates metrics,
 * scores using watchlist-scoring.yaml rules, outputs top 30-50 candidates.
 * 
 * Usage: node generate-watchlist.mjs [--limit N] [--min-liquidity N]
 * 
 * Output:
 *   - poly-knowledge/outputs/watchlist-YYYY-MM-DD.json
 *   - poly-knowledge/outputs/watchlist-YYYY-MM-DD.md
 * 
 * Constraints: Read-only, no trading, no signatures.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// === CONFIG ===
const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';
const DEFAULT_LIMIT = 50;
const DEFAULT_MIN_LIQUIDITY = 1000;
const TOP_N = 30;

// === SCORING RULES (from watchlist-scoring.yaml) ===
const SCORING_WEIGHTS = {
  liquidity: 0.20,
  spread: 0.15,
  volatility: 0.15,
  settlement_clarity: 0.15,
  event_calendar: 0.10,
  hedgeability: 0.10,
  risk_level: 0.15
};

const SCORING_RULES = {
  liquidity_score: [
    { condition: 'liquidity >= 50000', score: 10 },
    { condition: 'liquidity >= 10000', score: 7 },
    { condition: 'liquidity >= 1000', score: 4 },
    { condition: 'liquidity < 1000', score: 1 }
  ],
  spread_score: [
    { condition: 'spread_pct <= 1', score: 10 },
    { condition: 'spread_pct <= 3', score: 7 },
    { condition: 'spread_pct <= 5', score: 4 },
    { condition: 'spread_pct > 5', score: 1 }
  ],
  volatility_score: [
    { condition: "volatility_level == 'medium'", score: 10 },
    { condition: "volatility_level == 'high'", score: 7 },
    { condition: "volatility_level == 'low'", score: 3 }
  ],
  settlement_clarity_score: [
    { condition: "uma_resolution_status == 'resolved'", score: 10 },
    { condition: "resolution_source == 'official'", score: 8 },
    { condition: "community_voted", score: 5 },
    { condition: "disputed_or_unclear", score: 1 }
  ],
  event_calendar_score: [
    { condition: 'days_to_event <= 7', score: 10 },
    { condition: 'days_to_event <= 30', score: 6 },
    { condition: 'days_to_event > 30', score: 3 }
  ],
  hedgeability_score: [
    { condition: 'has_correlated_markets >= 3', score: 10 },
    { condition: 'has_correlated_markets >= 1', score: 5 },
    { condition: 'no_correlated_markets', score: 1 }
  ],
  risk_level_score: [
    { condition: "risk == 'low'", score: 10 },
    { condition: "risk == 'medium'", score: 6 },
    { condition: "risk == 'high'", score: 2 }
  ]
};

// === HTTP HELPERS ===
async function fetchJSON(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json', ...options.headers },
    ...options
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json();
}

// === API CALLS ===
async function getMarkets(minLiquidity = DEFAULT_MIN_LIQUIDITY, limit = DEFAULT_LIMIT) {
  const url = `${GAMMA_API}/markets?closed=false&liquidity_num_min=${minLiquidity}&order=volume&limit=${limit}`;
  console.log(`[API] Fetching markets from Gamma: ${url}`);
  return fetchJSON(url);
}

async function getOrderbook(tokenId) {
  if (!tokenId) return null;
  try {
    return await fetchJSON(`${CLOB_API}/orderbook?token_id=${tokenId}`);
  } catch (e) {
    console.warn(`[WARN] Failed to get orderbook for ${tokenId}: ${e.message}`);
    return null;
  }
}

async function getMidpoint(tokenId) {
  if (!tokenId) return null;
  try {
    return await fetchJSON(`${CLOB_API}/midpoints?token_id=${tokenId}`);
  } catch (e) {
    return null;
  }
}

async function getLastTradePrice(tokenId) {
  if (!tokenId) return null;
  try {
    return await fetchJSON(`${CLOB_API}/last-trade-price?token_id=${tokenId}`);
  } catch (e) {
    return null;
  }
}

async function getFeeRate(tokenId) {
  if (!tokenId) return null;
  try {
    return await fetchJSON(`${CLOB_API}/fee-rate?token_id=${tokenId}`);
  } catch (e) {
    return null;
  }
}

// === METRICS CALCULATION ===
function calculateMetrics(market, orderbook, midpointData, lastTradeData, feeData) {
  const now = new Date();
  const today = now.toISOString().split('T')[0]; // Use local date
  
  const metrics = {
    // Basic info
    market_id: market.id,
    question: market.question,
    description: market.description || '',
    
    // From Gamma API
    volume: parseFloat(market.volume) || 0,
    liquidity: parseFloat(market.liquidity) || 0,
    clobTokenIds: market.clobTokenIds || [],
    startDate: market.startDate || null,
    endDate: market.endDate || null,
    acceptingOrders: market.acceptingOrders || false,
    negRisk: market.negRisk || false,
    
    // Implied probability (from price)
    implied_probability: null,
    
    // Spread (from orderbook)
    best_bid: null,
    best_ask: null,
    spread_abs: null,
    spread_pct: null,
    
    // Depth proxy
    depth_proxy: 0,
    
    // Days to event
    days_to_event: null,
    
    // Fee rate
    fee_rate: null,
    
    // Last trade
    last_trade_price: null,
    last_trade_time: null,
    
    // Midpoint
    midpoint: null,
    
    // Volatility proxy (based on spread as proxy)
    volatility_level: 'low',
    
    // Settlement clarity
    uma_resolution_status: 'unknown',
    resolution_source: 'unknown',
    
    // Risk
    risk: 'medium'
  };
  
  // Extract and validate token IDs (must start with 0x)
  // Note: clobTokenIds may come as JSON string or array
  let tokenIds = market.clobTokenIds || [];
  if (typeof tokenIds === 'string') {
    try {
      tokenIds = JSON.parse(tokenIds);
    } catch (e) {
      tokenIds = [];
    }
  }
  const yesTokenId = tokenIds[0] && typeof tokenIds[0] === 'string' && tokenIds[0].startsWith('0x') ? tokenIds[0] : null;
  const noTokenId = tokenIds[1] && typeof tokenIds[1] === 'string' && tokenIds[1].startsWith('0x') ? tokenIds[1] : null;
  
  // Implied probability from last trade or midpoint
  if (lastTradeData?.price) {
    metrics.implied_probability = parseFloat(lastTradeData.price);
    metrics.last_trade_price = parseFloat(lastTradeData.price);
  } else if (midpointData?.midpoint) {
    metrics.implied_probability = parseFloat(midpointData.midpoint);
    metrics.midpoint = parseFloat(midpointData.midpoint);
  }
  
  // Spread from orderbook
  if (orderbook?.bids?.length > 0 && orderbook?.asks?.length > 0) {
    metrics.best_bid = parseFloat(orderbook.bids[0].price);
    metrics.best_ask = parseFloat(orderbook.asks[0].price);
    
    if (metrics.best_bid && metrics.best_ask) {
      metrics.spread_abs = metrics.best_ask - metrics.best_bid;
      const mid = (metrics.best_bid + metrics.best_ask) / 2;
      metrics.spread_pct = (metrics.spread_abs / mid) * 100;
    }
    
    // Depth proxy: sum of top 5 levels on both sides
    const bidsDepth = orderbook.bids.slice(0, 5).reduce((sum, b) => sum + parseFloat(b.size || 0), 0);
    const asksDepth = orderbook.asks.slice(0, 5).reduce((sum, a) => sum + parseFloat(a.size || 0), 0);
    metrics.depth_proxy = bidsDepth + asksDepth;
  }
  
  // Fee rate
  if (feeData?.feeRate !== undefined) {
    metrics.fee_rate = parseFloat(feeData.feeRate);
  }
  
  // Days to event
  if (market.endDate) {
    const endDate = new Date(market.endDate);
    const diffMs = endDate - now;
    metrics.days_to_event = diffMs / (1000 * 60 * 60 * 24); // days
  }
  
  // Volatility level (proxy based on spread)
  if (metrics.spread_pct !== null) {
    if (metrics.spread_pct <= 2) metrics.volatility_level = 'low';
    else if (metrics.spread_pct <= 5) metrics.volatility_level = 'medium';
    else metrics.volatility_level = 'high';
  }
  
  // Settlement clarity
  if (market.resolved) {
    metrics.uma_resolution_status = 'resolved';
    metrics.resolution_source = 'official';
  } else if (market.acceptingOrders === false) {
    metrics.uma_resolution_status = 'closed';
    metrics.resolution_source = 'official';
  }
  
  // Risk level based on negRisk and spread
  if (market.negRisk) {
    metrics.risk = 'high';
  } else if (metrics.spread_pct !== null && metrics.spread_pct > 5) {
    metrics.risk = 'high';
  } else if (metrics.liquidity > 50000 && metrics.spread_pct < 2) {
    metrics.risk = 'low';
  }
  
  return metrics;
}

// === SCORING ===
function evaluateCondition(condition, metrics) {
  try {
    // Simple condition evaluator
    const parts = condition.split(/(\s*>=?\s*|\s*==\s*|\s*<\s*)/);
    const varName = parts[0].trim();
    const operator = parts[1]?.trim() || '==';
    const threshold = parts[2]?.trim();
    
    let value = metrics[varName];
    if (value === null || value === undefined) return false;
    
    // Handle string comparisons
    if (typeof value === 'string') {
      return eval(`"${value}" ${operator} "${threshold}"`);
    }
    
    return eval(`${value} ${operator} ${threshold}`);
  } catch (e) {
    console.warn(`[WARN] Condition evaluation failed: ${condition}`, e.message);
    return false;
  }
}

function calculateScore(metrics) {
  const scores = {};
  
  // Liquidity score
  for (const rule of SCORING_RULES.liquidity_score) {
    if (evaluateCondition(rule.condition, { liquidity: metrics.liquidity })) {
      scores.liquidity_score = rule.score;
      break;
    }
  }
  scores.liquidity_score = scores.liquidity_score || 1;
  
  // Spread score
  for (const rule of SCORING_RULES.spread_score) {
    if (evaluateCondition(rule.condition, { spread_pct: metrics.spread_pct })) {
      scores.spread_score = rule.score;
      break;
    }
  }
  scores.spread_score = scores.spread_score || 1;
  
  // Volatility score (inverse - lower is better for trading)
  if (metrics.volatility_level === 'low') scores.volatility_score = 10;
  else if (metrics.volatility_level === 'medium') scores.volatility_score = 7;
  else scores.volatility_score = 3;
  
  // Settlement clarity
  if (metrics.uma_resolution_status === 'resolved') scores.settlement_clarity_score = 10;
  else if (metrics.resolution_source === 'official') scores.settlement_clarity_score = 8;
  else scores.settlement_clarity_score = 5;
  
  // Event calendar
  if (metrics.days_to_event !== null) {
    if (metrics.days_to_event <= 7) scores.event_calendar_score = 10;
    else if (metrics.days_to_event <= 30) scores.event_calendar_score = 6;
    else scores.event_calendar_score = 3;
  } else {
    scores.event_calendar_score = 3;
  }
  
  // Hedgeability (default to 1 - no correlated markets info from API)
  scores.hedgeability_score = 1;
  
  // Risk level
  if (metrics.risk === 'low') scores.risk_level_score = 10;
  else if (metrics.risk === 'medium') scores.risk_level_score = 6;
  else scores.risk_level_score = 2;
  
  // Calculate weighted total
  scores.total = 
    scores.liquidity_score * SCORING_WEIGHTS.liquidity +
    scores.spread_score * SCORING_WEIGHTS.spread +
    scores.volatility_score * SCORING_WEIGHTS.volatility +
    scores.settlement_clarity_score * SCORING_WEIGHTS.settlement_clarity +
    scores.event_calendar_score * SCORING_WEIGHTS.event_calendar +
    scores.hedgeability_score * SCORING_WEIGHTS.hedgeability +
    scores.risk_level_score * SCORING_WEIGHTS.risk_level;
  
  return scores;
}

function generateReason(metrics, scores) {
  const reasons = [];
  
  if (scores.liquidity_score >= 7) reasons.push(`高流动性 $${Math.round(metrics.liquidity).toLocaleString()}`);
  if (scores.spread_score >= 7) reasons.push(`窄点差 ${metrics.spread_pct?.toFixed(1)}%`);
  if (scores.event_calendar_score >= 6 && metrics.days_to_event !== null) {
    reasons.push(`${metrics.days_to_event.toFixed(0)}天后到期`);
  }
  if (scores.risk_level_score >= 6) reasons.push(`低风险`);
  if (metrics.negRisk) reasons.push('Neg Risk市场');
  
  if (reasons.length === 0) return '候选观察';
  return reasons.join(' | ');
}

// === MAIN ===
async function main() {
  console.log('=== Daily Watchlist Generator ===');
  
  // Parse args
  const args = process.argv.slice(2);
  let limit = DEFAULT_LIMIT;
  let minLiquidity = DEFAULT_MIN_LIQUIDITY;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--min-liquidity' && args[i + 1]) {
      minLiquidity = parseInt(args[i + 1], 10);
      i++;
    }
  }
  
  console.log(`[CONFIG] limit=${limit}, minLiquidity=${minLiquidity}`);
  
  // Fetch markets
  const markets = await getMarkets(minLiquidity, limit);
  console.log(`[INFO] Fetched ${markets.length} markets`);
  
  if (!markets || markets.length === 0) {
    console.error('[ERROR] No markets returned');
    process.exit(1);
  }
  
  // Process each market
  const results = [];
  for (let i = 0; i < markets.length; i++) {
    const market = markets[i];
    console.log(`[${i + 1}/${markets.length}] Processing: ${market.question?.substring(0, 50)}...`);
    
    const yesTokenId = market.clobTokenIds?.[0];
    const noTokenId = market.clobTokenIds?.[1];
    
    // Fetch additional data in parallel
    const [orderbook, midpointData, lastTradeData, feeData] = await Promise.all([
      getOrderbook(yesTokenId),
      getMidpoint(yesTokenId),
      getLastTradePrice(yesTokenId),
      getFeeRate(yesTokenId)
    ]);
    
    // Calculate metrics
    const metrics = calculateMetrics(market, orderbook, midpointData, lastTradeData, feeData);
    
    // Calculate scores
    const scores = calculateScore(metrics);
    
    // Generate reason
    const reason = generateReason(metrics, scores);
    
    results.push({
      rank: 0, // will be assigned after sorting
      ...metrics,
      scores,
      reason
    });
  }
  
  // Sort by total score descending
  results.sort((a, b) => b.scores.total - a.scores.total);
  
  // Assign ranks
  results.forEach((r, i) => r.rank = i + 1);
  
  // Take top N
  const topResults = results.slice(0, TOP_N);
  console.log(`[INFO] Selected top ${topResults.length} candidates`);
  
  // Generate output files
  const today = new Date().toISOString().split('T')[0];
  const outputDir = join(__dirname, '..', 'poly-knowledge', 'outputs');
  
  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // JSON output
  const jsonPath = join(outputDir, `watchlist-${today}.json`);
  const jsonOutput = {
    generated_at: new Date().toISOString(),
    total_candidates: markets.length,
    top_n: TOP_N,
    scoring_weights: SCORING_WEIGHTS,
    watchlist: topResults
  };
  writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
  console.log(`[OUTPUT] JSON: ${jsonPath}`);
  
  // Markdown output
  const mdPath = join(outputDir, `watchlist-${today}.md`);
  let md = `# Daily Watchlist - ${today}\n\n`;
  md += `> Generated: ${new Date().toISOString()}\n`;
  md += `> Total candidates: ${markets.length}\n`;
  md += `> Scoring weights: liquidity=${SCORING_WEIGHTS.liquidity}, spread=${SCORING_WEIGHTS.spread}, ...\n\n`;
  
  md += `## Top ${topResults.length} Candidates\n\n`;
  md += `| # | Question | Probability | Spread | Liquidity | Days to Event | Score | Reason |\n`;
  md += `|---|----------|-------------|--------|-----------|---------------|-------|--------|\n`;
  
  for (const item of topResults) {
    const prob = item.implied_probability ? `${(item.implied_probability * 100).toFixed(1)}%` : 'N/A';
    const spread = item.spread_pct !== null ? `${item.spread_pct.toFixed(1)}%` : 'N/A';
    const liq = item.liquidity ? `$${Math.round(item.liquidity).toLocaleString()}` : 'N/A';
    const days = item.days_to_event !== null ? `${item.days_to_event.toFixed(0)}d` : 'N/A';
    const question = item.question?.substring(0, 40) || 'N/A';
    
    md += `| ${item.rank} | ${question}... | ${prob} | ${spread} | ${liq} | ${days} | **${item.scores.total.toFixed(1)}** | ${item.reason} |\n`;
  }
  
  md += `\n## Score Breakdown\n\n`;
  md += `| Rank | Liquidity | Spread | Volatility | Settlement | Calendar | Hedgeability | Risk | Total |\n`;
  md += `|------|-----------|--------|------------|------------|----------|--------------|------|-------|\n`;
  
  for (const item of topResults) {
    md += `| ${item.rank} | ${item.scores.liquidity_score} | ${item.scores.spread_score} | ${item.scores.volatility_score} | ${item.scores.settlement_clarity_score} | ${item.scores.event_calendar_score} | ${item.scores.hedgeability_score} | ${item.scores.risk_level_score} | **${item.scores.total.toFixed(1)}** |\n`;
  }
  
  md += `\n## Methodology\n\n`;
  md += `- Data source: Gamma API (markets) + CLOB API (orderbook, midpoints, last-trade, fee-rate)\n`;
  md += `- Metrics: implied_probability, spread (bid-ask), depth_proxy, days_to_event, fee_rate\n`;
  md += `- Scoring: weights from watchlist-scoring.yaml\n`;
  md += `- Read-only, no trading, no signatures\n`;
  
  writeFileSync(mdPath, md);
  console.log(`[OUTPUT] Markdown: ${mdPath}`);
  
  console.log('=== Done ===');
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});

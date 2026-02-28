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

import { writeFileSync, mkdirSync, existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 导入结算口径解析器
import { parseRules as parseResolutionRules } from './parse-resolution-rules.mjs';

// === CONFIG ===
const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';
const DEFAULT_LIMIT = 50;
const DEFAULT_MIN_LIQUIDITY = 1000;
const TOP_N = 30;
const WEATHER_QUOTA = 5; // 主 watchlist 中保留的天气席位数（仅 weather，不含 aviation）

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

// === TOKEN ID HELPERS ===
function normalizeClobTokenIds(clobTokenIds) {
  if (!clobTokenIds) return [];
  if (Array.isArray(clobTokenIds)) return clobTokenIds;
  if (typeof clobTokenIds === 'string') {
    try {
      const parsed = JSON.parse(clobTokenIds);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function extractTokenIds(market) {
  const tokenIds = normalizeClobTokenIds(market?.clobTokenIds);
  const yesTokenId = tokenIds[0] && typeof tokenIds[0] === 'string' && tokenIds[0].startsWith('0x') ? tokenIds[0] : null;
  const noTokenId = tokenIds[1] && typeof tokenIds[1] === 'string' && tokenIds[1].startsWith('0x') ? tokenIds[1] : null;
  return { tokenIds, yesTokenId, noTokenId };
}

// === API CALLS ===
async function getMarkets(minLiquidity = DEFAULT_MIN_LIQUIDITY, limit = DEFAULT_LIMIT) {
  const url = `${GAMMA_API}/markets?closed=false&liquidity_num_min=${minLiquidity}&order=volume&limit=${limit}`;
  console.log(`[API] Fetching markets from Gamma: ${url}`);
  return fetchJSON(url);
}

// === WEATHER MARKETS SEED FILE LOADING ===
function loadWeatherMarketsSeed() {
  const seedPath = join(__dirname, '..', 'poly-knowledge', 'outputs', 'weather-markets-seed.json');
  
  if (!existsSync(seedPath)) {
    console.log(`[INFO] Weather seed file not found: ${seedPath}`);
    return null;
  }
  
  try {
    const content = readFileSync(seedPath, 'utf-8');
    const seedData = JSON.parse(content);
    console.log(`[INFO] Loaded ${seedData.length} weather events from seed file`);
    
    // Transform seed data to market format
    const markets = [];
    for (const event of seedData) {
      // Add each active market from the event
      if (event.markets) {
        for (const market of event.markets) {
          if (!market.closed) {
            markets.push({
              id: market.id,
              question: market.question,
              conditionId: market.conditionId,
              slug: market.slug,
              volume: market.volume,
              liquidity: market.volume * 0.1, // Estimate
              clobTokenIds: [],
              startDate: event.startDate,
              endDate: market.endDate,
              acceptingOrders: !market.closed,
              negRisk: true,
              tags: event.tags || ['weather'],
              _source: 'weather-seed',
              _eventTitle: event.eventTitle,
              _eventSlug: event.eventSlug
            });
          }
        }
      }
    }
    
    console.log(`[INFO] Extracted ${markets.length} active weather markets from seed`);
    return markets;
  } catch (e) {
    console.error(`[ERROR] Failed to load weather seed file: ${e.message}`);
    return null;
  }
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
    conditionId: market.conditionId || null,
    slug: market.slug || null,
    url: market.slug ? `https://polymarket.com/market/${market.slug}` : null,
    question: market.question,
    description: market.description || '',
    
    // From Gamma API
    volume: parseFloat(market.volume) || 0,
    liquidity: parseFloat(market.liquidity) || 0,
    clobTokenIds: extractTokenIds(market).tokenIds,
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
  const { yesTokenId, noTokenId } = extractTokenIds(market);
  
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

// === WEATHER SIGNAL SCORING (imported from score-weather-signals.mjs logic) ===
const WEATHER_SIGNAL_WEIGHTS = {
  recency: 0.30,
  model_agreement: 0.30,
  volatility: 0.20,
  data_gap_risk: 0.20
};

const RECENCY_THRESHOLDS = {
  max: 24,
  optimal: 1
};

function calculateWeatherSignalScore(item, sources) {
  // Only score weather/aviation categories
  if (item.category !== 'weather' && item.category !== 'aviation') {
    return null;
  }
  
  const now = new Date();
  
  // Get stations data from sources
  const weatherStations = sources?.data?.weather?.stations || [];
  const aviationAirports = sources?.data?.aviation?.airports || [];
  
  // Determine relevant stations based on category
  const relevantStations = item.category === 'weather' ? weatherStations : aviationAirports;
  
  if (relevantStations.length === 0) {
    return null;
  }
  
  // 1. Recency score - based on sources generated_at
  let observationTime = now;
  if (sources?.generated_at) {
    observationTime = new Date(sources.generated_at);
  }
  
  const hoursDiff = (now - observationTime) / (1000 * 60 * 60);
  let recencyScore;
  if (hoursDiff <= RECENCY_THRESHOLDS.optimal) {
    recencyScore = 10;
  } else if (hoursDiff >= RECENCY_THRESHOLDS.max) {
    recencyScore = 0;
  } else {
    recencyScore = 10 * (1 - (hoursDiff - RECENCY_THRESHOLDS.optimal) / 
      (RECENCY_THRESHOLDS.max - RECENCY_THRESHOLDS.optimal));
  }
  recencyScore = Math.round(recencyScore * 10) / 10;
  
  // 2. Model agreement score - temperature stdDev across stations
  let modelAgreementScore = 5;
  if (item.category === 'weather' && relevantStations.length >= 2) {
    const temps = [];
    for (const s of relevantStations) {
      const obs = s.observations?.[0];
      if (obs?.temperature?.value_f !== undefined) {
        temps.push(obs.temperature.value_f);
      }
    }
    
    if (temps.length >= 2) {
      const mean = temps.reduce((a, b) => a + b, 0) / temps.length;
      const variance = temps.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / temps.length;
      const stdDev = Math.sqrt(variance);
      
      if (stdDev <= 2) modelAgreementScore = 10;
      else if (stdDev >= 15) modelAgreementScore = 0;
      else modelAgreementScore = 10 * (1 - (stdDev - 2) / 13);
      modelAgreementScore = Math.round(modelAgreementScore * 10) / 10;
    }
  }
  
  // 3. Volatility score - forecast diversity
  let volatilityScore = 5;
  if (item.category === 'weather' && relevantStations.length >= 2) {
    const forecasts = [];
    for (const s of relevantStations) {
      if (s.forecast && s.forecast.length > 0) {
        forecasts.push(...s.forecast.slice(0, 6).map(f => f.shortForecast));
      }
    }
    
    if (forecasts.length > 0) {
      const unique = new Set(forecasts).size;
      const diversity = unique / forecasts.length;
      
      if (diversity <= 0.2) volatilityScore = 10;
      else if (diversity >= 0.8) volatilityScore = 0;
      else volatilityScore = 10 * (1 - (diversity - 0.2) / 0.6);
      volatilityScore = Math.round(volatilityScore * 10) / 10;
    }
  }
  
  // 4. Data gap risk score
  const stationsWithData = relevantStations.filter(s => 
    (s.observations && s.observations.length > 0) || 
    (s.forecast && s.forecast.length > 0)
  ).length;
  
  const coverageRatio = stationsWithData / relevantStations.length;
  
  function calcCoverageScore(ratio) {
    if (ratio >= 1) return 10;
    if (ratio <= 0.5) return 5;
    return 5 + (ratio - 0.5) * 10;
  }
  
  let dataGapRiskScore = Math.round(calcCoverageScore(coverageRatio) * 10) / 10;
  
  // Calculate total
  const totalScore = 
    recencyScore * WEATHER_SIGNAL_WEIGHTS.recency +
    modelAgreementScore * WEATHER_SIGNAL_WEIGHTS.model_agreement +
    volatilityScore * WEATHER_SIGNAL_WEIGHTS.volatility +
    dataGapRiskScore * WEATHER_SIGNAL_WEIGHTS.data_gap_risk;
  
  const weatherSignalScore = Math.round(totalScore * 10) / 10;
  
  return {
    weather_signal_score: weatherSignalScore,
    weather_signal_components: {
      recency: { score: recencyScore, hours_ago: Math.round(hoursDiff * 10) / 10 },
      model_agreement: { score: modelAgreementScore },
      volatility: { score: volatilityScore },
      data_gap_risk: { score: dataGapRiskScore }
    }
  };
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

// === RESEARCH PRIORITY & TRADE FEASIBILITY ===
// Determine trade feasibility based on liquidity and spread
function getTradeFeasibility(metrics) {
  const liquidity = metrics.liquidity || 0;
  const spread = metrics.spread_pct || 999;
  
  // Trade feasibility: good/ok/poor
  if (liquidity >= 10000 && spread <= 3) {
    return 'good';
  } else if (liquidity >= 5000 || spread <= 5) {
    return 'ok';
  } else {
    return 'poor';
  }
}

// Determine whether the parsed station is covered by our integrated sources (stations.yaml + weather-aviation-sources)
function hasStationMatch(resolutionParsed, sources) {
  if (!resolutionParsed || !sources) return false;

  const icao = resolutionParsed.station?.icao;
  const stationName = resolutionParsed.station?.name;
  if (!icao && !stationName) return false;

  const weatherStations = sources?.data?.weather?.stations || [];
  const aviationAirports = sources?.data?.aviation?.airports || [];

  // Match ICAO against aviation airports
  if (icao) {
    const matchAviation = aviationAirports.some(a => (a.airport?.icao || '').toUpperCase() === icao.toUpperCase());
    const matchWeather = weatherStations.some(s => (s.station?.id || '').toUpperCase() === icao.toUpperCase());
    return matchAviation || matchWeather;
  }

  // Fallback: name match (weak)
  const nameLower = String(stationName).toLowerCase();
  const matchAviationByName = aviationAirports.some(a => String(a.airport?.name || '').toLowerCase().includes(nameLower));
  const matchWeatherByName = weatherStations.some(s => String(s.station?.name || '').toLowerCase().includes(nameLower));
  return matchAviationByName || matchWeatherByName;
}

function actionToResearchPriority(action) {
  if (action === '研究-重点') return 'high';
  if (action === '研究-跟踪') return 'medium';
  if (action === '研究-观察') return 'low';
  return null;
}

// Weather/aviation uses research-first action labels (not liquidity-gated)
function getWeatherAviationAction({ metrics, resolutionParsed, stationMatched, weatherSignalScore }) {
  const daysToEvent = metrics.days_to_event;

  // Avoid: expired or clearly unworkable
  if (daysToEvent !== null && daysToEvent < 0) return '避免';

  const parseWeak = !resolutionParsed || (resolutionParsed.overall_confidence ?? 0) < 0.3;
  const noIntegratedData = !stationMatched;

  // "规则无法解析且无数据源" -> avoid
  // Note: even without an exact station match, we still keep most weather markets as researchable
  // (fallback sources exist). Only hard-avoid when signal is also effectively absent.
  if (parseWeak && noIntegratedData && weatherSignalScore < 1) return '避免';

  // Thresholds (can be tuned later)
  const HIGH = 7;
  const MID = 5;

  const hasKeyFields = !!resolutionParsed && (
    (resolutionParsed.overall_confidence ?? 0) >= 0.5 ||
    ((resolutionParsed.station?.confidence || 0) > 0 && (resolutionParsed.metric?.confidence || 0) > 0)
  );

  // 研究-重点：关键字段 OR stations 匹配成功 且 weather_signal_score>=阈值 且 T-72h 内
  if ((hasKeyFields || stationMatched) && weatherSignalScore >= HIGH && daysToEvent !== null && daysToEvent <= 3) {
    return '研究-重点';
  }

  // 研究-跟踪：weather_signal_score 中等 或 T-7d 内
  if (weatherSignalScore >= MID || (daysToEvent !== null && daysToEvent <= 7)) {
    return '研究-跟踪';
  }

  // 研究-观察：其余仍可研究
  return '研究-观察';
}

// === 可执行清单生成 ===
// 基于市场类别生成模板化的 action, entry_plan, key_risks, monitor_sources, thesis

// 类别关键词匹配 - 优先精确匹配 weather/aviation
const CATEGORY_PATTERNS = {
  // Weather: 天气相关
  weather: /\b(weather|temperature|温度|降雨|rain|雪|snow|风暴|storm|台风|hurricane|飓风|typhoon|地震|earthquake|洪水|flood|干旱|drought|风|wind|能见度|visibility|气压|pressure|湿度|humidity|预警|warning|alert)\b/i,
  // Aviation: 航空相关
  aviation: /\b(flight|航班|airport|机场|airline|航空|delay|延误|cancel|取消|metar|taf|起降|landing|takeoff|飞行)\b/i,
  // Politics
  politics: /选举|election|总统|president|首相|minister|国会|congress|parliament|公投|referendum|政策|policy|法案|bill|协议|treaty|战争|war|冲突|conflict|制裁|sanction|外交|diplomacy|官员|official|政府|government|民调|poll|候选人|candidate|投票|vote/i,
  // Crypto
  crypto: /比特币|bitcoin|btc|以太坊|ethereum|eth|加密|crypto|币安|binance|coinbase|以太|ether|token|区块链|blockchain|sec|fda|批准|approval|etf|现货|spot|dogecoin|solana|bnb/i,
  // Sports
  sports: /足球|football|soccer|篮球|basketball|nba|网球|tennis|棒球|baseball|高尔夫|golf|赛车|racing|f1|nfl|冰球|hockey|比赛|match|game|联赛|league|赛季|season|冠军|champion|ufc|mma|boxing|拳击|排球|volleyball|橄榄球|rugby|cricket|板球|khl|nhl|mlb|温网|djokovic|federer|nadal|选手|team|队|vs|对|得分|得分|进球|goal|进球/i,
  // Entertainment
  entertainment: /电影|movie|奥斯卡|oscar|金球奖|grammy|艾美奖|emmys|音乐|music|奖项|award|综艺|show|剧集|series|netflix|票房|box office|演唱会|concert|Bruno Mars|明星|celebrity/i,
  // Economy
  economy: /gdp|cpi|ppi|失业率|unemployment|利率|interest rate|美联储|fed|央行|central bank|通胀|inflation|非农|nonfarm|零售|sales|经济|economy|pce|房价|housing|消费者|consumer/i
};

// 优先识别 weather/aviation
function detectCategory(question) {
  if (CATEGORY_PATTERNS.aviation.test(question)) return 'aviation';
  if (CATEGORY_PATTERNS.weather.test(question)) return 'weather';
  for (const [category, pattern] of Object.entries(CATEGORY_PATTERNS)) {
    if (category !== 'weather' && category !== 'aviation' && pattern.test(question)) {
      return category;
    }
  }
  return 'unknown';
}

async function generateExecutableCard(metrics, scores, sources = null, weatherSignal = null) {
  const question = metrics.question || '';
  const description = metrics.description || '';  // 结算规则文本
  const category = detectCategory(question);
  
  // 风险等级
  const riskLevel = metrics.risk === 'low' ? '低风险' : metrics.risk === 'medium' ? '中等风险' : '高风险';
  
  // 临近结算时间
  const settlementTime = metrics.days_to_event !== null 
    ? `${metrics.days_to_event.toFixed(0)}天后` 
    : '未知';
  
  // 模板化内容
  let action, entry_plan, key_risks, monitor_sources, thesis;
  
  // 基础变量
  const daysToEvent = metrics.days_to_event;
  const liquidity = metrics.liquidity || 0;
  const hasLiquidity = liquidity >= 10000;
  
  // 计算 trade_feasibility
  const trade_feasibility = getTradeFeasibility(metrics);

  // === 结算口径解析 ===
  // 尝试从 description 中解析结算规则
  let resolution = null;
  if (description && (category === 'weather' || category === 'aviation')) {
    try {
      resolution = await parseResolutionRules(description, question);
    } catch (e) {
      console.warn(`[WARN] Resolution parser failed: ${e.message}`);
      resolution = null;
    }
  }
  
  // 先计算默认 action，后续 weather/aviation 会覆盖
  let defaultAction;
  if (scores.total >= 8.5) {
    defaultAction = '⭐ 重点关注 - 可考虑入场';
  } else if (scores.total < 5) {
    defaultAction = '⚠️ 低优先级 - 建议跳过';
  } else {
    defaultAction = '观察 - 等待催化剂';
  }
  
  switch (category) {
    // === WEATHER 专用模板 (使用 weather-aviation-sources) ===
    case 'weather': {
      const wTimeAction = (daysToEvent !== null && daysToEvent <= 1) ? '⚡ T-24h 内：密切监控' :
                          (daysToEvent !== null && daysToEvent <= 3) ? '🔄 T-72h：开始跟踪' : '👀 T+3d：观察等待';
      
      // Extract station info from sources if available
      let stationList = [];
      let weatherGeneratedAt = null;
      let specificSources = [];
      
      if (sources?.data?.weather) {
        weatherGeneratedAt = sources.data.weather.generatedAt;
        if (sources.data.weather.stations) {
          stationList = sources.data.weather.stations.map(s => ({
            id: s.station?.id,
            name: s.station?.name,
            gridId: s.station?.grid?.gridId,
            forecastUrl: s.station?.grid?.forecastUrl
          })).filter(s => s.id);
          
          specificSources = stationList.map(s => 
            `• ${s.name} (${s.id}): ${s.forecastUrl}`
          );
        }
      }
      
      const dataRef = weatherGeneratedAt 
        ? `数据更新: ${new Date(weatherGeneratedAt).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`
        : '';
      
      const wCheckTiming = (daysToEvent !== null && daysToEvent <= 1) 
        ? `T-6h: 检查最新预报更新；T-1h: 确认最终数据。${dataRef}`
        : (daysToEvent !== null && daysToEvent <= 3) 
          ? `T-24h: 每日检查 NOAA/NWS 更新；T-6h: 确认预报收敛。${dataRef}`
          : '每周检查模型更新，关注预报趋势收敛情况';
      
      // Weather/aviation uses research-focused action labels (set later based on research_priority)
      action = wTimeAction; // Will be overridden by research_priority later
      entry_plan = `${wCheckTiming}。流动性 ${trade_feasibility === 'good' ? '充足(>$10k)' : trade_feasibility === 'ok' ? '一般($5-10k)' : '较低(<$5k)'}，建议先做研究，spread=${metrics.spread_pct?.toFixed(1) || 'N/A'}% 可接受时再入场。`;
      
      key_risks = [
        '⚠️ 模型漂移：数值预报随时间剧烈调整',
        '⚠️ 结算口径：部分市场按站点平均，部分按特定站点',
        '⚠️ 数据中断：NOAA/ECMWF 数据接口临时不可用',
        '⚠️ 黑天鹅：极端天气事件超出模型预测范围'
      ];
      
      // Enhanced monitor_sources with specific stations
      if (specificSources.length > 0) {
        monitor_sources = [
          '=== 实时数据源 (已接入 weather-aviation-sources) ===',
          ...specificSources.slice(0, 5),
          '=== 备用/验证源 ===',
          'NOAA/NWS weather.gov - 官方预报',
          'ECMWF europepm.eu - 欧洲中期预报',
          'GFS NCEP - 美国全球预报系统',
          'Weather.com / AccuWeather - 辅助验证'
        ];
      } else {
        monitor_sources = [
          'NOAA/NWS weather.gov - 官方预报',
          'ECMWF europepm.eu - 欧洲中期预报',
          'GFS NCEP - 美国全球预报系统',
          'Weather.com / AccuWeather - 辅助验证'
        ];
      }
      
      thesis = `天气类市场依赖气象数据结算，${settlementTime}到期。${stationList.length > 0 ? `已接入 ${stationList.length} 个气象站: ${stationList.map(s => s.id).join(', ')}` : '需跟踪 NOAA/NWS 预报更新'}，关注模型收敛情况。`;
      break;
    }
    
    // === AVIATION 专用模板 (使用 weather-aviation-sources) ===
    case 'aviation': {
      const isFlight = /delay|cancel|延误|取消/i.test(question);
      
      // Extract airport info from sources if available
      let airportList = [];
      let aviationGeneratedAt = null;
      let specificSources = [];
      
      if (sources?.data?.aviation) {
        aviationGeneratedAt = sources.data.aviation.generatedAt;
        if (sources.data.aviation.airports) {
          airportList = sources.data.aviation.airports.map(a => ({
            icao: a.airport?.icao,
            iata: a.airport?.iata,
            name: a.airport?.name,
            metarTime: a.metar?.observationTime,
            metarUrl: a.metar?.rawProperties?.['@id'],
            tafUrl: a.taf ? `https://api.weather.gov/stations/${a.airport?.icao}/tafs` : null,
            flightAwareUrl: a.airport?.icao ? `https://flightaware.com/live/airport/${a.airport.icao}` : null,
            fr24Url: a.airport?.iata ? `https://www.flightradar24.com/${a.airport.iata}` : null
          })).filter(a => a.icao);
          
          specificSources = airportList.map(a => {
            let src = `• ${a.name} (${a.icao}/${a.iata})`;
            if (a.metarTime) {
              src += ` | METAR: ${new Date(a.metarTime).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`;
            }
            return src;
          });
        }
      }
      
      const dataRef = aviationGeneratedAt 
        ? `METAR/TAF更新: ${new Date(aviationGeneratedAt).toLocaleString('zh-CN', {timeZone: 'Asia/Shanghai'})}`
        : '';
      
      const aCheckTiming = (daysToEvent !== null && daysToEvent <= 1) 
        ? `T-6h: METAR/TAF 最新报；T-2h: 确认最终航班状态。${dataRef}`
        : (daysToEvent !== null && daysToEvent <= 3) 
          ? `T-24h: 每日检查 METAR/TAF 趋势；T-6h: 确认预报稳定。${dataRef}`
          : '每周检查天气趋势，关注预报调整';
      
      // Aviation uses research-focused action labels (set later based on research_priority)
      action = isFlight ? '✈️ 航班关注' : '🛫 机场关注';
      entry_plan = `${aCheckTiming}。流动性 ${trade_feasibility === 'good' ? '充足' : trade_feasibility === 'ok' ? '一般' : '较低'}，建议先做研究。`;
      
      key_risks = [
        '⚠️ 结算口径：部分按实际起飞/到达，部分按预判',
        '⚠️ 航司决策：航空公司临时换飞机/改航线影响结果',
        '⚠️ 多变天气：机场天气波动大，预报不准',
        '⚠️ 数据延迟：METAR/TAF 可能有 10-30min 延迟'
      ];
      
      // Enhanced monitor_sources with specific airports and tracking links
      if (specificSources.length > 0 || airportList.length > 0) {
        const trackingLinks = airportList.slice(0, 5).map(a => 
          `• ${a.icao}: [FlightAware](${a.flightAwareUrl}) | [FR24](${a.fr24Url})`
        );
        
        monitor_sources = [
          '=== 实时数据源 (已接入 weather-aviation-sources) ===',
          ...specificSources.slice(0, 5),
          '=== 航班追踪 ===',
          ...trackingLinks,
          '=== 备用/验证源 ===',
          'AVWX / NOAA METAR/TAF - 机场天气报文',
          '航司官网 (UA/AA/DL/Southwest) - 公告'
        ];
      } else {
        monitor_sources = [
          'FlightAware flightaware.com - 航班追踪',
          'Flightradar24 fr24.com - 实时航班',
          'AVWX / NOAA METAR/TAF - 机场天气报文',
          '航司官网 (UA/AA/DL/Southwest) - 公告'
        ];
      }
      
      thesis = `航空类市场依赖 METAR/TAF 结算，${settlementTime}到期。${airportList.length > 0 ? `已接入 ${airportList.length} 个机场: ${airportList.map(a => a.icao).join(', ')}` : '关注机场天气数据'}，${isFlight ? '航班状态' : '机场天气'}数据源和结算规则。`;
      break;
    }
      
    case 'politics':
      action = '观察 - 等待新闻催化剂';
      entry_plan = `等待官方声明/新闻发布，评分≥8.5且流动性充足时可考虑`;
      key_risks = [
        '政策黑天鹅 - 突发公告逆转市场',
        '结算规则不明确引发争议',
        '民调与结果背离'
      ];
      monitor_sources = [
        'Reuters / AP News',
        'Bloomberg Politics',
        '官方政府网站',
        'Twitter/X 实时新闻'
      ];
      thesis = `政治类市场受新闻催化剂驱动，${settlementTime}到期。注意结算规则和潜在黑天鹅。`;
      break;
      
    case 'crypto':
      action = '观察 - 等待价格信号';
      entry_plan = `设置价格警报，突破关键阻力位且流动性充足时快速入场，持有期≤24小时`;
      key_risks = [
        'SEC/FDA 等机构突发审批决定',
        '巨鲸操作导致价格剧烈波动',
        '交易所技术故障',
        '波动性过高导致点差扩大'
      ];
      monitor_sources = [
        'CoinGecko / CoinMarketCap 实时价格',
        'TradingView 技术分析',
        'SEC/FDA 官方公告',
        'Twitter/X 加密社区'
      ];
      thesis = `加密市场波动性高，${settlementTime}到期。需关注价格源和时间窗口，防止极端波动。`;
      break;
      
    case 'sports':
      action = '观察 - 等待比赛结果';
      entry_plan = `比赛开始前1小时检查赔率变化，流动性充足时可赛前对冲`;
      key_risks = [
        '比赛推迟/取消',
        '球员伤病突发',
        '裁判判罚争议',
        '加时赛/点球决胜'
      ];
      monitor_sources = [
        'ESPN / 官方联赛网站',
        'Flashscore 实时比分',
        'Twitter 体育记者',
        '赔率对比（Oddschecker）'
      ];
      thesis = `体育类市场结算清晰，${settlementTime}到期。需关注比赛实际结果和潜在中断。`;
      break;
      
    case 'entertainment':
      action = '观察 - 等待颁奖/发布';
      entry_plan = `颁奖典礼前24小时关注赔率走势，流动性充足时可适度参与`;
      key_risks = [
        '奖项结果与市场预期不符',
        '颁奖典礼延期',
        '投票舞弊争议'
      ];
      monitor_sources = [
        'IMDb 官方信息',
        'Deadline / Hollywood Reporter',
        'Twitter 实时讨论',
        '预测网站共识'
      ];
      thesis = `娱乐类市场依赖评委/观众投票，${settlementTime}到期。关注市场共识与实际结果偏离。`;
      break;
      
    case 'economy':
      action = '观察 - 等待数据发布';
      entry_plan = `数据发布前30分钟检查市场流动性，数据公布后快速反应`;
      key_risks = [
        '数据大幅超出/低于预期',
        '美联储官员讲话鹰鸽意外',
        '市场已定价导致买盘衰竭',
        '数据修正'
      ];
      monitor_sources = [
        'Bloomberg Economic Calendar',
        '美联储官方声明',
        'Trading Economics',
        'Reuters 经济数据'
      ];
      thesis = `经济数据市场受宏观事件驱动，${settlementTime}到期。需关注数据发布时间和预期差。`;
      break;
      
    default:
      action = '观察 - 需进一步研究';
      entry_plan = `评分≥7.0且流动性允许时可小额测试，设定5%止损线`;
      key_risks = [
        '结算规则不明确',
        '流动性枯竭',
        '未知黑天鹅事件'
      ];
      monitor_sources = [
        'Polymarket 市场讨论',
        'Google 新闻搜索',
        'Reddit 相关社区'
      ];
      thesis = `通用候选市场，${settlementTime}到期。需自行验证结算规则和监控源。`;
  }
  
  // 如果风险高，提醒
  if (metrics.negRisk || metrics.risk === 'high') {
    key_risks.push('⚠️ Neg Risk 市场 - 风险较高');
  }

  // 对于 weather/aviation：研究优先 action + 研究优先级字段 (high|medium|low)
  let research_priority = null;
  if (category === 'weather' || category === 'aviation') {
    const weatherSignalScore = weatherSignal?.weather_signal_score ?? 0;
    const stationMatched = hasStationMatch(resolution, sources);

    const researchAction = getWeatherAviationAction({
      metrics,
      resolutionParsed: resolution,
      stationMatched,
      weatherSignalScore
    });

    action = researchAction;
    research_priority = actionToResearchPriority(researchAction);
  }

  return {
    category,
    action,
    research_priority,  // 新增: high|medium|low (仅 weather/aviation)
    trade_feasibility, // 新增: good|ok|poor
    entry_plan,
    key_risks,
    monitor_sources,
    thesis,
    // 添加解析结果到返回对象，供后续使用
    resolution_parsed: resolution || null
  };
}

// === WEATHER-AVIATION SOURCES LOADING ===
function getLatestSourcesFile() {
  const outputDir = join(__dirname, '..', 'poly-knowledge', 'outputs');
  
  if (!existsSync(outputDir)) {
    console.log('[WARN] Output directory not found, skipping sources');
    return null;
  }
  
  const files = readdirSync(outputDir)
    .filter(f => f.startsWith('weather-aviation-sources-') && f.endsWith('.json'))
    .map(f => {
      const stats = statSync(join(outputDir, f));
      return { name: f, mtime: stats.mtime };
    })
    .sort((a, b) => b.mtime - a.mtime);
  
  if (files.length === 0) {
    console.log('[WARN] No weather-aviation-sources files found');
    return null;
  }
  
  const latestFile = files[0].name;
  console.log(`[INFO] Using sources file: ${latestFile}`);
  
  try {
    const content = readFileSync(join(outputDir, latestFile), 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    console.error(`[ERROR] Failed to load sources file: ${e.message}`);
    return null;
  }
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
  
  // Load weather-aviation sources (for weather/aviation category enhancement)
  const sources = getLatestSourcesFile();
  
  // Fetch markets from API
  let markets = await getMarkets(minLiquidity, limit);
  console.log(`[INFO] Fetched ${markets.length} markets from API`);
  
  // Always try to supplement with weather seed data for weather category coverage
  // This ensures weather markets are included even when API returns many markets
  console.log(`[INFO] Checking weather seed file for weather category coverage...`);
  const weatherSeedMarkets = loadWeatherMarketsSeed();
  if (weatherSeedMarkets && weatherSeedMarkets.length > 0) {
    // Add weather seed markets that aren't already in the list
    const existingIds = new Set(markets.map(m => m.id));
    const newWeatherMarkets = weatherSeedMarkets.filter(m => !existingIds.has(m.id));
    
    if (newWeatherMarkets.length > 0) {
      markets = [...markets, ...newWeatherMarkets];
      console.log(`[INFO] Added ${newWeatherMarkets.length} weather markets from seed file`);
    }
  }
  
  if (!markets || markets.length === 0) {
    console.error('[ERROR] No markets returned');
    process.exit(1);
  }
  
  // Process each market
  const results = [];
  for (let i = 0; i < markets.length; i++) {
    const market = markets[i];
    console.log(`[${i + 1}/${markets.length}] Processing: ${market.question?.substring(0, 50)}...`);
    
    const { yesTokenId, noTokenId } = extractTokenIds(market);
    
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
    
    // Pre-calc category (needed for weather signal scoring)
    const category = detectCategory(metrics.question || '');

    // Calculate weather signal score for weather/aviation categories (before action tagging)
    const weatherSignalResult = calculateWeatherSignalScore(
      { category, question: metrics.question },
      sources
    );

    // Generate executable card (可执行清单) - pass sources + weatherSignal
    const executable_card = await generateExecutableCard(metrics, scores, sources, weatherSignalResult);
    
    results.push({
      // Keep category consistent (detectCategory is the single source of truth)
      category,

      rank: 0, // will be assigned after sorting
      ...metrics,
      scores,
      reason,
      ...executable_card,
      ...(weatherSignalResult || {})
    });
  }
  
  // === RESEARCH PRIORITY ORDERING (for weather/aviation) ===
  const RESEARCH_PRIORITY_ORDER = {
    '研究-重点': 4,
    '研究-跟踪': 3,
    '研究-观察': 2,
    '避免': 1
  };
  
  // Helper: get research priority score (higher = more important)
  function getResearchPriorityScore(item) {
    if (item.category !== 'weather' && item.category !== 'aviation') {
      return -1; // Non-weather/aviation items
    }
    const label = item.action || '避免';
    return RESEARCH_PRIORITY_ORDER[label] || 0;
  }
  
  // Helper: get weather signal score (default 0)
  function getWeatherSignalScore(item) {
    return item.weather_signal_score || 0;
  }
  
  // === SEPARATE AND SORT ===
  // Separate weather from other categories
  const weatherOnly = results.filter(r => r.category === 'weather');
  const otherMarkets = results.filter(r => r.category !== 'weather');
  
  // Sort weather: research action label + weather_signal_score
  weatherOnly.sort((a, b) => {
    const priorityDiff = getResearchPriorityScore(b) - getResearchPriorityScore(a);
    if (priorityDiff !== 0) return priorityDiff;
    
    const weatherScoreDiff = getWeatherSignalScore(b) - getWeatherSignalScore(a);
    if (weatherScoreDiff !== 0) return weatherScoreDiff;
    
    // Fallback: total score, then liquidity
    const totalScoreDiff = b.scores.total - a.scores.total;
    if (Math.abs(totalScoreDiff) >= 0.3) return totalScoreDiff;
    
    return (b.liquidity || 0) - (a.liquidity || 0);
  });
  
  // Sort other markets: total score + weather_signal_score as tie-breaker
  otherMarkets.sort((a, b) => {
    const scoreDiff = b.scores.total - a.scores.total;
    
    // If score difference is significant (>0.3), use primary score
    if (Math.abs(scoreDiff) >= 0.3) {
      return scoreDiff;
    }
    
    // Tie-breaker: use weather_signal_score if available
    const aWeatherScore = a.weather_signal_score || 0;
    const bWeatherScore = b.weather_signal_score || 0;
    
    if (aWeatherScore !== bWeatherScore) {
      return bWeatherScore - aWeatherScore; // Higher weather signal score wins
    }
    
    // Fallback to liquidity
    return (b.liquidity || 0) - (a.liquidity || 0);
  });
  
  // === MERGE WITH WEATHER QUOTA ===
  // Take top (N - WEATHER_QUOTA) from others + top WEATHER_QUOTA from weather
  const otherTop = otherMarkets.slice(0, Math.max(0, TOP_N - WEATHER_QUOTA));
  const weatherTop = weatherOnly.slice(0, WEATHER_QUOTA);
  
  // Merge and re-rank
  const mergedResults = [...otherTop, ...weatherTop];
  
  // Re-rank by sorting: total score (primary), then weather_signal_score as tie-breaker
  mergedResults.sort((a, b) => {
    const scoreDiff = b.scores.total - a.scores.total;
    if (Math.abs(scoreDiff) >= 0.3) return scoreDiff;
    
    // Tie-breaker: weather signal score
    const aWeatherScore = a.weather_signal_score || 0;
    const bWeatherScore = b.weather_signal_score || 0;
    if (aWeatherScore !== bWeatherScore) return bWeatherScore - aWeatherScore;
    
    // For weather/aviation: also consider research priority
    const aPriority = getResearchPriorityScore(a);
    const bPriority = getResearchPriorityScore(b);
    if (aPriority !== bPriority) return bPriority - aPriority;
    
    return (b.liquidity || 0) - (a.liquidity || 0);
  });
  
  // Assign final ranks
  mergedResults.forEach((r, i) => r.rank = i + 1);
  
  const topResults = mergedResults;
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
  
  // Count weather in top results
  const weatherCount = topResults.filter(r => r.category === 'weather').length;
  const aviationCount = topResults.filter(r => r.category === 'aviation').length;
  
  const jsonOutput = {
    generated_at: new Date().toISOString(),
    total_candidates: markets.length,
    top_n: TOP_N,
    weather_quota: WEATHER_QUOTA,
    weather_in_topN: weatherCount,
    aviation_in_topN: aviationCount,
    scoring_weights: SCORING_WEIGHTS,
    sources_integrated: sources ? {
      weather_stations: sources.summary?.weather_stations || 0,
      aviation_airports: sources.summary?.aviation_airports || 0,
      generated_at: sources.generated_at,
      date: sources.date
    } : null,
    watchlist: topResults
  };
  writeFileSync(jsonPath, JSON.stringify(jsonOutput, null, 2));
  console.log(`[OUTPUT] JSON: ${jsonPath}`);
  
  // Markdown output
  const mdPath = join(outputDir, `watchlist-${today}.md`);
  let md = `# Daily Watchlist - ${today}\n\n`;
  md += `> Generated: ${new Date().toISOString()}\n`;
  md += `> Total candidates: ${markets.length}\n`;
  md += `> TopN: ${TOP_N} (weather quota: ${WEATHER_QUOTA})\n`;
  md += `> Weather in Top${TOP_N}: ${weatherCount} (aviation: ${aviationCount})\n`;
  md += `> Scoring weights: liquidity=${SCORING_WEIGHTS.liquidity}, spread=${SCORING_WEIGHTS.spread}, ...\n`;
  if (sources) {
    md += `> Sources integrated: ${sources.summary?.weather_stations || 0} weather stations, ${sources.summary?.aviation_airports || 0} aviation airports\n`;
  } else {
    md += `> Sources integrated: none (fallback to templates)\n`;
  }
  md += `\n`;
  
  // 简表
  md += `## Top ${topResults.length} Candidates (Overview)\n\n`;
  md += `| # | Question | Prob | Spread | Liq | Days | Score | Weather Sig | Category | Action | Trade Fit |\n`;
  md += `|---|----------|------|--------|-----|------|-------|-------------|----------|--------|----------|\n`;
  
  for (const item of topResults) {
    const prob = item.implied_probability ? `${(item.implied_probability * 100).toFixed(1)}%` : 'N/A';
    const spread = item.spread_pct !== null ? `${item.spread_pct.toFixed(1)}%` : 'N/A';
    const liq = item.liquidity ? `$${Math.round(item.liquidity / 1000).toFixed(0)}k` : 'N/A';
    const days = item.days_to_event !== null ? `${item.days_to_event.toFixed(0)}d` : 'N/A';
    const question = item.question?.substring(0, 20) || 'N/A';
    const category = item.category || 'unknown';
    const action = item.action ? item.action.replace(/⭐|⚠️/g, '').substring(0, 12) : 'N/A';
    const weatherSig = item.weather_signal_score !== undefined ? `${item.weather_signal_score}` : '-';
    const tradeFeas = item.trade_feasibility || '-';
    
    md += `| ${item.rank} | ${question}... | ${prob} | ${spread} | ${liq} | ${days} | **${item.scores.total.toFixed(1)}** | ${weatherSig} | ${category} | ${action} | ${tradeFeas} |\n`;
  }
  
  // 详细可执行清单
  md += `\n---\n\n## 可执行清单 (Executable Checklist)\n\n`;
  
  for (const item of topResults) {
    const question = item.question || 'N/A';
    const prob = item.implied_probability ? `${(item.implied_probability * 100).toFixed(1)}%` : 'N/A';
    const liq = item.liquidity ? `$${Math.round(item.liquidity).toLocaleString()}` : 'N/A';
    const days = item.days_to_event !== null ? `${item.days_to_event.toFixed(0)}天` : '未知';
    const category = item.category || 'unknown';
    
    md += `### #${item.rank} ${question}\n\n`;
    md += `| Field | Value |\n`;
    md += `|-------|-------|\n`;
    md += `| **概率** | ${prob} |\n`;
    md += `| **流动性** | ${liq} |\n`;
    md += `| **到期时间** | ${days} |\n`;
    md += `| **类别** | ${category} |\n`;
    md += `| **评分** | ${item.scores.total.toFixed(1)}/10 |\n`;
    
    // Add weather signal score for weather/aviation
    if (item.weather_signal_score !== undefined) {
      const comp = item.weather_signal_components;
      md += `| **天气信号评分** | ${item.weather_signal_score}/10 (recency:${comp?.recency?.score || '-'}, agree:${comp?.model_agreement?.score || '-'}, vol:${comp?.volatility?.score || '-'}, gap:${comp?.data_gap_risk?.score || '-'}) |\n`;
    }
    
    md += `| **行动** | ${item.action || 'N/A'} |\n`;
    
    // Add research_priority for weather/aviation
    if (item.research_priority) {
      md += `| **研究优先级** | ${item.research_priority} |\n`;
    }
    
    // Add trade_feasibility
    md += `| **交易可行性** | ${item.trade_feasibility || 'N/A'} |\n`;
    
    md += `| **入场计划** | ${item.entry_plan || 'N/A'} |\n`;
    md += `| **理由** | ${item.thesis || item.reason || 'N/A'} |\n`;
    md += `| **Key Risks** | ${item.key_risks ? item.key_risks.join(', ') : 'N/A'} |\n`;
    md += `| **监控源** | ${item.monitor_sources ? item.monitor_sources.join(', ') : 'N/A'} |\n`;
    
    if (item.url) {
      md += `| **链接** | [Polymarket](${item.url}) |\n`;
    }
    md += `\n`;
  }
  
  md += `---\n\n## Methodology\n\n`;
  md += `- Data source: Gamma API (markets) + CLOB API (orderbook, midpoints, last-trade, fee-rate)\n`;
  md += `- Metrics: implied_probability, spread (bid-ask), depth_proxy, days_to_event, fee_rate\n`;
  md += `- Scoring: weights from watchlist-scoring.yaml\n`;
  md += `- Executable card: auto-generated based on category (weather/politics/crypto/sports/economy/unknown)\n`;
  md += `- Read-only, no trading, no signatures\n`;
  
  writeFileSync(mdPath, md);
  console.log(`[OUTPUT] Markdown: ${mdPath}`);
  
  console.log('=== Done ===');
}

main().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});

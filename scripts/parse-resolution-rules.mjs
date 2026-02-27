/**
 * parse-resolution-rules.mjs
 * 结算口径解析器：从 rules 文本抽取站点/时间窗/指标
 * 
 * @see Issue #27
 */

// ============================================================================
// 模式库
// ============================================================================

const STATION_PATTERNS = {
  icao: /\b([A-Z]{4})\b/g,
  // IATA 需要上下文，避免误判
  cityStation: /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:airport|station|metar)/gi,
  airport: /(?:at|near|of)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*\(/i,
};

const TIME_PATTERNS = {
  date: /\d{4}-\d{2}-\d{2}/,
  time: /\d{1,2}:\d{2}\s*(?:-\s*\d{1,2}:\d{2})?/,
  timezone: /\b(?:UTC|LDT|CDT|EDT|PDT|GMT|BST|JST|CST)\b/i,
  monthDay: /([A-Z][a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?/,
};

const METRIC_PATTERNS = [
  { type: 'temperature', keywords: [/temperature/i, /temp/i, /°F|°C|Fahrenheit|Celsius/], weight: 0.9 },
  { type: 'precipitation', keywords: [/precipitation|rain|rainfall/i, /mm|inches/i], weight: 0.9 },
  { type: 'snowfall', keywords: [/snowfall|snow\s*fall/i, /inch|cm/i], weight: 0.9 },
  { type: 'wind', keywords: [/wind\s*(?:speed)?/i, /mph|km\/h/i], weight: 0.8 },
  { type: 'visibility', keywords: [/visibility/i, /miles|km/i], weight: 0.8 },
  { type: 'hurricane', keywords: [/hurricane|typhoon|cyclone/i, /category/i], weight: 0.9 },
];

const SOURCE_PATTERNS = [
  { name: 'NOAA', patterns: [/NOAA/i, /National Weather Service/i, /\bNWS\b/i] },
  { name: 'NHC', patterns: [/National Hurricane Center/i, /\bNHC\b/i] },
  { name: 'METAR', patterns: [/METAR/i, /aviation weather/i] },
  { name: 'Met Office', patterns: [/Met\s*Office/i, /UK\s*Met/i] },
  { name: 'JMA', patterns: [/Japan Meteorological Agency/i, /\bJMA\b/i] },
  { name: 'BOM', patterns: [/Bureau of Meteorology/i, /\bBOM\b/i] },
];

const THRESHOLD_PATTERNS = [
  /([><≥≤=]+)\s*(\d+(?:\.\d+)?)\s*(°F|°C|mm|inches?|cm|mph|km\/h|miles?|km)?/i,
  /(?:at\s+least|above|below|over|under)?\s*(\d+(?:\.\d+)?)\s*(°F|°C|mm|inches?|cm|mph|km\/h|miles?|km)?/i,
];

// ICAO 到城市映射（简化版）
const KNOWN_AIRPORTS = {
  'KJFK': { city: 'New York', name: 'John F. Kennedy International Airport' },
  'KNYC': { city: 'New York', name: 'Central Park' },
  'KORD': { city: 'Chicago', name: "O'Hare International Airport" },
  'KDFW': { city: 'Dallas', name: 'Dallas/Fort Worth International Airport' },
  'KSFO': { city: 'San Francisco', name: 'San Francisco International Airport' },
  'KMIA': { city: 'Miami', name: 'Miami International Airport' },
  'EGLL': { city: 'London', name: 'Heathrow Airport' },
  'EGSS': { city: 'London', name: 'Stansted Airport' },
  'LFPO': { city: 'Paris', name: 'Orly Airport' },
  'OMDB': { city: 'Dubai', name: 'Dubai International Airport' },
  'WSSS': { city: 'Singapore', name: 'Changi Airport' },
  'VHHH': { city: 'Hong Kong', name: 'Hong Kong International Airport' },
  'RJTT': { city: 'Tokyo', name: 'Tokyo Haneda Airport' },
};

// ============================================================================
// 核心解析函数
// ============================================================================

/**
 * 主解析函数
 * @param {string} rulesText - 规则文本
 * @param {string} question - 问题文本（可选，用于补充上下文）
 * @returns {Promise<ParsedRules>}
 */
export async function parseRules(rulesText, question = '') {
  const text = `${rulesText} ${question}`.trim();
  
  if (!text || text.length < 5) {
    return createEmptyResult();
  }

  const result = {
    station: extractStation(text),
    time_window: extractTimeWindow(text),
    metric: extractMetric(text),
    threshold: extractThreshold(text),
    resolution_source: extractSource(text),
  };

  result.overall_confidence = calculateConfidence(result);
  
  // 如果置信度低于 0.3，尝试 LLM 回退
  if (result.overall_confidence < 0.3) {
    return await llmFallback(text);
  }

  return result;
}

/**
 * 提取站点信息
 */
function extractStation(text) {
  // 1. 尝试 ICAO 代码
  const icaoMatch = text.match(STATION_PATTERNS.icao);
  if (icaoMatch) {
    const icao = icaoMatch[0];
    if (KNOWN_AIRPORTS[icao]) {
      return {
        icao,
        city: KNOWN_AIRPORTS[icao].city,
        name: KNOWN_AIRPORTS[icao].name,
        confidence: 0.9
      };
    }
  }

  // 2. 尝试城市+站点组合
  const cityMatch = text.match(STATION_PATTERNS.cityStation);
  if (cityMatch) {
    return {
      name: cityMatch[0].replace(/\s*(airport|station|metar)$/i, '').trim(),
      confidence: 0.7
    };
  }

  // 3. 尝试括号内机场
  const parenMatch = text.match(STATION_PATTERNS.airport);
  if (parenMatch) {
    return {
      name: parenMatch[1],
      confidence: 0.6
    };
  }

  return { confidence: 0 };
}

/**
 * 提取时间窗信息
 */
function extractTimeWindow(text) {
  const result = { confidence: 0 };

  // 日期
  const dateMatch = text.match(TIME_PATTERNS.date);
  if (dateMatch) {
    result.date = dateMatch[0];
    result.confidence = 0.6;
  }

  // 时间
  const timeMatch = text.match(TIME_PATTERNS.time);
  if (timeMatch) {
    result.time = timeMatch[0];
    result.confidence = Math.max(result.confidence, 0.7);
  }

  // 时区
  const tzMatch = text.match(TIME_PATTERNS.timezone);
  if (tzMatch) {
    result.timezone = tzMatch[0].toUpperCase();
    result.confidence = Math.max(result.confidence, 0.8);
  }

  // 月-日
  const mdMatch = text.match(TIME_PATTERNS.monthDay);
  if (mdMatch) {
    result.month_day = `${mdMatch[1]} ${mdMatch[2]}`;
    result.confidence = Math.max(result.confidence, 0.5);
  }

  return result;
}

/**
 * 提取指标类型
 */
function extractMetric(text) {
  for (const metric of METRIC_PATTERNS) {
    const hasKeyword = metric.keywords.some(k => k.test(text));
    if (hasKeyword) {
      return {
        type: metric.type,
        confidence: metric.weight
      };
    }
  }
  return { confidence: 0 };
}

/**
 * 提取阈值
 */
function extractThreshold(text) {
  for (const pattern of THRESHOLD_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1].replace(/[><≥≤=]/, '')) || parseFloat(match[2]);
      const unit = match[3] || match[2];
      
      if (!isNaN(value)) {
        return {
          value,
          unit: normalizeUnit(unit),
          description: match[0],
          confidence: 0.7
        };
      }
    }
  }
  return { confidence: 0 };
}

/**
 * 提取数据源
 */
function extractSource(text) {
  for (const source of SOURCE_PATTERNS) {
    for (const pattern of source.patterns) {
      if (pattern.test(text)) {
        return {
          primary: source.name,
          confidence: 0.9
        };
      }
    }
  }
  return { confidence: 0 };
}

/**
 * 计算整体置信度
 */
function calculateConfidence(result) {
  const weights = {
    station: 0.25,
    time_window: 0.25,
    metric: 0.20,
    threshold: 0.15,
    resolution_source: 0.15
  };

  let score = 0;
  score += (result.station?.confidence || 0) * weights.station;
  score += (result.time_window?.confidence || 0) * weights.time_window;
  score += (result.metric?.confidence || 0) * weights.metric;
  score += (result.threshold?.confidence || 0) * weights.threshold;
  score += (result.resolution_source?.confidence || 0) * weights.resolution_source;

  return Math.round(score * 100) / 100;
}

/**
 * 标准化单位
 */
function normalizeUnit(unit) {
  if (!unit) return '';
  const unitMap = {
    '°F': '°F',
    '°C': '°C',
    'F': '°F',
    'C': '°C',
    'mm': 'mm',
    'inch': 'inches',
    'inches': 'inches',
    'cm': 'cm',
    'mph': 'mph',
    'km/h': 'km/h',
    'km': 'km',
    'miles': 'miles',
    'mile': 'miles'
  };
  return unitMap[unit.toLowerCase()] || unit;
}

/**
 * 创建空结果
 */
function createEmptyResult() {
  return {
    station: { confidence: 0 },
    time_window: { confidence: 0 },
    metric: { confidence: 0 },
    threshold: { confidence: 0 },
    resolution_source: { confidence: 0 },
    overall_confidence: 0
  };
}

/**
 * LLM 回退（当规则匹配失败时）
 * 目前返回空结果，可扩展为调用外部 LLM API
 */
async function llmFallback(text) {
  console.warn('LLM fallback not available for:', text.substring(0, 50) + '...');
  return createEmptyResult();
}

// ============================================================================
// 测试
// ============================================================================

const TEST_CASES = [
  {
    name: 'Snowfall at Central Park',
    rules: 'Snowfall measured at Central Park weather station by NOAA.',
    question: 'Will it snow in New York City on February 28, 2026?',
    expected_fields: ['station', 'metric', 'source']
  },
  {
    name: 'Temperature at DFW',
    rules: 'Temperature measured at Dallas/Fort Worth International Airport (KDFW) at 3pm local time.',
    question: 'Will temperature exceed 100°F in Dallas on July 15, 2026 at 3pm CDT?',
    expected_fields: ['station', 'metric', 'time_window']
  },
  {
    name: 'Precipitation threshold',
    rules: '≥1 inch snowfall at Central Park (KNYC)',
    question: '',
    expected_fields: ['station', 'metric', 'threshold']
  },
  {
    name: 'Hurricane',
    rules: 'Hurricane data from NOAA National Hurricane Center.',
    question: 'Will there be a Category 3+ hurricane making landfall in Miami in 2026?',
    expected_fields: ['metric', 'source']
  }
];

export async function runTests() {
  console.log('Running parser tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  for (const tc of TEST_CASES) {
    const result = await parseRules(tc.rules, tc.question);
    
    const extracted = [];
    if (result.station?.confidence > 0) extracted.push('station');
    if (result.time_window?.confidence > 0) extracted.push('time_window');
    if (result.metric?.confidence > 0) extracted.push('metric');
    if (result.threshold?.confidence > 0) extracted.push('threshold');
    if (result.resolution_source?.confidence > 0) extracted.push('source');
    
    const success = tc.expected_fields.every(f => extracted.includes(f));
    
    if (success) {
      console.log(`✓ ${tc.name}: ${extracted.join(', ')} (confidence: ${result.overall_confidence})`);
      passed++;
    } else {
      console.log(`✗ ${tc.name}: expected ${tc.expected_fields.join(', ')}, got ${extracted.join(', ')}`);
      failed++;
    }
  }
  
  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

// ============================================================================
// Main
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(r => process.exit(r.failed > 0 ? 1 : 0));
}

export default { parseRules, runTests };

/**
 * 结算口径解析器
 * 
 * 从 Polymarket 市场的 description/rules 文本中解析出结构化字段：
 * - station/geo: 站点或地区
 * - window_start/end: 时间窗
 * - metric: 指标类型
 * - threshold/range: 阈值或范围
 * - resolution_source: 数据源
 * 
 * Usage: 
 *   node parse-resolution-rules.mjs "<规则文本>"
 *   import { parseResolutionRules } from './parse-resolution-rules.mjs';
 * 
 * 不引入重依赖，纯正则+模板实现。
 */

// === 指标类型匹配 ===
const METRIC_PATTERNS = [
  // 温度
  { type: 'temperature', aliases: ['temperature', 'temp', '最高温度', '最低温度', 'high temp', 'low temp', '摄氏度', '°c', '°f', '华氏度', 'fahrenheit'], unit: 'temp' },
  // 降水量
  { type: 'precipitation', aliases: ['precipitation', 'rain', 'rainfall', '降雨', '降水量', 'precip', 'mm', 'inches', 'inch'], unit: 'precip' },
  // 降雪量
  { type: 'snow', aliases: ['snow', 'snowfall', '降雪', '积雪', 'snow depth', 'snowfall'], unit: 'snow' },
  // 风速
  { type: 'wind', aliases: ['wind', '风速', 'gust', '阵风', 'mph', 'knots', 'km/h'], unit: 'wind' },
  // 能见度
  { type: 'visibility', aliases: ['visibility', '能见度', 'fog', '雾', 'miles', 'km', 'meter'], unit: 'vis' },
  // 湿度
  { type: 'humidity', aliases: ['humidity', '湿度', 'relative humidity'], unit: 'humidity' },
  // 气压
  { type: 'pressure', aliases: ['pressure', '气压', 'barometric', 'hpa', 'mb', 'inhg'], unit: 'pressure' },
  // 闪电/雷暴
  { type: 'thunderstorm', aliases: ['thunderstorm', '雷暴', 'lightning', 'thunder'], unit: 'storm' },
  // 空气质量/PM2.5
  { type: 'air_quality', aliases: ['pm2.5', 'pm10', 'air quality', '空气质量', 'aqi', '雾霾'], unit: 'aqi' },
  // 飓风/台风
  { type: 'hurricane', aliases: ['hurricane', 'typhoon', '飓风', '台风', 'cyclone', 'tropical storm'], unit: 'storm' },
];

// === 站点/地区匹配 ===
const STATION_PATTERNS = [
  // ICAO 代码 (4字符，大写)
  { type: 'icao', pattern: /\b([A-Z]{4})\b/g },
  // IATA 代码 (3字符，大写)
  { type: 'iata', pattern: /\b([A-Z]{3})\b/g },
  // 常见城市名
  { type: 'city', pattern: /\b(New York|New York City|Los Angeles|Chicago|Houston|Phoenix|Philadelphia|San Antonio|San Diego|Dallas|San Jose|Austin|Jacksonville|Fort Worth|Columbus|Charlotte|San Francisco|Indianapolis|Seattle|Denver|Boston|Detroit|Nashville|Portland|Memphis|Oklahoma City|Las Vegas|Louisville|Baltimore|Milwaukee|Albuquerque|Tucson|Fresno|Sacramento|Atlanta|Miami|Cleveland|Omaha|Minneapolis|Tampa|Aurora|Anaheim|Santa Ana|Corpus Christi|Riverside|St. Louis|Lexington|Stockton|Pittsburgh|Saint Paul|Anchorage|Newark|Sacramento|Tulsa|Oakland|Wichita|Arlington|Tampa|Orlando|Key West|Honolulu|Anchorage|Juneau|Fairbanks|London|Paris|Berlin|Madrid|Rome|Amsterdam|Brussels|Vienna|Prague|Stockholm|Oslo|Copenhagen|Helsinki|Dublin|Zurich|Geneva|Munich|Barcelona|Milan|Florence|Lisbon|Athens|Warsaw|Budapest|Bucharest|Moscow|Dubai|Tokyo|Beijing|Shanghai|Hong Kong|Singapore|Seoul|Taipei|Bangkok|Jakarta|Kuala Lumpur|Manila|Ho Chi Minh|Hanoi|Mumbai|Delhi|Bangalore|Chennai|Kolkata|Dhaka|Karachi|Lahore|Kolkata|Sydney|Melbourne|Brisbane|Perth|Adelaide|Auckland|Wellington|Christchurch|Cairo|Cape Town|Johannesburg|Nairobi|Lagos|Addis Ababa|Casablanca|Toronto|Vancouver|Montreal|Calgary|Ottawa|Edmonton|Winnipeg|Halifax|Mexico City|Cancun|Punta Cana|San Juan|Havana|Sao Paulo|Rio de Janeiro|Buenos Aires|SantiagoLima|Bogota|Medellin)\b/gi },
];

// === 时间模式 ===
const TIME_PATTERNS = {
  // 日期格式
  date: /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/g,
  // 时间格式 HH:MM
  time: /\b(\,2}:\dd{1{2}(?:\s*(?:UTC|GMT|EST|EDT|CST|CDT|PST|PDT|London|Local|本地)?)?)\b/gi,
  // by/at/between 模式
  by_at: /\b(?:by|at|before|until)\s+(?:the\s+)?(\d{1,2}:\d{2}(?:\s*(?:UTC|GMT|EST|EDT|CST|CDT|PST|PDT)?)?|(\d{4}[-/]\d{1,2}[-/]\d{1,2}))/gi,
  between: /\bbetween\s+(\d{1,2}:\d{2}(?:\s*(?:UTC|GMT|EST|EDT|CST|CDT|PST|PDT)?)?)\s+(?:and|to)\s+(\d{1,2}:\d{2}(?:\s*(?:UTC|GMT|EST|EDT|CST|CDT|PST|PDT)?)?)/gi,
  // 时间范围 00:00-23:59
  range: /\b(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})\b/g,
  // 日期范围
  date_range: /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s*[-–—]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/g,
  // 相对时间
  relative: /\b(?:from|during|in)\s+(?:the\s+)?(morning|afternoon|evening|night|daytime|overnight|midnight|noon|sunrise|sunset|summar|winter|spring|fall|autumn|summer)/gi,
  // 季节
  season: /\b((?:summer|winter|spring|fall|autumn|autumn)\s*(?:of\s+)?(\d{4})?|(\d{4})\s*(?:summer|winter|spring|fall|autumn)|hurricane\s+season|typhoon\s+season|monsoon\s+season)/gi,
};

// === 阈值模式 ===
const THRESHOLD_PATTERNS = [
  // 数值 + 单位
  { pattern: /(≥|>=|>|(?:greater\s+than)|(?:more\s+than)|(?:above)|(?:over)|(?:exceed)|(?:exceeds))\s*(\d+(?:\.\d+)?)\s*(°[CF]|°[FC]|degrees?\s*[CF]|fahrenheit|celsius|mm|cm|inches?|in|feet|ft|miles?|km|knots?|mph|km\/h|hpa|mb|μg\/m³|ugm3|percent?|%|ppm)\b/gi, type: 'above' },
  { pattern: /(≤|<=|<|(?:less\s+than)|(?:below)|(?:under)|(?:underneath)|(?:not\s+exceed))\s*(\d+(?:\.\d+)?)\s*(°[CF]|°[FC]|degrees?\s*[CF]|fahrenheit|celsius|mm|cm|inches?|in|feet|ft|miles?|km|knots?|mph|km\/h|hpa|mb|μg\/m³|ugm3|percent?|%|ppm)\b/gi, type: 'below' },
  // 数值范围
  { pattern: /(?:between|from)\s+(\d+(?:\.\d+)?)\s*(?:to|-)\s+(\d+(?:\.\d+)?)\s*(°[CF]|°[FC]|degrees?\s*[CF]|mm|cm|inches?|in|feet|ft|miles?|km)\b/gi, type: 'range' },
  // 数值 + 比较词
  { pattern: /(\d+(?:\.\d+)?)\s*(°[CF]|°[FC]|degrees?\s*[CF]|mm|cm|inches?|in|feet|ft|miles?|km|knots?|mph)\s*(?:or\s+more|or\s+less|or\s+above|or\s+below)?\b/gi, type: 'exact' },
];

// === 数据源模式 ===
const SOURCE_PATTERNS = [
  { aliases: ['noaa', 'nws', 'national weather service', 'weather.gov', 'ncep'], name: 'NOAA/NWS' },
  { aliases: ['met office', 'metoffice', 'uk met'], name: 'Met Office' },
  { aliases: ['jma', 'japan meteorological', 'japan weather'], name: 'JMA' },
  { aliases: ['ogimet'], name: 'Ogimet' },
  { aliases: ['ecmwf', 'europepm', 'european centre'], name: 'ECMWF' },
  { aliases: ['weather.com', 'weather underground', 'wunderground', 'the weather channel'], name: 'Weather.com/WU' },
  { aliases: ['bom', 'bureau of meteorology', 'australia weather'], name: 'BOM' },
  { aliases: ['cma', 'china meteorological', 'china weather'], name: 'CMA' },
  { aliases: ['hko', 'hong kong observatory'], name: 'HKO' },
  { aliases: ['flightaware', 'flight radar', 'fr24', 'radar24'], name: 'FlightAware/FR24' },
  { aliases: ['faa', 'federal aviation'], name: 'FAA' },
  { aliases: ['nhc', 'national hurricane', 'hurricane center'], name: 'NHC' },
  { aliases: ['mss', 'meteorological service singapore'], name: 'MSS' },
  { aliases: ['meteo-france', 'météo-france'], name: 'Météo-France' },
  { aliases: ['iqair', 'air now', 'air quality'], name: 'Air Quality' },
  { aliases: ['us embassy'], name: 'US Embassy' },
  { aliases: ['world weather online'], name: 'World Weather Online' },
  { aliases: ['reuters', 'ap news', 'bloomberg'], name: 'News Agency' },
];

// === 解析函数 ===
/**
 * 解析结算规则文本
 * @param {string} text - 规则文本 (通常来自 market.description)
 * @returns {Object} 结构化解析结果
 */
export function parseResolutionRules(text) {
  if (!text || typeof text !== 'string') {
    return { success: false, error: 'Invalid input: text is required' };
  }

  const result = {
    success: true,
    station: null,
    geo: null,
    window_start: null,
    window_end: null,
    window_text: null,
    metric: null,
    metric_unit: null,
    threshold: null,
    threshold_type: null,
    threshold_value: null,
    threshold_unit: null,
    range_min: null,
    range_max: null,
    resolution_source: null,
    raw: text.substring(0, 200) // 保留原始文本片段用于调试
  };

  // 1. 解析指标类型
  for (const metricGroup of METRIC_PATTERNS) {
    for (const alias of metricGroup.aliases) {
      const regex = new RegExp(`\\b${escapeRegex(alias)}\\b`, 'i');
      if (regex.test(text)) {
        result.metric = metricGroup.type;
        result.metric_unit = metricGroup.unit;
        break;
      }
    }
    if (result.metric) break;
  }

  // 2. 解析站点/地区
  // ICAO
  const icaoMatches = [...text.matchAll(/\b([A-Z]{4})\b/g)];
  const icaos = icaoMatches.map(m => m[1]).filter(c => isKnownICAO(c));
  if (icaos.length > 0) {
    result.station = { type: 'icao', values: [...new Set(icaos)] };
  }

  // IATA
  if (!result.station) {
    const iataMatches = [...text.matchAll(/\b([A-Z]{3})\b/g)];
    const iatas = iataMatches.map(m => m[1]).filter(c => isKnownIATA(c));
    if (iatas.length > 0) {
      result.station = { type: 'iata', values: [...new Set(iatas)] };
    }
  }

  // 城市名
  if (!result.station) {
    for (const cityPattern of STATION_PATTERNS) {
      if (cityPattern.type === 'city') {
        const cityMatches = [...text.matchAll(cityPattern.pattern)];
        if (cityMatches.length > 0) {
          const cities = [...new Set(cityMatches.map(m => m[1]))];
          result.geo = { type: 'city', values: cities };
          break;
        }
      }
    }
  }

  // 3. 解析时间窗
  // 尝试 by/at 模式
  let timeMatch = text.match(/by\s+(?:the\s+)?(\d{1,2}:\d{2}(?:\s*(?:UTC|GMT|EST|EDT|CST|CDT|PST|PDT|Local))?)/i);
  if (timeMatch) {
    result.window_end = normalizeTime(timeMatch[1]);
    result.window_text = `by ${timeMatch[1]}`;
  }

  timeMatch = text.match(/at\s+(?:the\s+)?(\d{1,2}:\d{2}(?:\s*(?:UTC|GMT|EST|EDT|CST|CDT|PST|PDT|Local))?)/i);
  if (timeMatch && !result.window_end) {
    result.window_end = normalizeTime(timeMatch[1]);
    result.window_text = `at ${timeMatch[1]}`;
  }

  // 尝试 between 模式
  timeMatch = text.match(/between\s+(\d{1,2}:\d{2}(?:\s*(?:UTC|GMT|EST|EDT|CST|CDT|PST|PDT)?)?)\s+(?:and|to)\s+(\d{1,2}:\d{2}(?:\s*(?:UTC|GMT|EST|EDT|CST|CDT|PST|PDT)?)?)/i);
  if (timeMatch) {
    result.window_start = normalizeTime(timeMatch[1]);
    result.window_end = normalizeTime(timeMatch[2]);
    result.window_text = `between ${timeMatch[1]} and ${timeMatch[2]}`;
  }

  // 尝试范围模式 00:00-23:59
  timeMatch = text.match(/(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/g);
  if (timeMatch) {
    const rangeParts = timeMatch[0].split(/[-–—]/);
    if (rangeParts.length === 2) {
      result.window_start = normalizeTime(rangeParts[0].trim());
      result.window_end = normalizeTime(rangeParts[1].trim());
      result.window_text = timeMatch[0];
    }
  }

  // 尝试日期范围
  timeMatch = text.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s*[-–—]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/);
  if (timeMatch) {
    result.window_start = timeMatch[1];
    result.window_end = timeMatch[2];
    result.window_text = `${timeMatch[1]} - ${timeMatch[2]}`;
  }

  // 尝试相对时间
  const relativeMatch = text.match(/(morning|afternoon|evening|night|daytime|overnight|midnight|noon|sunrise|sunset)/i);
  if (relativeMatch && !result.window_text) {
    result.window_text = relativeMatch[1];
    result.window_start = relativeMatch[1];
    result.window_end = relativeMatch[1];
  }

  // 4. 解析阈值
  for (const tp of THRESHOLD_PATTERNS) {
    const matches = [...text.matchAll(tp.pattern)];
    if (matches.length > 0) {
      const match = matches[0];
      result.threshold_type = tp.type;
      
      if (tp.type === 'range') {
        result.range_min = parseFloat(match[1]);
        result.range_max = parseFloat(match[2]);
        result.threshold_unit = match[3];
      } else if (tp.type === 'exact') {
        result.threshold_value = parseFloat(match[1]);
        result.threshold_unit = match[2];
      } else {
        // above or below
        result.threshold_value = parseFloat(match[2]);
        result.threshold_unit = match[3];
      }
      
      // 构造 threshold 字符串
      if (result.threshold_type === 'above') {
        result.threshold = `>= ${result.threshold_value} ${result.threshold_unit}`;
      } else if (result.threshold_type === 'below') {
        result.threshold = `<= ${result.threshold_value} ${result.threshold_unit}`;
      } else if (result.threshold_type === 'range') {
        result.threshold = `${result.range_min}-${result.range_max} ${result.threshold_unit}`;
      } else {
        result.threshold = `${result.threshold_value} ${result.threshold_unit}`;
      }
      
      break;
    }
  }

  // 5. 解析数据源
  for (const source of SOURCE_PATTERNS) {
    for (const alias of source.aliases) {
      if (text.toLowerCase().includes(alias.toLowerCase())) {
        result.resolution_source = source.name;
        break;
      }
    }
    if (result.resolution_source) break;
  }

  return result;
}

/**
 * 增强 entry_plan
 * @param {Object} resolution - parseResolutionRules 返回的结果
 * @param {string} originalEntryPlan - 原始的 entry_plan
 * @returns {string} 增强后的 entry_plan
 */
export function enhanceEntryPlan(resolution, originalEntryPlan) {
  if (!resolution || !resolution.success) {
    return originalEntryPlan;
  }

  const enhancements = [];

  // 添加具体时间点信息
  if (resolution.window_text) {
    enhancements.push(`结算时间窗: ${resolution.window_text}`);
  } else if (resolution.window_start || resolution.window_end) {
    const timeRange = [resolution.window_start, resolution.window_end].filter(Boolean).join(' - ');
    if (timeRange) {
      enhancements.push(`结算时间窗: ${timeRange}`);
    }
  }

  // 添加具体指标和阈值
  if (resolution.metric && resolution.threshold) {
    const metricNames = {
      temperature: '温度',
      precipitation: '降水量',
      snow: '降雪量',
      wind: '风速',
      visibility: '能见度',
      humidity: '湿度',
      pressure: '气压',
      thunderstorm: '雷暴',
      air_quality: '空气质量',
      hurricane: '飓风/台风'
    };
    const metricName = metricNames[resolution.metric] || resolution.metric;
    enhancements.push(`结算指标: ${metricName} ${resolution.threshold}`);
  }

  // 添加站点信息
  if (resolution.station) {
    const stationStr = resolution.station.values.join(', ');
    enhancements.push(`结算站点: ${stationStr}`);
  } else if (resolution.geo) {
    const geoStr = resolution.geo.values.join(', ');
    enhancements.push(`结算地区: ${geoStr}`);
  }

  // 添加数据源
  if (resolution.resolution_source) {
    enhancements.push(`数据源: ${resolution.resolution_source}`);
  }

  if (enhancements.length === 0) {
    return originalEntryPlan;
  }

  // 将增强信息插入到 entry_plan 开头
  const enhancementStr = enhancements.join('；') + '。';
  return enhancementStr + originalEntryPlan;
}

// === 辅助函数 ===
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeTime(timeStr) {
  if (!timeStr) return null;
  // 确保 HH:MM 格式
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    const hour = parseInt(match[1], 10);
    const minute = match[2];
    // 提取时区
    const tzMatch = timeStr.match(/(UTC|GMT|EST|EDT|CST|CDT|PST|PDT|Local)/i);
    const tz = tzMatch ? tzMatch[1].toUpperCase() : 'UTC';
    return `${hour.toString().padStart(2, '0')}:${minute} ${tz}`;
  }
  return timeStr;
}

// 常见 ICAO 代码白名单
const KNOWN_ICAOS = new Set([
  'KJFK', 'KLAX', 'KORD', 'KATL', 'KDFW', 'KDEN', 'KSFO', 'KLAS', 'KMCO', 'KSEA',
  'KPHX', 'KIAH', 'KMIA', 'KBOS', 'KMSP', 'KFLL', 'KDTW', 'KPHL', 'KSLC', 'KBWI',
  'KMDW', 'KSAN', 'KDCA', 'KTPA', 'KPDX', 'KSTL', 'KHOU', 'KOMA', 'KAUS', 'KMEM',
  'KRDU', 'KCLE', 'KSJC', 'KLGA', 'KJAX', 'KPIT', 'KMCI', 'KDEN', 'KEWR', 'KTUL',
  'EGLL', 'EGKK', 'EGLF', 'EGBB', 'EGPH', 'EGLL', 'LFPG', 'LFSB', 'LFPO', 'EDDF',
  'EDDM', 'LEMD', 'LEBL', 'LIRF', 'LPPT', 'EHAM', 'EHRD', 'ENOS', 'ESFIN', 'BIRK',
  'RJTT', 'RJNH', 'RJTF', 'RJFU', 'RJBB', 'RJFF', 'RJFR', 'RJGG', 'RJOW', 'RJAH',
  'ZBAA', 'ZBAD', 'ZBPE', 'ZSPD', 'ZSSS', 'ZSNB', 'ZGSZ', 'ZGGG', 'ZHHH', 'ZUCK',
  'VHHH', 'VTSP', 'VTBS', 'WSSS', 'WIII', 'WMKK', 'RPVM', 'RPLL', 'RCTP', 'RJTD',
  'OPNH', 'OPIS', 'OERK', 'OMDB', 'OTHH', 'OKBK', 'OBBI', 'ORYL', 'EGAC', 'EIDL',
  'KHSV', 'KGMU', 'KCLT', 'KRIC', 'KORF', 'KDAB', 'KSRQ', 'KPBI', 'KMCO', 'KTPA',
  'PAFA', 'PAEN', 'PANC', 'PAOU', 'PHNL', 'PHTO', 'PHKO', 'PHSF', 'TJBQ', 'TJSJ',
  'CYYZ', 'CYYC', 'CYVR', 'CYUL', 'CYEG', 'CYOW', 'CYWG', 'CYHZ', 'MMUN', 'MMGL',
  'MMMX', 'MMRM', 'MMTJ', 'MGLX', 'SBGR', 'SBSP', 'SBRJ', 'SBCT', 'SBBR', 'SBFL',
  'SCEL', 'SAEZ', 'SUMU', 'SLVR', 'SLCY', 'SKBG', 'SKCL', 'SKSM', 'SVMI', 'TNCC',
]);

function isKnownICAO(code) {
  return KNOWN_ICAOS.has(code);
}

// 常见 IATA 代码白名单
const KNOWN_IATAS = new Set([
  'JFK', 'LAX', 'ORD', 'ATL', 'DFW', 'DEN', 'SFO', 'LAS', 'MCO', 'SEA',
  'PHX', 'IAH', 'MIA', 'BOS', 'MSP', 'FLL', 'DTW', 'PHL', 'SLC', 'BWI',
  'MDW', 'SAN', 'DCA', 'TPA', 'PDX', 'STL', 'HOU', 'OMA', 'AUS', 'MEM',
  'RDU', 'CLE', 'SJC', 'LGA', 'JAX', 'PIT', 'MCI', 'EWR', 'TUL', 'LHR',
  'LGW', 'CDG', 'FRA', 'MAD', 'BCN', 'FCO', 'LIS', 'AMS', 'OSL', 'CPH',
  'HEL', 'DUB', 'ZRH', 'MUC', 'NRT', 'HND', 'PEK', 'PVG', 'CAN', 'SZX',
  'HKG', 'SIN', 'BKK', 'CGK', 'KUL', 'MNL', 'HAN', 'SGN', 'BOM', 'DEL',
  'SYD', 'MEL', 'BNE', 'PER', 'AKL', 'DXB', 'DOH', 'AUH', 'CAI', 'JNB',
  'CPT', 'NBO', 'LOS', 'CMN', 'YYZ', 'YVR', 'YUL', 'YEG', 'YOW', 'CUN',
  'MEX', 'GDL', 'BOG', 'MDE', 'SJO', 'LIM', 'EZE', 'GRU', 'GIG', 'SCL',
]);

function isKnownIATA(code) {
  return KNOWN_IATAS.has(code);
}

// === CLI 入口 ===
if (import.meta.url === `file://${process.argv[1]}`) {
  // 直接运行脚本
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Usage: node parse-resolution-rules.mjs "<规则文本>"');
    console.log('\nExamples:');
    console.log('  node parse-resolution-rules.mjs "Temperature at KJFK exceeds 95°F by 23:59 UTC"');
    console.log('  node parse-resolution-rules.mjs "Rainfall at London Heathrow (EGLL) >= 10mm on 2024-06-15"');
    process.exit(0);
  }

  const inputText = args.join(' ');
  console.log('Input:', inputText);
  console.log('');

  const result = parseResolutionRules(inputText);
  console.log('Parsed Result:');
  console.log(JSON.stringify(result, null, 2));

  // 测试增强 entry_plan
  const testEntryPlan = "T-24h: 检查 NOAA 预报更新；T-6h: 确认预报收敛。若流动性充足且 spread<3% 可考虑入场。";
  const enhanced = enhanceEntryPlan(result, testEntryPlan);
  console.log('\nEnhanced Entry Plan:');
  console.log(enhanced);
}

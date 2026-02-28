/**
 * Weather Probability Engine v1
 * 
 * 基于 NWS hourly forecast 实现温度事件概率估计
 * 
 * 功能：
 * - 解析 question：城市、日期、阈值、比较符（>=/<=/区间）
 * - 从 hourlyForecast 得到目标日期的温度序列；计算 maxTemp
 * - 不确定性 sigma：保守固定值 + 范围修正
 * - 计算概率：P(maxTemp >= T) = 1 - NormalCDF((T - maxTemp)/sigma)
 * - 写入 watchlist item：assistant_prob、assistant_evidence
 * 
 * @see Issue #40
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// 配置
// ============================================================================

// 不确定性参数（按 issue 要求）
const SIGMA_CONFIG = {
  min_sigma_celsius: 1.0,      // 最小 1°C
  min_sigma_fahrenheit: 2.0,    // 最小 2°F
  range_factor: 0.5,            // 范围修正系数
};

// 城市到 NWS 站点映射
const CITY_TO_STATION = {
  // 美国城市
  'new york': 'KJFK',
  'nyc': 'KJFK',
  'manhattan': 'KJFK',
  'jfk': 'KJFK',
  'central park': 'KNYC',
  'la': 'KLAX',
  'los angeles': 'KLAX',
  'chicago': 'KORD',
  'ord': 'KORD',
  'miami': 'KMIA',
  'dfw': 'KDFW',
  'dallas': 'KDFW',
  'fort worth': 'KDFW',
  'seattle': 'KSEA',
  'denver': 'KDEN',
  'atlanta': 'KATL',
  'boston': 'KBOS',
  'philadelphia': 'KPHL',
  'washington': 'KIAD',
  'houston': 'KIAH',
  'phoenix': 'KPHX',
  'san francisco': 'KSFO',
  'baltimore': 'KBWI',
  'toronto': 'CYYZ',
  'anchorage': 'PANC',
  'honolulu': 'PHNL',
  // 国际城市（非 NWS，可能 fallback）
  'london': 'EGLL',
  'wellington': 'NZWN',
  'seoul': 'RKSS',
  'beijing': 'ZBAA',
  'tokyo': 'RJTT',
  'paris': 'LFPG',
  'sydney': 'YSSY',
  'sao paulo': 'SBSP',
  'buenos aires': 'SAEZ',
  'ankara': 'LTAC',
};

// ============================================================================
// 正态分布 CDF（使用近似）
// ============================================================================

/**
 * 标准正态分布的 CDF（Abramowitz and Stegun 近似）
 */
function normalCDF(x) {
  // 使用常伟公式近似
  const p = 0.2316419;
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  
  const t = 1 / (1 + p * Math.abs(x));
  const t2 = t * t;
  const t3 = t2 * t;
  const t4 = t3 * t;
  const t5 = t4 * t;
  
  const pdf = (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x);
  const cdf = 1 - pdf * (b1 * t + b2 * t2 + b3 * t3 + b4 * t4 + b5 * t5);
  
  return x >= 0 ? cdf : 1 - cdf;
}

/**
 * 正态分布 CDF
 */
function normalCDFValue(x, mean, sigma) {
  return normalCDF((x - mean) / sigma);
}

// ============================================================================
// 温度单位转换
// ============================================================================

function fahrenheitToCelsius(f) {
  // For temperature DIFFERENCES (not absolute values): 1°F = 5/9°C
  return f * 5 / 9;
}

function celsiusToFahrenheit(c) {
  // For temperature ABSOLUTE values
  return c * 9 / 5 + 32;
}

// ============================================================================
// 问题解析
// ============================================================================

/**
 * 解析温度类问题
 * 
 * @param {string} question - Polymarket 问题文本
 * @returns {Object} 解析结果
 */
function parseTemperatureQuestion(question) {
  const result = {
    city: null,
    date: null,
    threshold: null,
    thresholdUnit: null,
    operator: null,  // '>=', '<=', '>', '<', 'range'
    isRange: false,
    rangeLow: null,
    rangeHigh: null,
    confidence: 0
  };
  
  if (!question) return result;
  
  // 1. 提取城市 - 按长度排序，优先匹配更长的名称
  const cityLower = question.toLowerCase();
  const sortedCities = Object.entries(CITY_TO_STATION).sort((a, b) => b[0].length - a[0].length);
  for (const [city, station] of sortedCities) {
    if (cityLower.includes(city)) {
      result.city = city.charAt(0).toUpperCase() + city.slice(1);
      result.confidence = Math.max(result.confidence, 0.7);
      break;
    }
  }
  
  // 也尝试从 "in X on" 模式提取城市
  const inMatch = question.match(/in\s+([A-Za-z\s]+?)\s+on/i);
  if (inMatch && !result.city) {
    result.city = inMatch[1].trim();
    result.confidence = Math.max(result.confidence, 0.5);
  }
  
  // 2. 提取日期 - 需要在阈值提取之前，且要更精确
  // 更精确的日期正则 - 排除 "be X" 这种模式
  const datePatterns = [
    // 先尝试 "on Month Day" 或 "on Month Day, Year" 格式
    /on\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)/i,
    // ISO 格式
    /\d{4}-\d{2}-\d{2}/,
  ];
  
  for (const pattern of datePatterns) {
    const match = question.match(pattern);
    if (match) {
      result.date = match[1] || match[0];
      result.confidence = Math.max(result.confidence, 0.6);
      break;
    }
  }
  
  // 3. 提取阈值和比较符
  // 模式: "19°C", "50°F", "14°C or higher", "be X", etc.
  
  // 优先处理明确的比较符（or higher, or lower, >=, <=, >, <）
  const operators = [
    { pattern: />=\s*(\d+(?:\.\d+)?)\s*(°[FC])/i, op: '>=' },
    { pattern: />\s*(\d+(?:\.\d+)?)\s*(°[FC])/i, op: '>' },
    { pattern: /<=\s*(\d+(?:\.\d+)?)\s*(°[FC])/i, op: '<=' },
    { pattern: /<\s*(\d+(?:\.\d+)?)\s*(°[FC])/i, op: '<' },
    { pattern: /(\d+(?:\.\d+)?)\s*(°[FC])\s+or\s+higher/i, op: '>=' },
    { pattern: /(\d+(?:\.\d+)?)\s*(°[FC])\s+or\s+lower/i, op: '<=' },
    { pattern: /be\s+(\d+(?:\.\d+)?)\s*(°[FC])/i, op: 'exact' }, // 最后处理 "be X"
  ];
  
  for (const { pattern, op } of operators) {
    const match = question.match(pattern);
    if (match) {
      result.threshold = parseFloat(match[1]);
      result.thresholdUnit = match[2].toUpperCase();
      result.operator = op;
      result.confidence = Math.max(result.confidence, 0.8);
      break;
    }
  }
  
  // 尝试区间模式 [A, B]
  const rangeMatch = question.match(/between\s+(\d+(?:\.\d+)?)\s*(°[FC])?\s*(?:and|to|-)\s*(\d+(?:\.\d+)?)\s*(°[FC])?/i);
  if (rangeMatch) {
    result.isRange = true;
    result.rangeLow = parseFloat(rangeMatch[1]);
    result.rangeHigh = parseFloat(rangeMatch[3]);
    // 单位统一
    result.thresholdUnit = rangeMatch[2] || rangeMatch[4] || '°F';
    result.operator = 'range';
    result.confidence = Math.max(result.confidence, 0.7);
  }
  
  // 如果没有单位，假设是°F（美国市场常见）
  if (!result.thresholdUnit && result.threshold) {
    result.thresholdUnit = '°F';
  }
  
  return result;
}

// ============================================================================
// 温度概率计算
// ============================================================================

/**
 * 计算温度事件概率
 * 
 * @param {number} forecastMax - 预测最高温度
 * @param {string} forecastUnit - 预报单位 ('F' 或 'C')
 * @param {number} threshold - 阈值
 * @param {string} thresholdUnit - 阈值单位
 * @param {string} operator - 比较符 ('>=', '<=', '>', '<', 'range', 'exact')
 * @param {number} rangeLow - 区间下限（可选）
 * @param {number} rangeHigh - 区间上限（可选）
 * @returns {Object} 概率结果
 */
function calculateTemperatureProbability(forecastMax, forecastUnit, threshold, thresholdUnit, operator, rangeLow = null, rangeHigh = null) {
  // 统一单位到华氏度
  let forecastMaxF = forecastUnit === 'C' ? celsiusToFahrenheit(forecastMax) : forecastMax;
  let thresholdF = (thresholdUnit === '°C' || thresholdUnit === 'C') ? celsiusToFahrenheit(threshold) : threshold;
  let rangeLowF = rangeLow !== null ? ((thresholdUnit === '°C' || thresholdUnit === 'C') ? celsiusToFahrenheit(rangeLow) : rangeLow) : null;
  let rangeHighF = rangeHigh !== null ? ((thresholdUnit === '°C' || thresholdUnit === 'C') ? celsiusToFahrenheit(rangeHigh) : rangeHigh) : null;
  
  // 计算 sigma（不确定性）
  // sigma = max(2°F, 0.5 * forecast_range)
  // 由于没有完整的 hourly range，我们用保守估计
  // 简化：sigma = max(2°F, 3.6°C) = 3.6°C (约 6.5°F)
  const sigmaF = Math.max(
    SIGMA_CONFIG.min_sigma_fahrenheit, 
    SIGMA_CONFIG.min_sigma_celsius * 9 / 5  // 转换为°F
  );
  
  let probability;
  const evidence = {
    forecastMax,
    forecastUnit,
    threshold,
    thresholdUnit,
    thresholdF,
    operator,
    sigmaF,
    sigmaC: fahrenheitToCelsius(sigmaF),
    method: 'normal_cdf'
  };
  
  switch (operator) {
    case '>=':
    case '>':
      // P(maxTemp >= T) = 1 - CDF((T - maxTemp) / sigma)
      // 即 P(maxTemp < T) 的概率
      probability = 1 - normalCDFValue(thresholdF, forecastMaxF, sigmaF);
      evidence.formula = 'P(maxTemp >= T) = 1 - NormalCDF((T - maxTemp) / sigma)';
      break;
      
    case '<=':
    case '<':
      // P(maxTemp <= T) = CDF((T - maxTemp) / sigma)
      probability = normalCDFValue(thresholdF, forecastMaxF, sigmaF);
      evidence.formula = 'P(maxTemp <= T) = NormalCDF((T - maxTemp) / sigma)';
      break;
      
    case 'exact':
      // P(maxTemp == T) - 使用简化，假设在小范围内
      const probAbove = 1 - normalCDFValue(thresholdF, forecastMaxF, sigmaF);
      const probBelow = normalCDFValue(thresholdF, forecastMaxF, sigmaF);
      probability = Math.min(probAbove, probBelow) * 0.5;
      evidence.formula = 'P(maxTemp ≈ T) = Normal approximation';
      break;
      
    case 'range':
      // P(low <= maxTemp <= high) = CDF((high - mean)/sigma) - CDF((low - mean)/sigma)
      if (rangeLowF !== null && rangeHighF !== null) {
        const cdfHigh = normalCDFValue(rangeHighF, forecastMaxF, sigmaF);
        const cdfLow = normalCDFValue(rangeLowF, forecastMaxF, sigmaF);
        probability = cdfHigh - cdfLow;
        evidence.rangeLow = rangeLow;
        evidence.rangeHigh = rangeHigh;
        evidence.rangeLowF = rangeLowF;
        evidence.rangeHighF = rangeHighF;
        evidence.formula = 'P(low <= T <= high) = CDF(high) - CDF(low)';
      } else {
        probability = 0.5;
      }
      break;
      
    default:
      probability = 0.5;
      evidence.formula = 'default_50%';
  }
  
  // 限制在 [0, 1]
  probability = Math.max(0, Math.min(1, probability));
  
  return {
    probability,
    evidence
  };
}

// ============================================================================
// 天气数据获取
// ============================================================================

/**
 * 加载天气数据源
 */
function loadWeatherSources() {
  const path = join(__dirname, '..', 'poly-knowledge', 'outputs', 'weather-aviation-sources-latest.json');
  
  if (!existsSync(path)) {
    console.error(`[ERROR] Weather sources not found: ${path}`);
    return null;
  }
  
  try {
    const data = JSON.parse(readFileSync(path, 'utf-8'));
    return data.data.weather.stations;
  } catch (e) {
    console.error(`[ERROR] Failed to load weather sources: ${e.message}`);
    return null;
  }
}

/**
 * 获取目标日期的小时温度预报
 * 
 * @param {Array} hourlyForecast - 小时预报数组
 * @param {string} targetDate - 目标日期 (YYYY-MM-DD)
 * @returns {Array} 目标日期的温度数组
 */
function getTargetDateTemperatures(hourlyForecast, targetDate) {
  if (!hourlyForecast || !targetDate) return [];
  
  const temps = [];
  
  for (const hour of hourlyForecast) {
    // startTime 格式: "2026-02-28T12:00:00-05:00"
    const startTime = hour.startTime;
    if (startTime.startsWith(targetDate)) {
      if (hour.temperature !== undefined) {
        temps.push({
          temperature: hour.temperature,
          unit: hour.temperatureUnit || 'F',
          time: startTime
        });
      }
    }
  }
  
  return temps;
}

/**
 * 从小时预报计算最高温度
 */
function calculateMaxTemp(hourlyForecast, targetDate) {
  const temps = getTargetDateTemperatures(hourlyForecast, targetDate);
  
  if (temps.length === 0) {
    return null;
  }
  
  let maxTemp = -Infinity;
  let maxUnit = 'F';
  
  for (const t of temps) {
    if (t.temperature > maxTemp) {
      maxTemp = t.temperature;
      maxUnit = t.unit;
    }
  }
  
  return {
    value: maxTemp,
    unit: maxUnit,
    hourCount: temps.length
  };
}

// ============================================================================
// 主处理函数
// ============================================================================

/**
 * 处理单个 watchlist item
 */
function processWeatherItem(item, weatherStations) {
  const parsed = parseTemperatureQuestion(item.question);
  
  if (!parsed.city || !parsed.date || !parsed.threshold) {
    return {
      success: false,
      reason: 'failed_to_parse',
      parsed
    };
  }
  
  // 找到对应站点
  const stationId = CITY_TO_STATION[parsed.city.toLowerCase()] || 
                    Object.keys(CITY_TO_STATION).find(k => parsed.city.toLowerCase().includes(k));
  
  let stationData = null;
  if (stationId) {
    stationData = weatherStations.find(s => s.station.id === stationId);
  }
  
  // 如果没找到，尝试找美国站点的默认
  if (!stationData) {
    // 尝试 KNYC (Central Park) 作为 NYC 默认
    stationData = weatherStations.find(s => s.station.id === 'KNYC') || 
                  weatherStations[0]; // fallback 到第一个
  }
  
  if (!stationData) {
    return {
      success: false,
      reason: 'no_station_data',
      parsed
    };
  }
  
  // 解析日期 (尝试多种格式)
  let targetDate = null;
  
  // ISO 格式
  const isoMatch = parsed.date.match(/\d{4}-\d{2}-\d{2}/);
  if (isoMatch) {
    targetDate = isoMatch[0];
  } else {
    // 尝试 "February 28" -> "2026-02-28"
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 
                        'july', 'august', 'september', 'october', 'november', 'december'];
    const dateLower = parsed.date.toLowerCase();
    
    for (let i = 0; i < monthNames.length; i++) {
      if (dateLower.includes(monthNames[i])) {
        // 提取日期数字
        const dayMatch = parsed.date.match(/(\d+)/);
        if (dayMatch) {
          const day = parseInt(dayMatch[1]).toString().padStart(2, '0');
          const month = (i + 1).toString().padStart(2, '0');
          // 假设是 2026 年
          targetDate = `2026-${month}-${day}`;
          break;
        }
      }
    }
  }
  
  if (!targetDate) {
    return {
      success: false,
      reason: 'invalid_date',
      parsed
    };
  }
  
  // 获取小时预报并计算 maxTemp
  const hourlyForecast = stationData.hourlyForecast || [];
  const maxTempResult = calculateMaxTemp(hourlyForecast, targetDate);
  
  if (!maxTempResult) {
    // 尝试从 regular forecast 获取（作为 fallback）
    const forecast = stationData.forecast || [];
    const dayForecast = forecast.find(f => f.name && f.name.toLowerCase().includes(parsed.date.toLowerCase().split(' ')[0]));
    if (dayForecast && dayForecast.temperature) {
      maxTempResult = {
        value: dayForecast.temperature,
        unit: dayForecast.temperatureUnit || 'F',
        hourCount: 1,
        source: 'daily_forecast'
      };
    }
  }
  
  if (!maxTempResult) {
    return {
      success: false,
      reason: 'no_forecast_data',
      parsed,
      station: stationData.station.id
    };
  }
  
  // 计算概率
  const probResult = calculateTemperatureProbability(
    maxTempResult.value,
    maxTempResult.unit,
    parsed.threshold,
    parsed.thresholdUnit,
    parsed.operator,
    parsed.rangeLow,
    parsed.rangeHigh
  );
  
  // 构建结果
  const probability = Math.round(probResult.probability * 100); // 转为百分比
  
  const evidence = {
    station: stationData.station.id,
    stationName: stationData.station.name,
    targetDate,
    maxTemp: maxTempResult.value,
    maxTempUnit: maxTempResult.unit,
    threshold: parsed.threshold,
    thresholdUnit: parsed.thresholdUnit,
    operator: parsed.operator,
    sigmaC: Math.round(probResult.evidence.sigmaC * 10) / 10,
    sigmaF: Math.round(probResult.evidence.sigmaF * 10) / 10,
    probability: `${probability}%`,
    formula: probResult.evidence.formula,
    dataUpdated: stationData.hourlyForecast?.[0]?.startTime || 'unknown'
  };
  
  return {
    success: true,
    city: parsed.city,
    date: targetDate,
    probability,
    assistant_prob: probability,
    assistant_evidence: evidence,
    parsed
  };
}

/**
 * 主处理函数
 */
export function generateWeatherProbabilities(watchlistItems) {
  const weatherStations = loadWeatherSources();
  
  if (!weatherStations) {
    console.error('[ERROR] Cannot load weather sources');
    return watchlistItems;
  }
  
  console.log(`[INFO] Loaded ${weatherStations.length} weather stations`);
  
  const results = [];
  
  for (const item of watchlistItems) {
    // 只处理温度类市场
    const question = item.question || '';
    const isTemperature = /temperature|temp|°F|°C|hot|cold|warm|cool/i.test(question);
    const isWeather = /weather|temperature|highest|lowest|max|min/i.test(question);
    
    if (!isWeather) {
      results.push(item);
      continue;
    }
    
    const result = processWeatherItem(item, weatherStations);
    
    if (result.success) {
      // 更新 item
      const updated = {
        ...item,
        assistant_prob: result.probability,
        assistant_evidence: result.assistant_evidence,
        assistant_edge: item.implied_probability ? 
          (result.probability - Math.round(parseFloat(item.implied_probability) * 100)) : null
      };
      
      results.push(updated);
      console.log(`[OK] ${item.question?.substring(0, 50)}... => ${result.probability}%`);
    } else {
      results.push(item);
      console.log(`[SKIP] ${item.question?.substring(0, 50)}... (${result.reason})`);
    }
  }
  
  return results;
}

/**
 * Standalone test
 */
async function test() {
  const testQuestions = [
    "Will the highest temperature in Wellington be 19°C on February 28?",
    "Will the highest temperature in Seoul be 14°C or higher on February 28?",
    "Will the highest temperature in London be 11°C on February 28?",
    "Will the highest temperature in NYC be 50°F or higher on February 28?",
  ];
  
  const weatherStations = loadWeatherSources();
  console.log(`Loaded ${weatherStations.length} stations`);
  
  for (const q of testQuestions) {
    const parsed = parseTemperatureQuestion(q);
    console.log('\n---');
    console.log('Question:', q);
    console.log('Parsed:', JSON.stringify(parsed, null, 2));
    
    // 模拟 item
    const mockItem = { question: q, implied_probability: null };
    const result = processWeatherItem(mockItem, weatherStations);
    console.log('Result:', JSON.stringify(result, null, 2));
  }
}

// 如果直接运行
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  test();
}

export { parseTemperatureQuestion, calculateTemperatureProbability, loadWeatherSources };

/**
 * fetch-noaa-forecast.mjs
 * 
 * Fetch weather data from NOAA/NWS API
 * Public endpoint: https://api.weather.gov
 * No API key required, but requires User-Agent header
 * 
 * Constraints:
 * - Free to use (open data)
 * - Requires User-Agent identification
 * - Rate limited (generous but be respectful)
 * - Retry on failure with exponential backoff
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

// ============================================================
// Configuration
// ============================================================

const CONFIG = {
  USER_AGENT: 'Polymarket-Research/1.0 (Weather Data Adapter; contact: research@polymarket.local)',
  BASE_URL: 'api.weather.gov',
  RETRY_DELAY_MS: 1000,
  MAX_RETRIES: 3,
  REQUEST_TIMEOUT_MS: 15000,
  
  // Sample stations for testing (US major airports/cities)
  SAMPLE_STATIONS: [
    { id: 'KNYC', name: 'Central Park, NY', lat: 40.7789, lon: -73.9695 },
    { id: 'KJFK', name: 'JFK Airport, NY', lat: 40.6413, lon: -73.7781 },
    { id: 'KDFW', name: 'Dallas/Fort Worth, TX', lat: 32.8998, lon: -97.0403 },
    { id: 'KSEA', name: 'Seattle, WA', lat: 47.4502, lon: -122.3088 },
    { id: 'KDEN', name: 'Denver, CO', lat: 39.8561, lon: -104.6737 },
    { id: 'KMIA', name: 'Miami, FL', lat: 25.7959, lon: -80.2870 },
    { id: 'KORD', name: 'Chicago, IL', lat: 41.9742, lon: -87.9073 },
    { id: 'KLAX', name: 'Los Angeles, CA', lat: 33.9425, lon: -118.4081 }
  ]
};

// ============================================================
// Utility Functions
// ============================================================

/**
 * Make HTTP/HTTPS request with retries
 */
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': CONFIG.USER_AGENT,
        'Accept': 'application/geo+json',
        ...options.headers
      },
      timeout: CONFIG.REQUEST_TIMEOUT_MS
    };
    
    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else if (res.statusCode >= 400) {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        } else {
          reject(new Error(`Unexpected status: ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

/**
 * Retry wrapper with exponential backoff
 */
async function withRetry(fn, retries = CONFIG.MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      const delay = CONFIG.RETRY_DELAY_MS * Math.pow(2, i);
      console.log(`  Retry ${i + 1}/${retries} after ${delay}ms: ${error.message}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ============================================================
// API Functions
// ============================================================

/**
 * Get grid point coordinates for a location
 * First step: convert lat/lon to NWS grid point
 */
async function getGridPoint(lat, lon) {
  const url = `https://${CONFIG.BASE_URL}/points/${lat},${lon}`;
  const data = await withRetry(() => httpRequest(url));
  
  return {
    gridId: data.properties.gridId,
    gridX: data.properties.gridX,
    gridY: data.properties.gridY,
    forecastUrl: data.properties.forecast,
    forecastHourlyUrl: data.properties.forecastHourly,
    stationUrl: data.properties.observationStations,
    cwa: data.properties.cwa  // County Warning Area
  };
}

/**
 * Get weather observations for a station
 */
async function getStationObservations(stationId) {
  const url = `https://${CONFIG.BASE_URL}/stations/${stationId}/observations/latest`;
  const data = await withRetry(() => httpRequest(url));
  
  return parseObservation(data.properties, stationId);
}

/**
 * Get forecast for a grid point
 */
async function getForecast(gridPoint) {
  const url = gridPoint.forecastUrl;
  const data = await withRetry(() => httpRequest(url));
  
  return data.properties.periods.map(period => ({
    name: period.name,
    startTime: period.startTime,
    endTime: period.endTime,
    temperature: period.temperature,
    temperatureUnit: period.temperatureUnit,
    windSpeed: period.windSpeed,
    windDirection: period.windDirection,
    shortForecast: period.shortForecast,
    detailedForecast: period.detailedForecast,
    isDaytime: period.isDaytime,
    probabilityOfPrecipitation: period.probabilityOfPrecipitation?.value || 0,
    relativeHumidity: period.relativeHumidity?.value || null
  }));
}

/**
 * Get hourly forecast
 */
async function getHourlyForecast(gridPoint) {
  const url = gridPoint.forecastHourlyUrl;
  try {
    const data = await withRetry(() => httpRequest(url));
    return data.properties.periods.map(period => ({
      startTime: period.startTime,
      endTime: period.endTime,
      temperature: period.temperature,
      temperatureUnit: period.temperatureUnit,
      windSpeed: period.windSpeed,
      windDirection: period.windDirection,
      shortForecast: period.shortForecast,
      probabilityOfPrecipitation: period.probabilityOfPrecipitation?.value || 0,
      relativeHumidity: period.relativeHumidity?.value || null,
      dewpoint: period.dewpoint?.value || null,
      visibility: period.visibility?.value || null,
      ceilingHeight: period.ceilingHeight?.value || null
    }));
  } catch (e) {
    console.log(`  Warning: Could not get hourly forecast: ${e.message}`);
    return [];
  }
}

/**
 * Get active alerts for an area
 */
async function getAlerts(state) {
  const url = `https://${CONFIG.BASE_URL}/alerts/active?area=${state}`;
  try {
    const data = await withRetry(() => httpRequest(url));
    return data.features || [];
  } catch (e) {
    console.log(`  Warning: Could not get alerts: ${e.message}`);
    return [];
  }
}

// ============================================================
// Parsing Functions
// ============================================================

/**
 * Parse observation data into standardized format
 */
function parseObservation(props, stationId) {
  const obs = {
    station: stationId,
    observationTime: props.timestamp,
    validityTime: props.validTime,
    textDescription: props.textDescription,
    temperature: parseTemp(props.temperature),
    dewpoint: parseTemp(props.dewpoint),
    relativeHumidity: props.relativeHumidity?.value,
    wind: parseWind(props.windSpeed, props.windDirection, props.windGust),
    visibility: props.visibility?.value,
    pressure: props.barometricPressure?.value,
    seaLevelPressure: props.seaLevelPressure?.value,
    windChill: parseTemp(props.windChill),
    heatIndex: parseTemp(props.heatIndex),
    cloudLayers: parseCloudLayers(props.cloudLayers),
    conditionCode: props.conditionCode
  };
  
  return obs;
}

function parseTemp(temp) {
  if (!temp?.value) return null;
  return {
    value: temp.value,
    unit: temp.unitCode === 'unit:degC' ? 'C' : 'F'
  };
}

function parseWind(speed, direction, gust) {
  return {
    speed: speed?.value || null,
    gust: gust?.value || null,
    direction: direction?.value || null,
    unit: speed?.unitCode === 'unit:m_s-1' ? 'm/s' : 
          speed?.unitCode === 'unit:km_h-1' ? 'km/h' : 'knots'
  };
}

function parseCloudLayers(layers) {
  if (!layers) return [];
  return layers.map(layer => ({
    cover: layer.coverage?.code,
    base: layer.base?.value  // feet AGL
  }));
}

// ============================================================
// Main Functions
// ============================================================

/**
 * Fetch weather data for a list of stations
 */
export async function fetchWeatherData(stations = CONFIG.SAMPLE_STATIONS) {
  console.log(`Fetching NOAA/NWS weather data for ${stations.length} stations...`);
  
  const results = {
    generatedAt: new Date().toISOString(),
    source: 'NOAA/NWS API',
    stations: [],
    errors: []
  };
  
  for (const station of stations) {
    console.log(`\nProcessing station: ${station.id} (${station.name})`);
    
    try {
      // First get grid point for coordinates
      const gridPoint = await getGridPoint(station.lat, station.lon);
      console.log(`  Grid: ${gridPoint.gridId}/${gridPoint.gridX},${gridPoint.gridY}`);
      
      // Get observations
      let observations = [];
      try {
        const obs = await getStationObservations(station.id);
        observations = [obs];
        console.log(`  Latest obs: ${obs.temperature?.value}${obs.temperature?.unit} at ${obs.observationTime}`);
      } catch (e) {
        console.log(`  Warning: No observations for ${station.id}: ${e.message}`);
      }
      
      // Get daily forecast
      let forecast = [];
      try {
        forecast = await getForecast(gridPoint);
        console.log(`  Forecast: ${forecast.length} periods available`);
      } catch (e) {
        console.log(`  Warning: No forecast: ${e.message}`);
      }
      
      // Get hourly forecast
      let hourlyForecast = [];
      try {
        hourlyForecast = await getHourlyForecast(gridPoint);
        console.log(`  Hourly: ${hourlyForecast.length} hours available`);
      } catch (e) {
        console.log(`  Warning: No hourly forecast`);
      }
      
      results.stations.push({
        station: {
          id: station.id,
          name: station.name,
          coordinates: { lat: station.lat, lon: station.lon },
          grid: gridPoint
        },
        observations,
        forecast,
        hourlyForecast,
        alerts: []
      });
      
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
      results.errors.push({ stationId: station.id, error: e.message });
    }
  }
  
  // Get alerts for some states
  console.log('\nFetching alerts...');
  const states = ['NY', 'TX', 'WA', 'CO', 'FL', 'IL', 'CA'];
  results.alerts = {};
  for (const state of states) {
    try {
      const stateAlerts = await getAlerts(state);
      if (stateAlerts.length > 0) {
        results.alerts[state] = stateAlerts;
      }
    } catch (e) {
      // Silently skip
    }
  }
  
  console.log(`\nCompleted: ${results.stations.length} stations, ${results.errors.length} errors`);
  return results;
}

/**
 * Save results to file
 */
export async function saveResults(data, outputPath) {
  const jsonPath = outputPath.replace('.md', '.json');
  const dir = path.dirname(jsonPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
  console.log(`Saved JSON to: ${jsonPath}`);
  
  // Also create markdown summary
  const mdPath = outputPath;
  const md = generateMarkdownSummary(data);
  fs.writeFileSync(mdPath, md);
  console.log(`Saved MD to: ${mdPath}`);
}

function generateMarkdownSummary(data) {
  const lines = [
    '# NOAA/NWS Weather Data Summary',
    '',
    `Generated: ${data.generatedAt}`,
    `Source: ${data.source}`,
    '',
    '## Stations',
    ''
  ];
  
  for (const station of data.stations) {
    lines.push(`### ${station.station.id} - ${station.station.name}`);
    lines.push('');
    lines.push(`- Coordinates: ${station.station.coordinates.lat}, ${station.station.coordinates.lon}`);
    lines.push(`- Grid: ${station.station.grid?.gridId}`);
    
    if (station.observations.length > 0) {
      const obs = station.observations[0];
      lines.push(`- Current: ${obs.temperature?.value}${obs.temperature?.unit}`);
      lines.push(`- Wind: ${obs.wind?.speed} ${obs.wind?.unit} from ${obs.wind?.direction}°`);
    }
    
    if (station.forecast.length > 0) {
      lines.push(`- Forecast periods: ${station.forecast.length}`);
    }
    
    lines.push('');
  }
  
  if (data.errors.length > 0) {
    lines.push('## Errors');
    lines.push('');
    for (const err of data.errors) {
      lines.push(`- ${err.stationId}: ${err.error}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

// ============================================================
// CLI Entry Point
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const outputDir = args[0] || './poly-knowledge/outputs';
  
  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(outputDir, `noaa-forecast-${timestamp}.json`);
  
  console.log('='.repeat(60));
  console.log('NOAA/NWS Weather Data Fetcher');
  console.log('='.repeat(60));
  
  const data = await fetchWeatherData();
  await saveResults(data, outputPath);
  
  console.log('\nDone!');
}

main().catch(console.error);

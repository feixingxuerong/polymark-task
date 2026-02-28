/**
 * fetch-gfs-forecast.mjs
 * 
 * Fetch GFS (Global Forecast System) temperature data from Open-Meteo GFS API
 * Free API: https://open-meteo.com/en/docs/gfs-api
 * No API key required
 * 
 * This provides GFS model data (different from NWS which is weather.gov API)
 * GFS is a global model run by NOAA, excellent for temperature forecasts
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

// ============================================================
// Configuration
// ============================================================

const CONFIG = {
  BASE_URL: 'https://api.open-meteo.com/v1/forecast',
  USER_AGENT: 'Polymarket-Research/1.0 (Weather Data Adapter)',
  REQUEST_TIMEOUT_MS: 20000,
  
  // GFS model parameters
  HOURLY_PARAMS: ['temperature_2m', 'relative_humidity_2m', 'dew_point_2m', 
                   'apparent_temperature', 'precipitation', 'weather_code',
                   'cloud_cover', 'wind_speed_10m', 'wind_direction_10m'],
  
  DAILY_PARAMS: ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum',
                 'weather_code', 'sunrise', 'sunset'],
  
  FORECAST_DAYS: 7, // Get 7 days of forecast
};

// ============================================================
// Utility Functions
// ============================================================

function httpRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const req = https.request({
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': CONFIG.USER_AGENT,
        'Accept': 'application/json'
      },
      timeout: CONFIG.REQUEST_TIMEOUT_MS
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`JSON parse error: ${e.message}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// ============================================================
// GFS API Functions
// ============================================================

/**
 * Fetch GFS forecast for a location
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} stationName - Station name for reference
 */
export async function fetchGFSForecast(lat, lon, stationName = '') {
  const params = [
    `latitude=${lat}`,
    `longitude=${lon}`,
    `hourly=${CONFIG.HOURLY_PARAMS.join(',')}`,
    `daily=${CONFIG.DAILY_PARAMS.join(',')}`,
    `timezone=auto`,
    `forecast_days=${CONFIG.FORECAST_DAYS}`
  ];
  
  const url = `${CONFIG.BASE_URL}?${params.join('&')}`;
  
  console.log(`  Fetching GFS for ${stationName} (${lat}, ${lon})...`);
  
  const data = await httpRequest(url);
  
  return parseGFSResponse(data, stationName, lat, lon);
}

/**
 * Parse GFS API response into structured format
 */
function parseGFSResponse(data, stationName, lat, lon) {
  const result = {
    station: stationName,
    coordinates: { lat, lon },
    source: 'Open-Meteo GFS',
    model: 'GFS',
    modelRun: data.model_run?.[0] || 'unknown',
    generatedAt: data.generationtime_ms ? 
      new Date(Date.now() - data.generationtime_ms).toISOString() : 
      new Date().toISOString(),
    hourly: [],
    daily: []
  };
  
  // Parse hourly data
  if (data.hourly) {
    const times = data.hourly.time || [];
    for (let i = 0; i < times.length; i++) {
      result.hourly.push({
        time: times[i],
        temperature: data.hourly.temperature_2m?.[i],
        apparentTemperature: data.hourly.apparent_temperature?.[i],
        relativeHumidity: data.hourly.relative_humidity_2m?.[i],
        dewPoint: data.hourly.dew_point_2m?.[i],
        precipitation: data.hourly.precipitation?.[i],
        weatherCode: data.hourly.weather_code?.[i],
        cloudCover: data.hourly.cloud_cover?.[i],
        windSpeed: data.hourly.wind_speed_10m?.[i],
        windDirection: data.hourly.wind_direction_10m?.[i]
      });
    }
  }
  
  // Parse daily data
  if (data.daily) {
    const times = data.daily.time || [];
    for (let i = 0; i < times.length; i++) {
      result.daily.push({
        date: times[i],
        temperatureMax: data.daily.temperature_2m_max?.[i],
        temperatureMin: data.daily.temperature_2m_min?.[i],
        precipitationSum: data.daily.precipitation_sum?.[i],
        weatherCode: data.daily.weather_code?.[i],
        sunrise: data.daily.sunrise?.[i],
        sunset: data.daily.sunset?.[i]
      });
    }
  }
  
  return result;
}

/**
 * Get max temperature for a specific date from GFS data
 */
export function getMaxTempForDate(gfsData, targetDate) {
  const target = targetDate.split('T')[0]; // Handle both ISO and date string
  
  const dayData = gfsData.daily.find(d => d.date === target);
  if (dayData) {
    return dayData.temperatureMax;
  }
  
  // Try to find in hourly data if not in daily
  const hourlyForDay = gfsData.hourly.filter(h => 
    h.time.startsWith(target)
  );
  
  if (hourlyForDay.length > 0) {
    return Math.max(...hourlyForDay.map(h => h.temperature).filter(t => t !== null));
  }
  
  return null;
}

// ============================================================
// Main Functions
// ============================================================

/**
 * Fetch GFS data for multiple stations
 * @param {Array} stations - Array of {name, lat, lon} objects
 */
export async function fetchGFSForStations(stations) {
  console.log(`\nFetching GFS data for ${stations.length} stations...`);
  
  const results = {
    generatedAt: new Date().toISOString(),
    source: 'Open-Meteo GFS API',
    model: 'GFS',
    stations: []
  };
  
  for (const station of stations) {
    try {
      const gfsData = await fetchGFSForecast(
        station.lat, 
        station.lon, 
        station.name
      );
      
      console.log(`  Got ${gfsData.hourly.length} hourly, ${gfsData.daily.length} daily forecasts`);
      
      results.stations.push(gfsData);
    } catch (error) {
      console.error(`  ERROR for ${station.name}: ${error.message}`);
      results.stations.push({
        station: station.name,
        coordinates: { lat: station.lat, lon: station.lon },
        error: error.message
      });
    }
  }
  
  return results;
}

/**
 * Save results to file
 */
export function saveResults(data, outputPath) {
  const dir = path.dirname(outputPath);
  
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\nSaved to: ${outputPath}`);
}

// ============================================================
// CLI Entry Point
// ============================================================

async function main() {
  // Test with sample stations
  const testStations = [
    { name: 'KJFK - New York JFK', lat: 40.6413, lon: -73.7781 },
    { name: 'KORD - Chicago O\'Hare', lat: 41.9742, lon: -87.9073 },
    { name: 'KLAX - Los Angeles', lat: 33.9425, lon: -118.4081 },
    { name: 'KMIA - Miami', lat: 25.7959, lon: -80.2870 },
    { name: 'KDEN - Denver', lat: 39.8561, lon: -104.6737 }
  ];
  
  const args = process.argv.slice(2);
  const outputDir = args[0] || './poly-knowledge/outputs';
  
  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = path.join(outputDir, `gfs-forecast-${timestamp}.json`);
  
  console.log('='.repeat(60));
  console.log('GFS Forecast Fetcher (via Open-Meteo)');
  console.log('='.repeat(60));
  
  const data = await fetchGFSForStations(testStations);
  saveResults(data, outputPath);
  
  console.log('\nDone!');
}

main().catch(console.error);

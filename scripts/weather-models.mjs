/**
 * weather-models.mjs
 * 
 * Combined weather model fetcher: NWS + GFS
 * - Fetches NWS (weather.gov) and GFS (Open-Meteo) forecasts
 * - Calculates model_agreement_v2: difference between NWS and GFS maxTemp
 * - Outputs poly-knowledge/outputs/weather-models-YYYY-MM-DD.json
 * 
 * Usage: node weather-models.mjs [output-dir]
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { readFileSync } from 'fs';

// ============================================================
// Configuration
// ============================================================

const CONFIG = {
  // NWS API
  NWS_BASE_URL: 'api.weather.gov',
  NWS_USER_AGENT: 'Polymarket-Research/1.0 (Weather Data Adapter)',
  
  // GFS API (Open-Meteo)
  GFS_BASE_URL: 'https://api.open-meteo.com/v1/forecast',
  GFS_HOURLY: ['temperature_2m', 'apparent_temperature', 'weather_code'],
  GFS_DAILY: ['temperature_2m_max', 'temperature_2m_min', 'weather_code'],
  
  // Request timeouts
  TIMEOUT_MS: 15000,
  RETRY_DELAY_MS: 2000,
  MAX_RETRIES: 2,
};

// ============================================================
// Load Stations from YAML
// ============================================================

function loadStationsFromYaml() {
  const yamlPath = path.join(process.cwd(), 'poly-knowledge', 'config', 'stations.yaml');
  const yamlContent = fs.readFileSync(yamlPath, 'utf-8');
  const lines = yamlContent.split('\n');
  
  const stations = [];
  let currentStation = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // New station starts with "- name:"
    if (trimmed.startsWith('- name:')) {
      // Save previous station
      if (currentStation && currentStation.icao) {
        stations.push(currentStation);
      }
      
      // Parse name
      const name = trimmed.replace('- name:', '').replace(/["']/g, '').trim();
      currentStation = { name, icao: '', iata: '', nws_station: '', lat: 0, lon: 0 };
      continue;
    }
    
    // Parse other fields (indented under current station)
    if (currentStation) {
      if (trimmed.startsWith('icao:')) {
        currentStation.icao = trimmed.replace('icao:', '').replace(/["']/g, '').trim();
      } else if (trimmed.startsWith('iata:')) {
        currentStation.iata = trimmed.replace('iata:', '').replace(/["']/g, '').trim();
      } else if (trimmed.startsWith('nws_station:')) {
        currentStation.nws_station = trimmed.replace('nws_station:', '').replace(/["']/g, '').trim();
      }
    }
  }
  
  // Save last station
  if (currentStation && currentStation.icao) {
    stations.push(currentStation);
  }
  
  console.log(`  Loaded ${stations.length} stations from YAML`);
  
  // For simplicity, use hardcoded lat/lon for major stations
  // In production, would use a geocoding service
  const stationCoords = {
    'KJFK': { lat: 40.6413, lon: -73.7781 },
    'KLGA': { lat: 40.7769, lon: -73.8740 },
    'KEWR': { lat: 40.6895, lon: -74.1745 },
    'KBOS': { lat: 42.3656, lon: -71.0096 },
    'KPHL': { lat: 39.8729, lon: -75.2437 },
    'KIAD': { lat: 38.9531, lon: -77.4565 },
    'KDCA': { lat: 38.8512, lon: -77.0402 },
    'KATL': { lat: 33.6407, lon: -84.4277 },
    'KMIA': { lat: 25.7959, lon: -80.2870 },
    'KFLL': { lat: 26.0742, lon: -80.1504 },
    'KMCO': { lat: 28.4312, lon: -81.3081 },
    'KCLT': { lat: 35.2144, lon: -80.9473 },
    'KORD': { lat: 41.9742, lon: -87.9073 },
    'KMDW': { lat: 41.7868, lon: -87.7522 },
    'KMSP': { lat: 44.8820, lon: -93.2218 },
    'KDTW': { lat: 42.2162, lon: -83.3554 },
    'KDFW': { lat: 32.8998, lon: -97.0403 },
    'KDAL': { lat: 32.8471, lon: -96.8538 },
    'KIAH': { lat: 29.9902, lon: -95.3368 },
    'KAUS': { lat: 30.1945, lon: -97.6699 },
    'KDEN': { lat: 39.8561, lon: -104.6737 },
    'KLAX': { lat: 33.9425, lon: -118.4081 },
    'KSFO': { lat: 37.6213, lon: -122.3790 },
    'KSEA': { lat: 47.4502, lon: -122.3088 },
    'KPDX': { lat: 45.5898, lon: -122.5951 },
    'KLAS': { lat: 36.0840, lon: -115.1537 },
    'KPHX': { lat: 33.4484, lon: -112.0740 },
    'KSLC': { lat: 40.7899, lon: -111.9791 },
    'KSAN': { lat: 32.7336, lon: -117.1897 },
    'PHNL': { lat: 21.3187, lon: -157.9225 }
  };
  
  // Add coordinates to stations
  for (const station of stations) {
    const coords = stationCoords[station.icao] || stationCoords[station.nws_station];
    if (coords) {
      station.lat = coords.lat;
      station.lon = coords.lon;
    }
  }
  
  // Filter to only stations with coordinates
  return stations.filter(s => s.lat && s.lon);
}

// ============================================================
// HTTP Utilities
// ============================================================

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const req = client.request({
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': options.userAgent || CONFIG.NWS_USER_AGENT,
        'Accept': 'application/geo+json',
        ...options.headers
      },
      timeout: CONFIG.TIMEOUT_MS
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

async function withRetry(fn, retries = CONFIG.MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY_MS * (i + 1)));
    }
  }
}

// ============================================================
// NWS Fetcher
// ============================================================

async function fetchNWSForecast(station) {
  // First get grid point
  const gridUrl = `https://${CONFIG.NWS_BASE_URL}/points/${station.lat},${station.lon}`;
  const gridData = await withRetry(() => httpRequest(gridUrl, { 
    headers: { 'Accept': 'application/geo+json' } 
  }));
  
  const grid = {
    id: gridData.properties.gridId,
    x: gridData.properties.gridX,
    y: gridData.properties.gridY
  };
  
  // Get daily forecast
  const forecastUrl = gridData.properties.forecast;
  const forecastData = await withRetry(() => httpRequest(forecastUrl));
  
  const periods = forecastData.properties.periods.map(p => ({
    name: p.name,
    startTime: p.startTime,
    endTime: p.endTime,
    temperature: p.temperature,
    temperatureUnit: p.temperatureUnit,
    shortForecast: p.shortForecast,
    isDaytime: p.isDaytime
  }));
  
  return {
    station: station.icao || station.nws_station,
    name: station.name,
    grid,
    periods
  };
}

// ============================================================
// GFS Fetcher (Open-Meteo)
// ============================================================

async function fetchGFSForecast(station) {
  const params = [
    `latitude=${station.lat}`,
    `longitude=${station.lon}`,
    `hourly=${CONFIG.GFS_HOURLY.join(',')}`,
    `daily=${CONFIG.GFS_DAILY.join(',')}`,
    `timezone=auto`,
    `forecast_days=7`
  ];
  
  const url = `${CONFIG.GFS_BASE_URL}?${params.join('&')}`;
  const data = await withRetry(() => httpRequest(url, { 
    headers: { 'Accept': 'application/json' }
  }));
  
  const daily = data.daily?.time?.map((t, i) => ({
    date: t,
    temperatureMax: data.daily.temperature_2m_max?.[i],
    temperatureMin: data.daily.temperature_2m_min?.[i],
    weatherCode: data.daily.weather_code?.[i]
  })) || [];
  
  return {
    station: station.icao || station.nws_station,
    name: station.name,
    daily
  };
}

// ============================================================
// Model Agreement Calculator
// ============================================================

function calculateModelAgreement(nwsData, gfsData, targetDate) {
  // Find NWS maxTemp for target date (NWS returns Fahrenheit)
  const nwsDaytime = nwsData.periods.filter(p => p.isDaytime);
  const nwsHigh = nwsDaytime.find(p => p.startTime.startsWith(targetDate));
  
  // Find GFS maxTemp for target date (GFS returns Celsius)
  const gfsDay = gfsData.daily.find(d => d.date === targetDate);
  
  const nwsTempF = nwsHigh?.temperature ? parseInt(nwsHigh.temperature) : null;
  const gfsTempC = gfsDay?.temperatureMax;
  
  if (nwsTempF !== null && gfsTempC !== null) {
    // Convert GFS Celsius to Fahrenheit for comparison
    const gfsTempF = (gfsTempC * 9/5) + 32;
    const diff = Math.abs(nwsTempF - gfsTempF);
    return {
      nwsMaxTemp: nwsTempF,
      nwsMaxTempUnit: 'F',
      gfsMaxTemp: Math.round(gfsTempC * 10) / 10,
      gfsMaxTempUnit: 'C',
      gfsMaxTempConverted: Math.round(gfsTempF),
      difference: Math.round(diff * 10) / 10,
      differenceUnit: 'F',
      agreement: diff <= 3 ? 'high' : diff <= 6 ? 'medium' : 'low'
    };
  }
  
  return {
    nwsMaxTemp: nwsTempF,
    gfsMaxTemp: gfsTempC ? Math.round(gfsTempC * 10) / 10 : null,
    difference: null,
    agreement: 'insufficient_data'
  };
}

// ============================================================
// Main
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const outputDir = args[0] || './poly-knowledge/outputs';
  const today = new Date().toISOString().split('T')[0];
  const targetDate = args[1] || today; // Default to today for agreement calculation
  
  console.log('='.repeat(60));
  console.log('Weather Models: NWS + GFS');
  console.log('='.repeat(60));
  
  // Load stations
  console.log('\nLoading stations from stations.yaml...');
  const allStations = loadStationsFromYaml();
  
  // Select 3+ diverse stations for this task
  const selectedStations = [
    allStations.find(s => s.icao === 'KJFK'),  // NYC
    allStations.find(s => s.icao === 'KORD'),  // Chicago
    allStations.find(s => s.icao === 'KLAX'),  // LA
    allStations.find(s => s.icao === 'KMIA'),  // Miami
    allStations.find(s => s.icao === 'KDEN'),  // Denver
  ].filter(Boolean);
  
  console.log(`Selected ${selectedStations.length} stations: ${selectedStations.map(s => s.icao).join(', ')}`);
  
  // Fetch NWS data
  console.log('\n--- Fetching NWS Data ---');
  const nwsResults = [];
  for (const station of selectedStations) {
    try {
      console.log(`  Fetching NWS for ${station.icao}...`);
      const data = await fetchNWSForecast(station);
      nwsResults.push(data);
      console.log(`    Got ${data.periods.length} periods`);
    } catch (e) {
      console.error(`    ERROR: ${e.message}`);
    }
  }
  
  // Fetch GFS data
  console.log('\n--- Fetching GFS Data ---');
  const gfsResults = [];
  for (const station of selectedStations) {
    try {
      console.log(`  Fetching GFS for ${station.icao}...`);
      const data = await fetchGFSForecast(station);
      gfsResults.push(data);
      console.log(`    Got ${data.daily.length} days`);
    } catch (e) {
      console.error(`    ERROR: ${e.message}`);
    }
  }
  
  // Calculate model agreement
  console.log('\n--- Model Agreement ---');
  const agreements = [];
  for (let i = 0; i < selectedStations.length; i++) {
    const nws = nwsResults[i];
    const gfs = gfsResults[i];
    
    if (nws && gfs) {
      const agreement = calculateModelAgreement(nws, gfs, targetDate);
      agreements.push({
        station: nws.station,
        targetDate,
        ...agreement
      });
      console.log(`  ${nws.station}: NWS=${agreement.nwsMaxTemp}°F, GFS=${agreement.gfsMaxTemp}°C (${agreement.gfsMaxTempConverted}°F) → diff=${agreement.difference}°F (${agreement.agreement})`);
    }
  }
  
  // Build output
  const output = {
    generatedAt: new Date().toISOString(),
    targetDate,
    nws: {
      source: 'NOAA/NWS API (api.weather.gov)',
      description: 'National Weather Service forecast'
    },
    gfs: {
      source: 'Open-Meteo GFS API',
      description: 'Global Forecast System (GFS) model data'
    },
    stations: selectedStations.map(s => ({
      icao: s.icao,
      name: s.name,
      coordinates: { lat: s.lat, lon: s.lon }
    })),
    nwsSummaries: nwsResults.map(r => ({
      station: r.station,
      grid: r.grid,
      periods: r.periods.map(p => ({
        name: p.name,
        temperature: p.temperature,
        temperatureUnit: p.temperatureUnit,
        startTime: p.startTime
      }))
    })),
    gfsSummaries: gfsResults.map(r => ({
      station: r.station,
      daily: r.daily
    })),
    modelAgreement: {
      metric: 'model_agreement_v2',
      description: 'Difference between NWS and GFS max temperature for target date',
      version: '2.0',
      agreements
    }
  };
  
  // Save output
  const outputPath = path.join(outputDir, `weather-models-${today}.json`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nSaved to: ${outputPath}`);
  
  console.log('\nDone!');
}

main().catch(console.error);

/**
 * generate-weather-aviation-sources.mjs
 * 
 * Aggregates NOAA/NWS weather data and METAR/TAF aviation data
 * Outputs combined JSON and Markdown summary to poly-knowledge/outputs/
 * 
 * This script:
 * 1. Fetches weather data from NWS API
 * 2. Fetches METAR/TAF data from NWS API
 * 3. Combines into unified output
 * 4. Saves to poly-knowledge/outputs/weather-aviation-sources-YYYY-MM-DD.{json,md}
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the fetch modules
import { fetchWeatherData, saveResults as saveWeather } from './fetch-noaa-forecast.mjs';
import { fetchAviationData, saveResults as saveAviation } from './fetch-metar-taf.mjs';

// ============================================================
// Configuration
// ============================================================

const CONFIG = {
  // Output directory
  OUTPUT_DIR: path.join(__dirname, '..', 'poly-knowledge', 'outputs'),
  
  // Date format for output
  DATE_FORMAT: 'YYYY-MM-DD',
  
  // Data sources info
  SOURCES: {
    weather: {
      name: 'NOAA/NWS API',
      base_url: 'https://api.weather.gov',
      documentation: 'https://www.weather.gov/documentation/services-web-api',
      rate_limit: 'Generous, no key required',
      attribution: 'National Weather Service (NWS), NOAA'
    },
    aviation: {
      name: 'NWS Aviation Weather / TAF',
      base_url: 'https://api.weather.gov/stations/{stationId}/tafs',
      documentation: 'https://www.weather.gov/documentation/services-web-api',
      rate_limit: 'Same as NWS API',
      attribution: 'National Weather Service (NWS), NOAA'
    }
  }
};

function getTimestamp() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// ============================================================
// Main Aggregation Function
// ============================================================

export async function generateCombinedSources() {
  console.log('='.repeat(60));
  console.log('Weather & Aviation Data Sources Generator');
  console.log('='.repeat(60));
  console.log(`Date: ${getTimestamp()}`);
  console.log('');
  
  // Ensure output directory exists
  if (!fs.existsSync(CONFIG.OUTPUT_DIR)) {
    fs.mkdirSync(CONFIG.OUTPUT_DIR, { recursive: true });
  }
  
  // Fetch weather data
  console.log('\n[1/2] Fetching weather data...');
  console.log('-'.repeat(40));
  let weatherData = null;
  try {
    weatherData = await fetchWeatherData();
    console.log('Weather data fetched successfully');
  } catch (e) {
    console.error(`Weather fetch failed: ${e.message}`);
    weatherData = { error: e.message, stations: [] };
  }
  
  // Fetch aviation data
  console.log('\n[2/2] Fetching aviation data...');
  console.log('-'.repeat(40));
  let aviationData = null;
  try {
    aviationData = await fetchAviationData();
    console.log('Aviation data fetched successfully');
  } catch (e) {
    console.error(`Aviation fetch failed: ${e.message}`);
    aviationData = { error: e.message, airports: [] };
  }
  
  // Combine data
  console.log('\n[3/3] Combining data...');
  const combined = {
    // Metadata
    generated_at: new Date().toISOString(),
    version: '1.0.0',
    date: getTimestamp(),
    
    // Data sources
    sources: CONFIG.SOURCES,
    
    // Summary
    summary: {
      weather_stations: weatherData?.stations?.length || 0,
      weather_errors: weatherData?.errors?.length || 0,
      aviation_airports: aviationData?.airports?.length || 0,
      aviation_errors: aviationData?.errors?.length || 0
    },
    
    // Combined data
    data: {
      weather: weatherData || {},
      aviation: aviationData || {}
    }
  };
  
  // Save combined output
  const timestamp = getTimestamp();
  const jsonPath = path.join(CONFIG.OUTPUT_DIR, `weather-aviation-sources-${timestamp}.json`);
  const mdPath = path.join(CONFIG.OUTPUT_DIR, `weather-aviation-sources-${timestamp}.md`);
  
  // Save JSON
  fs.writeFileSync(jsonPath, JSON.stringify(combined, null, 2));
  console.log(`\nSaved JSON: ${jsonPath}`);
  
  // Generate and save Markdown
  const markdown = generateMarkdown(combined);
  fs.writeFileSync(mdPath, markdown);
  console.log(`Saved MD: ${mdPath}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('Generation complete!');
  console.log('='.repeat(60));
  
  return combined;
}

// ============================================================
// Markdown Generation
// ============================================================

function generateMarkdown(data) {
  const lines = [
    '# Weather & Aviation Data Sources',
    '',
    `**Generated:** ${data.generated_at}`,
    `**Version:** ${data.version}`,
    `**Date:** ${data.date}`,
    '',
    '---',
    '',
    '## Data Sources',
    '',
    '### Weather (NOAA/NWS)',
    '',
    `| Property | Value |`,
    '|----------|-------|',
    `| Name | ${data.sources.weather.name} |`,
    `| Base URL | ${data.sources.weather.base_url} |`,
    `| Documentation | [Link](${data.sources.weather.documentation}) |`,
    `| Rate Limit | ${data.sources.weather.rate_limit} |`,
    `| Attribution | ${data.sources.weather.attribution} |`,
    '',
    '### Aviation (METAR/TAF)',
    '',
    `| Property | Value |`,
    '|----------|-------|',
    `| Name | ${data.sources.aviation.name} |`,
    `| Base URL | ${data.sources.aviation.base_url} |`,
    `| Documentation | [Link](${data.sources.aviation.documentation}) |`,
    `| Rate Limit | ${data.sources.aviation.rate_limit} |`,
    `| Attribution | ${data.sources.aviation.attribution} |`,
    '',
    '---',
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    '|--------|-------|',
    `| Weather Stations | ${data.summary.weather_stations} |`,
    `| Weather Errors | ${data.summary.weather_errors} |`,
    `| Aviation Airports | ${data.summary.aviation_airports} |`,
    `| Aviation Errors | ${data.summary.aviation_errors} |`,
    '',
    '---',
    ''
  ];
  
  // Add weather stations section
  if (data.data.weather?.stations?.length > 0) {
    lines.push('## Weather Stations', '');
    lines.push('| Station | Name | Coordinates | Latest Temp |', 
                '|--------|------|-------------|-------------|');
    
    for (const station of data.data.weather.stations) {
      const coords = `${station.station?.coordinates?.lat}, ${station.station?.coordinates?.lon}`;
      const temp = station.observations?.[0]?.temperature?.value !== null ? 
        `${station.observations[0].temperature.value}${station.observations[0].temperature.unit}` : '-';
      lines.push(`| ${station.station?.id || '-'} | ${station.station?.name || '-'} | ${coords} | ${temp} |`);
    }
    lines.push('');
  }
  
  // Add aviation airports section
  if (data.data.aviation?.airports?.length > 0) {
    lines.push('## Aviation Airports', '');
    lines.push('| ICAO | Airport | City | METAR | TAF | Flight Category |', 
                '|------|--------|------|-------|-----|-----------------|');
    
    for (const ap of data.data.aviation.airports) {
      const metar = ap.metar ? 'Yes' : 'No';
      const taf = ap.taf ? 'Yes' : 'No';
      const category = ap.metar?.flightCategory || '-';
      lines.push(`| ${ap.airport.icao} | ${ap.airport.name} | ${ap.airport.city} | ${metar} | ${taf} | ${category} |`);
    }
    lines.push('');
  }
  
  // Add notes
  lines.push('---', '', '## Notes', '', 
    '- Data fetched from NOAA/NWS public APIs (no API key required)',
    '- Rate limits are generous but please use responsibly',
    '- User-Agent header is set to identify the application',
    '- All times are in UTC unless otherwise noted',
    '- For settlement verification, cross-reference with official sources',
    '',
    '---',
    '',
    '*This file is auto-generated. Do not edit manually.*'
  );
  
  return lines.join('\n');
}

// ============================================================
// CLI Entry Point
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  
  // Allow custom output directory
  if (args[0]) {
    CONFIG.OUTPUT_DIR = args[0];
  }
  
  await generateCombinedSources();
}

main().catch(console.error);

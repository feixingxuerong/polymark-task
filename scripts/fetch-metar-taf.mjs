/**
 * fetch-metar-taf.mjs
 * 
 * Fetch METAR and TAF data from NWS Aviation Weather
 * Public endpoint: https://api.weather.gov
 * No API key required
 * 
 * Constraints:
 * - Free to use
 * - Requires User-Agent identification  
 * - Rate limited (same as NWS API)
 * - Retry on failure
 */

import https from 'https';
import fs from 'fs';
import path from 'path';

// ============================================================
// Configuration
// ============================================================

const CONFIG = {
  USER_AGENT: 'Polymarket-Research/1.0 (Aviation Weather Adapter; contact: research@polymarket.local)',
  BASE_URL: 'api.weather.gov',
  RETRY_DELAY_MS: 1000,
  MAX_RETRIES: 3,
  REQUEST_TIMEOUT_MS: 15000,
  
  // Sample airports for testing (major international airports)
  SAMPLE_AIRPORTS: [
    { icao: 'KJFK', iata: 'JFK', name: 'John F. Kennedy International', city: 'New York', lat: 40.6413, lon: -73.7781 },
    { icao: 'KLAX', iata: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', lat: 33.9425, lon: -118.4081 },
    { icao: 'KORD', iata: 'ORD', name: "O'Hare International", city: 'Chicago', lat: 41.9742, lon: -87.9073 },
    { icao: 'KDFW', iata: 'DFW', name: 'Dallas/Fort Worth International', city: 'Dallas', lat: 32.8998, lon: -97.0403 },
    { icao: 'KDEN', iata: 'DEN', name: 'Denver International', city: 'Denver', lat: 39.8561, lon: -104.6737 },
    { icao: 'KSEA', iata: 'SEA', name: 'Seattle-Tacoma International', city: 'Seattle', lat: 47.4502, lon: -122.3088 },
    { icao: 'KMIA', iata: 'MIA', name: 'Miami International', city: 'Miami', lat: 25.7959, lon: -80.2870 },
    { icao: 'EGLL', iata: 'LHR', name: 'London Heathrow', city: 'London', lat: 51.4700, lon: -0.4543 },
    { icao: 'LFPG', iata: 'CDG', name: 'Paris Charles de Gaulle', city: 'Paris', lat: 49.0097, lon: 2.5479 },
    { icao: 'RJTT', iata: 'NRT', name: 'Tokyo Narita International', city: 'Tokyo', lat: 35.7720, lon: 140.3929 }
  ]
};

// ============================================================
// Utility Functions
// ============================================================

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
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
    
    req.end();
  });
}

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
 * Get METAR for a station
 * Note: NWS API provides METAR-like data in observations
 */
async function getMetar(stationId) {
  // Use the observations endpoint which provides METAR-like data
  const url = `https://${CONFIG.BASE_URL}/stations/${stationId}/observations/latest`;
  const data = await withRetry(() => httpRequest(url));
  
  return parseMetar(data.properties, stationId);
}

/**
 * Get TAF (Terminal Aerodrome Forecast) for a station
 * Note: NWS API now provides TAF data
 */
async function getTaf(stationId) {
  const url = `https://${CONFIG.BASE_URL}/stations/${stationId}/tafs`;
  const data = await withRetry(() => httpRequest(url));
  
  if (!data.features || data.features.length === 0) {
    return null;
  }
  
  return parseTaf(data.features[0].properties, stationId);
}

/**
 * Get METARs for multiple stations in batch
 */
async function getMetarsBatch(stationIds) {
  // NWS API supports querying multiple stations
  const url = `https://${CONFIG.BASE_URL}/observations/latest?stations=${stationIds.join(',')}`;
  
  try {
    const data = await withRetry(() => httpRequest(url));
    return (data.features || []).map(f => parseMetar(f.properties, f.properties.stationId));
  } catch (e) {
    console.log(`  Warning: Batch METAR failed: ${e.message}`);
    return [];
  }
}

// ============================================================
// Parsing Functions
// ============================================================

function parseMetar(props, stationId) {
  // Map NWS observation data to METAR-like format
  const metar = {
    station: stationId,
    rawText: props.rawOb || null,  // Some stations provide raw METAR
    observationTime: props.timestamp,
    validityTime: props.validTime,
    
    // Flight category based on visibility and ceiling
    flightCategory: determineFlightCategory(props),
    
    // Wind
    wind: parseWindData(props),
    
    // Visibility
    visibility: props.visibility?.value ? 
      { meters: props.visibility.value, miles: props.visibility.value / 1609.34 } : null,
    
    // Clouds
    clouds: parseCloudLayers(props.cloudLayers),
    
    // Temperature/Dewpoint
    temperature: props.temperature?.value ? {
      celsius: props.temperature.value,
      fahrenheit: props.temperature.value * 9/5 + 32
    } : null,
    dewpoint: props.dewpoint?.value ? {
      celsius: props.dewpoint.value,
      fahrenheit: props.dewpoint.value * 9/5 + 32
    } : null,
    
    // Pressure
    pressure: props.barometricPressure?.value ? {
      mb: props.barometricPressure.value / 100,  // Pa to mb
      inches: props.barometricPressure.value / 3386.39  // Pa to inHg
    } : null,
    
    // Weather phenomena
    weather: parseWeatherPhenomena(props),
    
    // Raw properties for debugging
    rawProperties: props
  };
  
  return metar;
}

function parseTaf(props, stationId) {
  const taf = {
    station: stationId,
    rawText: props.rawTaf || null,
    issueTime: props.issueTime,
    validFrom: props.validTimeFrom,
    validUntil: props.validTimeTo,
    
    // Parse forecast periods
    forecast: []
  };
  
  // TAF data structure in NWS API
  if (props.forecast) {
    taf.forecast = props.forecast.map(f => ({
      from: f.validTimeFrom,
      to: f.validTimeTo,
      changeIndicator: f.changeIndicator,
      wind: parseWindData(f),
      visibility: f.visibility?.value ? 
        { meters: f.visibility.value, miles: f.visibility.value / 1609.34 } : null,
      clouds: parseCloudLayers(f.cloudLayers),
      weather: parseWeatherPhenomena(f),
      probability: f.probability
    }));
  }
  
  return taf;
}

function parseWindData(props) {
  const wind = {
    speed: null,
    gust: null,
    direction: null,
    unit: 'knots'
  };
  
  if (props.windSpeed?.value) {
    // NWS API returns m/s typically
    const ms = props.windSpeed.value;
    wind.speed = Math.round(ms * 1.94384);  // m/s to knots
    wind.speedMs = ms;
  }
  
  if (props.windGust?.value) {
    const ms = props.windGust.value;
    wind.gust = Math.round(ms * 1.94384);
  }
  
  if (props.windDirection?.value !== undefined) {
    wind.direction = props.windDirection.value;
    wind.directionCompass = degreesToCompass(wind.direction);
  }
  
  return wind;
}

function parseCloudLayers(layers) {
  if (!layers || !Array.isArray(layers)) return [];
  
  return layers.map(layer => ({
    cover: mapCloudCover(layer.coverage?.code),
    baseFt: layer.base?.value ? Math.round(layer.base.value * 3.28084) : null,  // m to ft
    type: layer.cloudType?.code || null
  }));
}

function parseWeatherPhenomena(props) {
  const phenomena = [];
  
  // Map weather condition codes
  if (props.conditionCode) {
    phenomena.push(props.conditionCode);
  }
  
  // Map individual weather elements
  if (props.precipitation) phenomena.push('RA');  // Rain
  if (props.snowfall) phenomena.push('SN');       // Snow
  if (props.fog) phenomena.push('FG');            // Fog
  if (props.haze) phenomena.push('HZ');           // Haze
  
  return phenomena;
}

function determineFlightCategory(props) {
  // Get visibility in statute miles
  const visSm = props.visibility?.value ? props.visibility.value / 1609.34 : 10;
  
  // Get ceiling (lowest cloud layer in feet)
  let ceiling = null;
  if (props.cloudLayers && props.cloudLayers.length > 0) {
    const bases = props.cloudLayers
      .filter(l => l.base?.value)
      .map(l => l.base.value * 3.28084);
    if (bases.length > 0) {
      ceiling = Math.min(...bases);
    }
  }
  
  // Determine flight category
  if (ceiling && ceiling < 200 || visSm < 0.5) return 'LIFR';
  if (ceiling && ceiling < 500 || visSm < 1) return 'IFR';
  if (ceiling && ceiling < 1000 || visSm < 3) return 'MVFR';
  return 'VFR';
}

function degreesToCompass(deg) {
  const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 
                'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const idx = Math.round(deg / 22.5) % 16;
  return dirs[idx];
}

function mapCloudCover(code) {
  const map = {
    'CLR': 'clear',
    'SKC': 'clear',
    'FEW': 'FEW',
    'SCT': 'SCT',
    'BKN': 'BKN',
    'OVC': 'OVC',
    'VV': 'VV'
  };
  return map[code] || code;
}

// ============================================================
// Main Functions
// ============================================================

/**
 * Fetch METAR/TAF data for airports
 */
export async function fetchAviationData(airports = CONFIG.SAMPLE_AIRPORTS) {
  console.log(`Fetching METAR/TAF data for ${airports.length} airports...`);
  
  const results = {
    generatedAt: new Date().toISOString(),
    source: 'NWS Aviation Weather API',
    airports: [],
    errors: []
  };
  
  for (const airport of airports) {
    console.log(`\nProcessing airport: ${airport.icao} (${airport.name})`);
    
    const airportData = {
      airport: {
        icao: airport.icao,
        iata: airport.iata,
        name: airport.name,
        city: airport.city,
        coordinates: { lat: airport.lat, lon: airport.lon }
      },
      metar: null,
      taf: null
    };
    
    // Get METAR
    try {
      const metar = await getMetar(airport.icao);
      airportData.metar = metar;
      console.log(`  METAR: ${metar.flightCategory} (${metar.observationTime})`);
      if (metar.temperature) {
        console.log(`  Temp: ${metar.temperature.celsius}°C, Wind: ${metar.wind.speed}kt ${metar.wind.directionCompass || ''}`);
      }
    } catch (e) {
      console.log(`  Warning: METAR failed: ${e.message}`);
      results.errors.push({ airport: airport.icao, type: 'metar', error: e.message });
    }
    
    // Get TAF
    try {
      const taf = await getTaf(airport.icao);
      if (taf) {
        airportData.taf = taf;
        console.log(`  TAF: ${taf.issueTime} valid ${taf.validFrom} to ${taf.validUntil}`);
        if (taf.forecast) {
          console.log(`  Forecast periods: ${taf.forecast.length}`);
        }
      } else {
        console.log(`  TAF: Not available`);
      }
    } catch (e) {
      console.log(`  Warning: TAF failed: ${e.message}`);
      // Don't add to errors, TAF not available for all stations
    }
    
    results.airports.push(airportData);
  }
  
  console.log(`\nCompleted: ${results.airports.length} airports, ${results.errors.length} errors`);
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
    '# METAR/TAF Aviation Data Summary',
    '',
    `Generated: ${data.generatedAt}`,
    `Source: ${data.source}`,
    '',
    '## Airports',
    ''
  ];
  
  // Summary table
  lines.push('| ICAO | Airport | METAR | TAF | Flight Category |');
  lines.push('|------|---------|-------|-----|-----------------|');
  
  for (const ap of data.airports) {
    const metarStatus = ap.metar ? 'Yes' : 'No';
    const tafStatus = ap.taf ? 'Yes' : 'No';
    const category = ap.metar?.flightCategory || '-';
    lines.push(`| ${ap.airport.icao} | ${ap.airport.city} | ${metarStatus} | ${tafStatus} | ${category} |`);
  }
  
  lines.push('');
  
  // Detailed section
  for (const ap of data.airports) {
    if (ap.metar) {
      lines.push(`### ${ap.airport.icao} - ${ap.airport.name}`);
      lines.push('');
      
      if (ap.metar.temperature) {
        lines.push(`- Temperature: ${ap.metar.temperature.celsius}°C (${ap.metar.temperature.fahrenheit}°F)`);
        lines.push(`- Dewpoint: ${ap.metar.dewpoint?.celsius || '-'}°C`);
      }
      
      if (ap.metar.wind.speed) {
        lines.push(`- Wind: ${ap.metar.wind.speed}kt ${ap.metar.wind.directionCompass || ''}`);
        if (ap.metar.wind.gust) {
          lines.push(`- Gusts: ${ap.metar.wind.gust}kt`);
        }
      }
      
      if (ap.metar.visibility) {
        lines.push(`- Visibility: ${ap.metar.visibility.miles.toFixed(1)} SM`);
      }
      
      if (ap.metar.clouds && ap.metar.clouds.length > 0) {
        const cloudStr = ap.metar.clouds
          .filter(c => c.cover !== 'clear')
          .map(c => `${c.cover} ${c.baseFt ? c.baseFt + 'ft' : ''}`)
          .join(', ');
        if (cloudStr) {
          lines.push(`- Clouds: ${cloudStr}`);
        }
      }
      
      if (ap.metar.pressure?.inches) {
        lines.push(`- Pressure: ${ap.metar.pressure.inches.toFixed(2)} inHg`);
      }
      
      lines.push('');
    }
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
  const outputPath = path.join(outputDir, `metar-taf-${timestamp}.json`);
  
  console.log('='.repeat(60));
  console.log('METAR/TAF Aviation Weather Fetcher');
  console.log('='.repeat(60));
  
  const data = await fetchAviationData();
  await saveResults(data, outputPath);
  
  console.log('\nDone!');
}

main().catch(console.error);

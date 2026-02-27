# Weather Data Adapters - NOAA/NWS + METAR/TAF

Read-only data fetchers for NOAA/NWS APIs and aviation weather (METAR/TAF).

## Overview

This module provides two main fetchers:
1. **NOAA/NWS Forecast** (`fetch-noaa-forecast.mjs`) - General weather data
2. **METAR/TAF** (`fetch-metar-taf.mjs`) - Aviation weather data

Both use the free NWS API at `api.weather.gov` - no API key required.

## API Details

### NWS API (api.weather.gov)

- **Base URL**: `https://api.weather.gov`
- **Authentication**: None (public), but requires `User-Agent` header
- **Rate Limits**: ~10 req/sec recommended, ~5000/day
- **Endpoints Used**:
  - `/points/{lat},{lon}` - Grid point lookup
  - `/stations/{stationId}/observations/latest` - Current conditions
  - `/stations/{stationId}/tafs` - Terminal Aerodrome Forecasts
  - `/alerts/active?area={state}` - Weather alerts

### METAR/TAF Coverage

- METAR (aviation routine weather report): US stations + some international
- TAF (terminal forecast): Limited coverage (mostly major US airports)

## Usage

```bash
# Fetch NOAA/NWS weather data
node scripts/fetch-noaa-forecast.mjs ./output-dir

# Fetch METAR/TAF aviation data
node scripts/fetch-metar-taf.mjs ./output-dir
```

### Programmatic Usage

```javascript
import { fetchWeatherData } from './scripts/fetch-noaa-forecast.mjs';
import { fetchAviationData } from './scripts/fetch-metar-taf.mjs';

// NOAA weather for custom stations
const stations = [
  { id: 'KJFK', name: 'JFK Airport', lat: 40.6413, lon: -73.7781 }
];
const weather = await fetchWeatherData(stations);

// METAR/TAF for airports
const airports = [
  { icao: 'KJFK', iata: 'JFK', name: 'JFK International', city: 'New York', lat: 40.6413, lon: -73.7781 }
];
const aviation = await fetchAviationData(airports);
```

## Rate Limiting & Caching

### Built-in Rate Limiting
- **Retry logic**: Exponential backoff (1s, 2s, 4s)
- **Max retries**: 3 attempts per request
- **Request timeout**: 15 seconds
- **Recommended**: Add 100-200ms delay between batch requests

### Caching Recommendations
For production use, implement caching:
```javascript
// Example: Cache weather data for 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

async function getCachedWeather(key, fetcher) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}
```

## Output Format

Scripts generate both JSON and markdown summaries in `./poly-knowledge/outputs/`:
- `noaa-forecast-YYYY-MM-DD.json` - Full weather data
- `metar-taf-YYYY-MM-DD.json` - Aviation data

## Data Schemas

### NOAA Weather Data
```json
{
  "generatedAt": "2026-02-28T00:00:00.000Z",
  "source": "NOAA/NWS API",
  "stations": [{
    "station": { "id": "KJFK", "name": "...", "grid": {...} },
    "observations": [{ "temperature": {"value": 3.9, "unit": "F"}, ... }],
    "forecast": [{ "name": "Today", "temperature": 45, ... }],
    "hourlyForecast": [...]
  }]
}
```

### METAR/TAF Data
```json
{
  "generatedAt": "2026-02-28T00:00:00.000Z",
  "source": "NWS Aviation Weather API",
  "airports": [{
    "airport": { "icao": "KJFK", "iata": "JFK", "name": "...", "coordinates": {...} },
    "metar": { "flightCategory": "VFR", "temperature": {...}, "wind": {...}, "visibility": {...} },
    "taf": { "issueTime": "...", "forecast": [...] }
  }]
}
```

## Flight Categories

| Category | Visibility | Ceiling | Description |
|----------|------------|---------|-------------|
| VFR | >5sm | >3000ft | Visual Flight Rules |
| MVFR | 3-5sm | 1000-3000ft | Marginal VFR |
| IFR | 1-3sm | 500-1000ft | Instrument Flight Rules |
| LIFR | <1sm | <500ft | Low Instrument Flight Rules |

## Links

- NWS API Documentation: https://www.weather.gov/documentation/services-web-api
- NWS API GitHub: https://github.com/nationalweather service/nws-api
- Aviation Weather: https://aviationweather.gov
- METAR Format: https://www.weather.gov/media/lot/CHIP/metar.pdf

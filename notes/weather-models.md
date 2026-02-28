# Weather Models Documentation

## Overview

This document describes the weather model integration for Polymarket weather markets, specifically Issue #41:接入免费 GFS 温度序列 + 一致性指标。

## Data Sources

### NWS (National Weather Service)
- **API**: `api.weather.gov`
- **Type**: Point-based forecast
- **Data**: 7-14 day forecast periods (12-hour intervals)
- **Temperature Unit**: Fahrenheit
- **Update Frequency**: Updated frequently (hourly)
- **URL Pattern**: `https://api.weather.gov/gridpoints/{gridId}/{gridX},{gridY}/forecast`

### GFS (Global Forecast System)
- **API**: Open-Meteo GFS API (`https://api.open-meteo.com/v1/forecast`)
- **Type**: Global model forecast
- **Data**: Hourly and daily forecasts up to 7 days
- **Temperature Unit**: Celsius
- **Update Frequency**: Updated every 6 hours (GFS model run)
- **Coverage**: Global (not limited to US but optimized for US data)

## Model Agreement Metric (model_agreement_v2)

### Definition
`model_agreement_v2` measures the difference between NWS and GFS maximum temperature predictions for a target date.

### Calculation
```
difference = |NWS_maxTemp_F - GFS_maxTemp_F|
```

Where:
- `NWS_maxTemp_F`: NWS forecast maximum temperature in Fahrenheit
- `GFS_maxTemp_F`: GFS forecast maximum temperature converted from Celsius to Fahrenheit

### Agreement Levels
| Difference (°F) | Level  | Description |
|-----------------|--------|-------------|
| ≤ 3             | high   | Models strongly agree |
| 4-6             | medium | Models moderately agree |
| > 6             | low    | Models disagree |

## Usage

### Running the Script

```bash
node scripts/weather-models.mjs [output-dir] [target-date]
```

Parameters:
- `output-dir`: Directory for output (default: `./poly-knowledge/outputs`)
- `target-date`: Target date for agreement calculation (default: today)

### Output

The script generates:
- `weather-models-YYYY-MM-DD.json`: Combined NWS + GFS data with model agreement

## Stations

The system uses stations defined in `poly-knowledge/config/stations.yaml`. For testing, 5 diverse US airports are selected:
- KJFK (New York JFK)
- KORD (Chicago O'Hare)
- KLAX (Los Angeles)
- KMIA (Miami)
- KDEN (Denver)

## Implementation Notes

### Why Open-Meteo GFS?
- Free, no API key required
- Provides GFS model data directly
- Simple JSON API (no GRIB2 parsing needed)
- Good reliability and coverage

### Temperature Conversion
- NWS: Fahrenheit (native)
- GFS: Celsius (converted to Fahrenheit for comparison)

### Known Limitations
1. GFS has ~6 hour update latency vs NWS more frequent updates
2. Grid point mapping differs between NWS and GFS
3. Target date must exist in both forecasts for valid comparison

## References

- NWS API Documentation: https://www.weather.gov/documentation/services-web-api
- Open-Meteo GFS API: https://open-meteo.com/en/docs/gfs-api

## Changelog

- 2026-02-28: Initial implementation (Issue #41)
  - Added GFS fetcher via Open-Meteo
  - Added model_agreement_v2 metric
  - Added weather-models output JSON

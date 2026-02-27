# Weather Market Monitoring Pipeline

> Issue #12: Minimal Viable Product for weather market monitoring/filtering pipeline

## Overview

This pipeline fetches weather-related prediction markets from Polymarket's Gamma API, binds them to official weather stations, and adds risk annotations based on Issue #10 criteria.

## Quick Start

```bash
# Generate sample watchlist (no API needed)
python run.py --sample

# Run full pipeline with sample data
python run.py --full

# Fetch real markets from Gamma API
python run.py --fetch

# Fetch and bind stations
python run.py --fetch --bind

# Full pipeline with real data
python run.py --fetch --bind --annotate
```

## Output Formats

```bash
# JSON output (default)
python run.py --sample --output weather-watchlist.json

# Markdown output
python run.py --sample --format markdown --output weather-watchlist.md
```

## Files

| File | Description |
|------|-------------|
| `run.py` | CLI entry point |
| `fetch_weather_markets.py` | Fetch markets from Gamma API |
| `bind_stations.py` | Map locations to weather stations |
| `risk_annotator.py` | Add risk flags per Issue #10 |
| `requirements.txt` | Python dependencies |

## Risk Flags

The pipeline annotates markets with these risk flags:

- `TIME_WINDOW_UNCLEAR` - Time window/hours not specified
- `TIMEZONE_AMBIGUOUS` - UTC vs local timezone not specified  
- `STATION_UNSPECIFIED` - No specific weather station mentioned
- `THRESHOLD_VAGUE` - Threshold value unclear or ambiguous
- `DATA_SOURCE_UNCLEAR` - Resolution data source not specified
- `BOUNDARY_UNCLEAR` - Boundary value handling unclear (>= vs >)
- `NO_VERIFICATION_SOURCE` - No publicly verifiable data source

## Data Sources

- **Market Data**: Polymarket Gamma API
- **Weather Data**: Open-Meteo, NOAA/NCEI, METAR

## Output Schema

```json
{
  "generated_at": "2026-02-27T17:00:00Z",
  "source": "sample|gamma_api",
  "markets": [
    {
      "market_id": "...",
      "question": "...",
      "liquidity_usd": 0,
      "volume_usd": 0,
      "bid": 0.0,
      "ask": 0.0,
      "risk_level": "low|medium|high",
      "risk_flags": [...],
      "station": {...},
      "resolution_source": "..."
    }
  ]
}
```

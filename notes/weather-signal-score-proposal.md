# Weather Signal Score Model Proposal

## Overview

This proposal outlines a scoring model that combines **NWS hourly forecast data** (temperature, precipitation, wind) with **METAR trends** (visibility, ceiling, wind) to generate a quantified `weather_signal_score` (0-100) for each station/airport. The score is designed to help Polymarket watchlist ranking by quantifying weather prediction confidence and data quality.

---

## 1. Feature List

### 1.1 NWS Hourly Forecast Features

| Feature | Source Field | Type | Description |
|---------|--------------|------|-------------|
| `temp_forecast` | `hourly.temperature[i]` | float | Temperature (°F) at hour i |
| `precip_prob` | `hourly.probabilityOfPrecipitation[i]` | float | Probability of precipitation (%) 0-100 |
| `precip_amount` | `hourly.quantitativePrecipitation[i]` | float | Precipitation amount (inches) |
| `wind_speed` | `hourly.windSpeed[i]` | float | Wind speed (mph) |
| `wind_direction` | `hourly.windDirection[i]` | int | Wind direction (degrees 0-360) |
| `humidity` | `hourly.relativeHumidity[i]` | float | Relative humidity (%) |
| `dewpoint` | `hourly.dewpoint[i]` | float | Dewpoint temperature (°F) |
| `forecast_validTime` | `hourly.validTime[i]` | datetime | Forecast timestamp |

### 1.2 METAR Trend Features

| Feature | Source Field | Type | Description |
|---------|--------------|------|-------------|
| `visibility` | `METAR.visibility` | float | Statute miles |
| `ceiling` | `METAR.layers[].ceiling` | int | Cloud ceiling altitude (ft AGL) |
| `current_wind` | `METAR.wind.speed` | float | Current wind speed (mph) |
| `wind_gust` | `METAR.wind.gust` | float | Wind gust speed (mph) |
| `present_weather` | `METAR.weather[]` | string | Current weather phenomena |
| `obs_time` | `METAR.dateTime` | datetime | Observation timestamp |
| `trend` | `METAR.trend` | object | Trend analysis (BECMG/TEMPO) |

### 1.3 Derived Features

| Feature | Calculation | Purpose |
|---------|-------------|---------|
| `temp_anomaly` | `temp_forecast - climatology[station][month]` | Temperature deviation from normal |
| `precip_confidence` | `1 - std(precip_prob[0:6h]) / 50` | Model agreement on precip |
| `visibility_trend` | `visibility[t] - visibility[t-1]` | Visibility improvement/degradation |
| `ceiling_trend` | `ceiling[t] - ceiling[t-1]` | Cloud layer changes |
| `wind_consistency` | `1 - std(wind_speed[0:6h]) / max(wind_speed)` | Wind stability |

---

## 2. Scoring Formula

### 2.1 Component Scores (0-100 each)

```
signal_score = w1 * data_quality + w2 * forecast_confidence + w3 * volatility_penalty + w4 * recency_bonus
```

Where:
- `w1 = 0.35` (Data Quality)
- `w2 = 0.35` (Forecast Confidence)
- `w3 = 0.15` (Volatility Penalty)
- `w4 = 0.15` (Recency Bonus)

### 2.2 Data Quality Score (0-100)

```python
def calculate_data_quality_score(metar, nws):
    scores = []
    
    # METAR completeness (30%)
    metar_fields = ['visibility', 'ceiling', 'wind', 'temp', 'dewpoint']
    metar_completeness = sum(1 for f in metar_fields if metar.get(f) is not None) / len(metar_fields)
    scores.append(metar_completeness * 100)
    
    # NWS forecast coverage (30%)
    nws_fields = ['temperature', 'precipitation', 'wind', 'humidity']
    nws_completeness = sum(1 for f in nws_fields if nws.get(f) is not None) / len(nws_fields)
    scores.append(nws_completeness * 100)
    
    # Source reliability (40%)
    # NOAA LCD > METAR > OpenWeatherMap
    source_weights = {
        'NOAA LCD': 1.0,
        'METAR': 0.9,
        'NWS API': 0.85,
        'OpenWeatherMap': 0.7,
        'Unknown': 0.5
    }
    source_score = source_weights.get(nws.get('source', 'Unknown'), 0.5) * 100
    scores.append(source_score)
    
    return np.mean(scores)
```

### 2.3 Forecast Confidence Score (0-100)

```python
def calculate_forecast_confidence(nws_hourly, target_time):
    # Extract forecast window around target time
    target_idx = find_nearest_hour(nws_hourly, target_time)
    window = nws_hourly[max(0, target_idx-3):target_idx+4]  # ±3 hours
    
    # Model agreement on key variables
    # Precipitation agreement
    precip_probs = [h.get('probabilityOfPrecipitation', 0) for h in window]
    precip_std = np.std(precip_probs) if precip_probs else 50
    precip_agreement = max(0, 100 - precip_std)
    
    # Temperature consistency
    temps = [h.get('temperature', 0) for h in window]
    temp_std = np.std(temps) if temps else 30
    temp_agreement = max(0, 100 - temp_std * 2)
    
    # Wind consistency
    winds = [h.get('windSpeed', 0) for h in window]
    wind_std = np.std(winds) if winds else 20
    wind_agreement = max(0, 100 - wind_std * 2)
    
    # Ensemble spread (if multiple models available)
    ensemble_score = 100 - min(50, nws.get('ensemble_spread', 0))
    
    return (precip_agreement * 0.35 + 
            temp_agreement * 0.25 + 
            wind_agreement * 0.20 + 
            ensemble_score * 0.20)
```

### 2.4 Volatility Penalty (0-100, subtracted)

```python
def calculate_volatility_penalty(metar_trend, nws_hourly):
    penalties = []
    
    # METAR visibility volatility (recent changes)
    if 'visibility_history' in metar_trend:
        vis_changes = np.diff(metar_trend['visibility_history'])
        vis_volatility = np.std(vis_changes) if len(vis_changes) > 1 else 0
        penalties.append(min(50, vis_volatility * 10))
    
    # METAR ceiling volatility
    if 'ceiling_history' in metar_trend:
        ceil_changes = np.diff(metar_trend['ceiling_history'])
        ceil_volatility = np.std(ceil_changes) if len(ceil_changes) > 1 else 0
        penalties.append(min(30, ceil_volatility * 0.5))
    
    # NWS forecast volatility (hourly changes)
    precip_probs = [h.get('probabilityOfPrecipitation', 0) for h in nws_hourly[:6]]
    if len(precip_probs) > 1:
        precip_jumps = np.abs(np.diff(precip_probs))
        avg_jump = np.mean(precip_jumps)
        penalties.append(min(20, avg_jump * 0.5))
    
    return sum(penalties) if penalties else 0
```

### 2.5 Recency Bonus (0-100)

```python
def calculate_recency_bonus(metar_obs_time, nws_forecast_time):
    now = datetime.utcnow()
    
    # METAR age (max 1 hour old = full score)
    metar_age = (now - metar_obs_time).total_seconds() / 3600
    metar_score = max(0, 100 - metar_age * 50)
    
    # NWS forecast freshness (max 6 hours old = full score)
    nws_age = (now - nws_forecast_time).total_seconds() / 3600
    nws_score = max(0, 100 - nws_age * 15)
    
    return metar_score * 0.6 + nws_score * 0.4
```

---

## 3. Normalization

### 3.1 Input Normalization

All raw inputs should be normalized before scoring:

```python
def normalize_inputs(raw_data):
    normalized = {}
    
    # Temperature: Convert to anomaly from climatology
    station = raw_data['station_id']
    month = datetime.now().month
    clim = get_climatology(station, month)  # Lookup table
    normalized['temp_anomaly'] = raw_data['temperature'] - clim['temp_mean']
    
    # Precipitation: Convert to probability (already 0-100)
    normalized['precip_prob'] = min(100, max(0, raw_data.get('precip_prob', 0)))
    
    # Visibility: Convert statute miles to 0-1 (10 miles = 1.0)
    normalized['visibility'] = min(1.0, raw_data.get('visibility', 10) / 10)
    
    # Ceiling: Convert feet to 0-1 (10000ft = 1.0)
    normalized['ceiling'] = min(1.0, raw_data.get('ceiling', 10000) / 10000)
    
    # Wind: Convert mph to 0-1 (50mph = 1.0)
    normalized['wind'] = min(1.0, raw_data.get('wind_speed', 25) / 25)
    
    return normalized
```

### 3.2 Climatology Lookup

```python
# Pre-computed climatology table (sample)
CLIMATOLOGY = {
    'KNYC': {  # Central Park
        1: {'temp_mean': 35, 'precip_mean': 3.5},
        2: {'temp_mean': 37, 'precip_mean': 3.0},
        # ... other months
    },
    'KDFW': {  # Dallas
        7: {'temp_mean': 92, 'precip_mean': 2.0},
        # ... other months
    },
    # Default fallback
    'DEFAULT': {'temp_mean': 55, 'precip_mean': 2.5}
}
```

---

## 4. Calibration

### 4.1 Score-to-Probability Mapping

The raw score should be calibrated against historical accuracy:

```python
def calibrate_score(raw_score, station, event_type):
    """
    Apply calibration based on historical performance
    """
    # Lookup historical accuracy for this station/event type
    calibration_table = get_calibration_table(station, event_type)
    
    # Apply Platt scaling or isotonic regression
    calibrated_probability = calibration_table.predict_proba([raw_score])[0]
    
    return calibrated_probability

# Example calibration data structure
CALIBRATION_EXAMPLES = {
    'KNYC': {
        'snow': {
            'score_bins': [0, 20, 40, 60, 80, 100],
            'actual_freq': [0.02, 0.08, 0.25, 0.55, 0.85],  # Historical snow freq
        },
        'rain': {
            'score_bins': [0, 20, 40, 60, 80, 100],
            'actual_freq': [0.05, 0.15, 0.40, 0.70, 0.92],
        }
    }
}
```

### 4.2 Confidence Intervals

```python
def calculate_confidence_interval(score, n_samples):
    """
    Bootstrap confidence interval for the score
    """
    # Score variance based on data quality and sample size
    base_variance = 100  # Max variance for 0-100 scale
    sample_factor = min(1.0, n_samples / 30)  # Convergence at 30 samples
    
    # Data quality affects confidence
    quality_factor = score / 100  # Higher score = more confident
    
    std_error = np.sqrt(base_variance * (1 - quality_factor) / n_samples)
    
    return (score - 1.96 * std_error, score + 1.96 * std_error)
```

---

## 5. Pitfalls & Mitigation

### 5.1 Known Pitfalls

| Pitfall | Description | Mitigation |
|---------|-------------|------------|
| **Data Latency** | NWS/METAR updates not real-time | Explicit recency scoring, flag stale data |
| **Model Drift** | NWS model updates change forecast behavior | Retrain calibration quarterly |
| **Microclimate** | Station doesn't represent area | Multi-station aggregation |
| **Extreme Events** | Rare events have poor calibration | Separate models for thresholds |
| **Time Zone** | UTC vs local time confusion | Always store as UTC, convert at display |
| **Missing METAR** | Some stations report infrequently | Fallback to NWS-only scoring |
| **Coastal Effects** | Sea breeze, lake effect not captured | Add proximity flags |
| **Temporal Mismatch** | METAR instant vs NWS hourly avg | Weighted interpolation |

### 5.2 Data Quality Flags

```python
QUALITY_FLAGS = {
    'STALE_METAR': 'METAR older than 1 hour',
    'STALE_NWS': 'Forecast older than 6 hours',
    'LOW_CONFIDENCE': 'Ensemble spread > 30%',
    'HIGH_VOLATILITY': 'Visibility/ceiling changes > 50%',
    'MISSING_DATA': 'Required fields missing',
    'CLIMATOLOGY_UNAVAILABLE': 'No historical data for calibration'
}
```

---

## 6. Implementation Structure

### 6.1 Output Schema

```typescript
interface WeatherSignalScore {
  station_id: string;
  score: number;              // 0-100 composite score
  components: {
    data_quality: number;     // 0-100
    forecast_confidence: number;  // 0-100
    volatility_penalty: number;   // 0-100 (lower is better)
    recency_bonus: number;    // 0-100
  };
  metadata: {
    metar_age_minutes: number;
    forecast_horizon_hours: number;
    data_sources: string[];
    quality_flags: string[];
    calibrated_probability?: number;  // Optional post-calibration
    confidence_interval: [number, number];
  };
  computed_at: ISO8601;
}
```

### 6.2 File Structure

```
scripts/
  score-weather-signals.mjs    # Main entry point
  weather-scoring/
    __init__.js
    features/
      nws_features.js          # NWS hourly extraction
      metar_features.js        # METAR trend extraction
    scoring/
      quality_score.js         # Data quality component
      confidence_score.js      # Forecast confidence
      volatility_score.js      # Volatility penalty
      recency_score.js         # Recency bonus
    calibration/
      calibrate.js             # Score calibration
      climatology.js           # Climatology lookups
    utils/
      normalize.js             # Input normalization
      flags.js                 # Quality flags
  tests/
    test_scoring.js
    test_calibration.js
```

---

## 7. Summary

The proposed `weather_signal_score` model combines multiple data sources with weighted components:

1. **Data Quality (35%)**: Completeness, source reliability
2. **Forecast Confidence (35%)**: Model agreement on temp/precip/wind
3. **Volatility Penalty (15%)**: Penalize unstable conditions
4. **Recency Bonus (15%)**: Reward fresh data

The output is a **0-100 score** that can be directly used for watchlist ranking, with optional calibration to convert to probability values for more intuitive interpretation.

---

*Ready for implementation review.*

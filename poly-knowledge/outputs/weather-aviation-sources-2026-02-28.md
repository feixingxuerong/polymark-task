# Weather & Aviation Data Sources

**Generated:** 2026-02-27T16:37:16.110Z
**Version:** 1.0.0
**Date:** 2026-02-28

---

## Data Sources

### Weather (NOAA/NWS)

| Property | Value |
|----------|-------|
| Name | NOAA/NWS API |
| Base URL | https://api.weather.gov |
| Documentation | [Link](https://www.weather.gov/documentation/services-web-api) |
| Rate Limit | Generous, no key required |
| Attribution | National Weather Service (NWS), NOAA |

### Aviation (METAR/TAF)

| Property | Value |
|----------|-------|
| Name | NWS Aviation Weather / TAF |
| Base URL | https://api.weather.gov/stations/{stationId}/tafs |
| Documentation | [Link](https://www.weather.gov/documentation/services-web-api) |
| Rate Limit | Same as NWS API |
| Attribution | National Weather Service (NWS), NOAA |

---

## Summary

| Metric | Value |
|--------|-------|
| Weather Stations | 8 |
| Weather Errors | 0 |
| Aviation Airports | 10 |
| Aviation Errors | 3 |

---

## Weather Stations

| Station | Name | Coordinates | Latest Temp |
|--------|------|-------------|-------------|
| KNYC | Central Park, NY | 40.7789, -73.9695 | 3.9F |
| KJFK | JFK Airport, NY | 40.6413, -73.7781 | 3F |
| KDFW | Dallas/Fort Worth, TX | 32.8998, -97.0403 | 21F |
| KSEA | Seattle, WA | 47.4502, -122.3088 | 7F |
| KDEN | Denver, CO | 39.8561, -104.6737 | 14F |
| KMIA | Miami, FL | 25.7959, -80.287 | 27F |
| KORD | Chicago, IL | 41.9742, -87.9073 | 9F |
| KLAX | Los Angeles, CA | 33.9425, -118.4081 | 23F |

## Aviation Airports

| ICAO | Airport | City | METAR | TAF | Flight Category |
|------|--------|------|-------|-----|-----------------|
| KJFK | John F. Kennedy International | New York | Yes | No | VFR |
| KLAX | Los Angeles International | Los Angeles | Yes | No | VFR |
| KORD | O'Hare International | Chicago | Yes | No | VFR |
| KDFW | Dallas/Fort Worth International | Dallas | Yes | No | VFR |
| KDEN | Denver International | Denver | Yes | No | VFR |
| KSEA | Seattle-Tacoma International | Seattle | Yes | No | VFR |
| KMIA | Miami International | Miami | Yes | No | VFR |
| EGLL | London Heathrow | London | No | No | - |
| LFPG | Paris Charles de Gaulle | Paris | No | No | - |
| RJTT | Tokyo Narita International | Tokyo | No | No | - |

---

## Notes

- Data fetched from NOAA/NWS public APIs (no API key required)
- Rate limits are generous but please use responsibly
- User-Agent header is set to identify the application
- All times are in UTC unless otherwise noted
- For settlement verification, cross-reference with official sources

---

*This file is auto-generated. Do not edit manually.*
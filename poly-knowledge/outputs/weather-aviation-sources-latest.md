# Weather & Aviation Data Sources

**Generated:** 2026-02-28T13:23:03.786Z
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
| Weather Stations | 19 |
| Weather Errors | 0 |
| Aviation Airports | 21 |
| Aviation Errors | 3 |

---

## Weather Stations

| Station | Name | Coordinates | Latest Temp |
|--------|------|-------------|-------------|
| KNYC | Central Park, NY | 40.7789, -73.9695 | 1.1F |
| KJFK | JFK Airport, NY | 40.6413, -73.7781 | 1F |
| KDFW | Dallas/Fort Worth, TX | 32.8998, -97.0403 | 17F |
| KSEA | Seattle, WA | 47.4502, -122.3088 | 6F |
| KDEN | Denver, CO | 39.8561, -104.6737 | 5F |
| KMIA | Miami, FL | 25.7959, -80.287 | 23F |
| KORD | Chicago, IL | 41.9742, -87.9073 | 1F |
| KLAX | Los Angeles, CA | 33.9425, -118.4081 | 17F |
| KATL | Atlanta, GA | 33.6407, -84.4277 | 12F |
| KBOS | Boston, MA | 42.3656, -71.0096 | 1F |
| KPHL | Philadelphia, PA | 39.8729, -75.2437 | 2F |
| KIAD | Washington Dulles, VA | 38.9531, -77.4565 | 3F |
| KIAH | Houston, TX | 29.9902, -95.3368 | 12F |
| KPHX | Phoenix, AZ | 33.4484, -112.074 | 18F |
| KSFO | San Francisco, CA | 37.6213, -122.379 | 15F |
| KLAS | Las Vegas, NV | 36.084, -115.1537 | 16F |
| KPDX | Portland, OR | 45.5898, -122.5951 | 2F |
| KMSP | Minneapolis, MN | 44.882, -93.2218 | -8F |
| KDTW | Detroit, MI | 42.2162, -83.3554 | 4F |

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
| KATL | Hartsfield-Jackson Atlanta International | Atlanta | Yes | No | IFR |
| KBOS | Boston Logan International | Boston | Yes | No | VFR |
| KPHL | Philadelphia International | Philadelphia | Yes | No | VFR |
| KIAD | Washington Dulles International | Washington | Yes | No | VFR |
| KIAH | George Bush Intercontinental Houston | Houston | Yes | No | VFR |
| KPHX | Phoenix Sky Harbor International | Phoenix | Yes | No | VFR |
| KSFO | San Francisco International | San Francisco | Yes | No | VFR |
| KLAS | Harry Reid International | Las Vegas | Yes | No | VFR |
| KPDX | Portland International | Portland | Yes | No | VFR |
| KMSP | Minneapolis-St Paul International | Minneapolis | Yes | No | VFR |
| KDTW | Detroit Metropolitan Wayne County | Detroit | Yes | No | VFR |
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
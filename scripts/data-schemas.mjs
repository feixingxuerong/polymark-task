/**
 * Weather & Aviation Data Adapter Schema
 * 
 * Output schema for NOAA/NWS + METAR/TAF data sources
 * Designed for Polymarket weather market resolution verification
 */

// ============================================================
// WEATHER DATA SCHEMA
// ============================================================

export const weatherSchema = {
  // Top-level structure
  generated_at: "ISO8601 timestamp",
  source: "noaa-nws-api",
  request: {
    stations: ["KNYC", "KDFW", "KSEA"],  // Example station IDs
    time_window: {
      start: "2026-02-28T00:00:00Z",
      end: "2026-02-28T23:59:59Z"
    }
  },
  
  // Weather observations and forecasts
  observations: [
    {
      // Station identification
      station: {
        id: "KNYC",           // ICAO code (4-letter)
        wmo_id: "725053",     // WMO index (for US stations)
        name: "New York City, NY - Central Park",
        city: "New York",
        state: "NY",
        country: "US",
        coordinates: {
          lat: 40.7789,
          lon: -73.9695,
          elevation_m: 40
        },
        timezone: "America/New_York"
      },
      
      // Time window for this data
      time_window: {
        start: "2026-02-28T12:00:00Z",
        end: "2026-02-28T18:00:00Z",
        local_start: "2026-02-28T07:00:00-05:00",
        local_end: "2026-02-28T13:00:00-05:00"
      },
      
      // Key weather fields
      temperature: {
        value_f: 42.5,        // Fahrenheit
        value_c: 5.8,         // Celsius
        feels_like_f: 38.2,
        feels_like_c: 3.4,
        heat_index_f: null,
        heat_index_c: null,
        wind_chill_f: 35.1,
        wind_chill_c: 1.7
      },
      
      precipitation: {
        // For settlement: did it rain/snow?
        type: "none",         // none | rain | snow | freezing | mixed
        intensity: null,       // light | moderate | heavy
        amount_inches: 0.0,   // Total precipitation
        amount_mm: 0.0,
        // Snow is critical for many markets
        snow_depth_inches: 0.0,
        snow_depth_cm: 0.0,
        snow_accumulation_inches: 0.0  // For the period
      },
      
      wind: {
        speed_mph: 12.5,
        speed_kph: 20.1,
        speed_knots: 10.9,
        direction_degrees: 270,  // Compass direction in degrees
        direction_compass: "W",  // W, NW, N, etc.
        gust_mph: 18.3,
        gust_kph: 29.5,
        gust_knots: 15.9
      },
      
      visibility: {
        miles: 10.0,
        km: 16.1,
        statute_miles: 10.0,
        meters: 16100
      },
      
      // Cloud cover
      clouds: {
        condition: "clear",   // clear | few | scattered | broken | overcast
        ceiling_ft: null,      // Cloud base altitude (AGL)
        ceiling_m: null,
        low_layer_ft: null,
        low_layer_m: null
      },
      
      // Atmospheric conditions
      atmosphere: {
        humidity_percent: 65,
        dewpoint_f: 35.6,
        dewpoint_c: 2.0,
        pressure_mb: 1013.2,
        pressure_in: 29.92,
        pressure_trend: "steady"  // rising | falling | steady
      },
      
      // Raw data source info
      raw_data: {
        source_url: "https://api.weather.gov/stations/KNYC/observations/latest",
        report_type: "METAR",  // METAR, SYNOP, etc.
        observation_time: "2026-02-28T12:51:00Z",
        validity_time: "2026-02-28T12:30:00Z"
      },
      
      // Data quality flags
      quality_flags: []  // e.g., ["estimated", "automated"]
    }
  ],
  
  // Forecast data (if requested)
  forecasts: [
    {
      station: { /* station object */ },
      period: {
        start: "2026-02-28T18:00:00Z",
        end: "2026-03-01T00:00:00Z"
      },
      temperature: {
        high_f: 48,
        high_c: 9,
        low_f: 35,
        low_c: 2
      },
      precipitation: {
        probability_percent: 30,  // PoP
        type_expected: "rain"
      },
      wind: {
        speed_mph: 15,
        direction_compass: "NW"
      },
      summary: "Partly cloudy, with a low around 35°F."
    }
  ]
};

// ============================================================
// AVIATION DATA SCHEMA (METAR/TAF)
// ============================================================

export const aviationSchema = {
  generated_at: "ISO8601 timestamp",
  source: "aviation-weather-gov",
  request: {
    stations: ["KJFK", "KLAX", "EGLL"],  // ICAO airport codes
    types: ["metar", "taf"],  // Data types requested
    include_taf_forecast_hours: 24  // How many hours of TAF forecast
  },
  
  // METAR data (current conditions)
  metars: [
    {
      // Airport identification
      airport: {
        icao: "KJFK",
        iata: "JFK",
        name: "John F. Kennedy International Airport",
        city: "New York",
        country: "US",
        coordinates: {
          lat: 40.6413,
          lon: -73.7781
        }
      },
      
      // METAR report metadata
      report: {
        raw_text: "KJFK 281753Z 27012KT 10SM FEW040 SCT200 12/04 A3008 RMK AO2 SLP189 T01220039",
        type: "METAR",           // METAR, SPECI
        station: "KJFK",
        observation_time: "2026-02-28T17:53:00Z",
        auto: true,              // Automated station?
        auto_station: true,      // Fully automated?
        correction: null        // COR for corrected
      },
      
      // Flight category (useful for quick assessment)
      flight_category: "VFR",   // VFR | MVFR | IFR | LIFR
      
      // Wind
      wind: {
        direction_degrees: 270,
        direction_compass: "W",
        speed_knots: 12,
        speed_mph: 13.8,
        speed_mps: 6.2,
        gust_speed_knots: null,
        gust_speed_mph: null,
        variable_wind: false,    // VRB in raw
        direction_from: null,   // For variable winds
        direction_to: null
      },
      
      // Visibility
      visibility: {
        sm: 10.0,              // Statute miles
        meters: 16093,
        greater_than_6_sm: false,  // P6SM
        // Separate visibilities (runway visual range)
        runway_visual_range: null
      },
      
      // Runway Visual Range (RVR) if present
      rvr: [
        {
          runway: "04L",
          visual_range_ft: null,
          visual_range_m: null,
          trend: "increasing"  // increasing | decreasing | steady
        }
      ],
      
      // Weather phenomena
      weather: {
        // Raw phenomena codes: - +DZ BR FG etc.
        phenomena: [],  // Array of weather phenomena
        intensity: null,  // light | moderate | heavy
        proximity: null,  // vic | near | re
        description: null  // TS SH BR FG etc.
      },
      
      // Clouds (critical for flight category)
      clouds: [
        {
          cover: "FEW",       // FEW | SCT | BKN | OVC | VV
          base_ft_agl: 4000,   // Cloud base in feet AGL
          base_m_agl: 1219,
          type: null          // CB (cumulonimbus), TCU (towering cumulus)
        },
        {
          cover: "SCT",
          base_ft_agl: 20000,
          base_m_agl: 6096,
          type: null
        }
      ],
      
      // Vertical visibility (for obscure sky)
      vertical_visibility_ft: null,
      
      // Temperature/Dewpoint
      temperature: {
        celsius: 12,
        fahrenheit: 53.6,
        dewpoint_c: 4,
        dewpoint_f: 39.2,
        spread_c: 8  // Temperature-dewpoint spread
      },
      
      // Pressure
      pressure: {
        inches_hg: 30.08,
        mb: 1019,
        // Altimeter setting (for aviation)
        altimeter_hg: 30.08
      },
      
      // Weather phenomena affecting visibility
      visibility_restrictions: {
        fog: false,
        mist: false,
        haze: false,
        smoke: false,
        dust: false,
        sand: false,
        rain: false,
        snow: false
      },
      
      // Information flags
      flags: {
        tornado: false,
        thunderstorm: false,
        hail: false,
        freezing_rain: false,
        ice_pellets: false,
        runway_floor: false
      },
      
      // Derived fields for market resolution
      derived: {
        // Key fields for settlement verification
        is_vfr: true,     // Visibility 3+ sm, ceiling 1000+ ft
        is_mvfr: false,   // 1-3 sm or ceiling 500-1000 ft
        is_ifr: false,   // <1 sm or ceiling <500 ft
        is_lifr: false,  // <1/2 sm or ceiling <200 ft
        
        // Specific conditions
        ceiling_above_1000ft: true,
        ceiling_above_500ft: true,
        visibility_above_3sm: true,
        visibility_above_1sm: true,
        no_precipitation: true,
        no_thunderstorm: true,
        no_fog: true,
        
        // Numeric thresholds
        ceiling_ft: 4000,
        visibility_sm: 10.0
      }
    }
  ],
  
  // TAF data (terminal aerodrome forecast)
  tafs: [
    {
      airport: {
        icao: "KJFK",
        iata: "JFK",
        name: "John F. Kennedy International Airport",
        city: "New York"
      },
      
      // TAF report metadata
      report: {
        raw_text: "KJFK 281100Z 2812/2918 27012KT P6SM FEW040 SCT200 FM291500 27015G22KT 3SM RA BKN030 OVC050",
        type: "TAF",
        station: "KJFK",
        issue_time: "2026-02-28T11:00:00Z",
        valid_from: "2026-02-28T12:00:00Z",
        valid_until: "2026-02-29T18:00:00Z",
        correction: null,
        amendment: null
      },
      
      // Forecast periods
      forecast: [
        {
          // Period of this forecast segment
          period: {
            from: "2026-02-28T12:00:00Z",
            to: "2026-02-29T15:00:00Z",
            from_raw: "2812/2915",
            change_indicator: "FM"  // FM | BECMG | TEMPO | PROB
          },
          
          // Wind
          wind: {
            direction_degrees: 270,
            speed_knots: 12,
            gust_knots: null,
            variable: false
          },
          
          // Visibility
          visibility: {
            sm: 6.0,  // P6SM = greater than 6
            meters: 9656,
            greater_than_6_sm: true
          },
          
          // Clouds
          clouds: [
            {
              cover: "FEW",
              base_ft_agl: 4000,
              type: null
            },
            {
              cover: "SCT",
              base_ft_agl: 20000,
              type: null
            }
          ],
          
          // Weather
          weather: null,  // If present, object like in METAR
          
          // Wind shear (for specific runways)
          wind_shear: null,
          
          // Probability (if PROB)
          probability_percent: null,
          
          // Vicinity weather (VC)
          vicinity_weather: null
        }
      ]
    }
  ],
  
  // Station metadata (reference)
  stations_metadata: [
    {
      icao: "KJFK",
      name: "John F. Kennedy International Airport",
      country: "US",
      coordinates: {
        lat: 40.6413,
        lon: -73.7781
      },
      elevation_ft: 13,
      magnetic_variation: -13,
      sunrise: "2026-02-28T12:42:00Z",  // Calculated
      sunset: "2026-02-28T23:44:00Z"
    }
  ]
};

// ============================================================
// COMBINED OUTPUT SCHEMA
// ============================================================

export const combinedSchema = {
  // Metadata
  generated_at: "ISO8601 timestamp",
  version: "1.0.0",
  
  // Data sources used
  sources: {
    weather: {
      name: "NOAA/NWS API",
      base_url: "https://api.weather.gov",
      rate_limit: "Generous, no key required",
      user_agent: "Polymarket-Research/1.0"
    },
    aviation: {
      name: "NWS Aviation Weather / TAF",
      base_url: "https://api.weather.gov/stations/{stationId}/tafs",
      rate_limit: "Same as NWS API",
      user_agent: "Polymarket-Research/1.0"
    }
  },
  
  // Request parameters
  request: {
    weather_stations: ["KNYC", "KDFW", "KSEA", "KDEN", "KMIA"],
    aviation_airports: ["KJFK", "KLAX", "KORD", "EGLL", "LFPG"],
    time_window: {
      start: "2026-02-28T00:00:00Z",
      end: "2026-02-28T23:59:59Z"
    }
  },
  
  // Combined data
  data: {
    weather_observations: [],    // From weatherSchema.observations
    weather_forecasts: [],       // From weatherSchema.forecasts
    metars: [],                  // From aviationSchema.metars
    tafs: []                     // From aviationSchema.tafs
  },
  
  // Data quality summary
  quality_summary: {
    stations_queried: 5,
    stations_available: 5,
    stations_failed: 0,
    data_completeness_percent: 100.0,
    warnings: []
  }
};

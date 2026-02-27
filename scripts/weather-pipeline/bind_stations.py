#!/usr/bin/env python3
"""
bind_stations.py - Map locations to weather stations

Maps market locations (cities, airports) to official weather stations
for verification and data retrieval.
"""

import json
import re
import sys
from typing import Optional

# Common airport to station mapping
AIRPORT_STATIONS = {
    # US Major Airports
    "kjfk": {"id": "KJFK", "name": "John F. Kennedy International Airport", "city": "New York", "lat": 40.6413, "lon": -73.7781, "source": "NOAA LCD"},
    "kjax": {"id": "KJAX", "name": "Jacksonville International Airport", "city": "Jacksonville", "lat": 30.4941, "lon": -81.6879, "source": "NOAA LCD"},
    "kord": {"id": "KORD", "name": "O'Hare International Airport", "city": "Chicago", "lat": 41.9742, "lon": -87.9073, "source": "NOAA LCD"},
    "kdfw": {"id": "KDFW", "name": "Dallas/Fort Worth International Airport", "city": "Dallas", "lat": 32.8998, "lon": -97.0403, "source": "NOAA LCD"},
    "kden": {"id": "KDEN", "name": "Denver International Airport", "city": "Denver", "lat": 39.8561, "lon": -104.6737, "source": "NOAA LCD"},
    "klas": {"id": "KLAS", "name": "Harry Reid International Airport", "city": "Las Vegas", "lat": 36.0840, "lon": -115.1537, "source": "NOAA LCD"},
    "kmia": {"id": "KMIA", "name": "Miami International Airport", "city": "Miami", "lat": 25.7959, "lon": -80.2870, "source": "NOAA LCD"},
    "ksea": {"id": "KSEA", "name": "Seattle-Tacoma International Airport", "city": "Seattle", "lat": 47.4502, "lon": -122.3088, "source": "NOAA LCD"},
    "ksfo": {"id": "KSFO", "name": "San Francisco International Airport", "city": "San Francisco", "lat": 37.6213, "lon": -122.3790, "source": "NOAA LCD"},
    "klaX": {"id": "KLAX", "name": "Los Angeles International Airport", "city": "Los Angeles", "lat": 33.9416, "lon": -118.4085, "source": "NOAA LCD"},
    "katl": {"id": "KATL", "name": "Hartsfield-Jackson Atlanta International Airport", "city": "Atlanta", "lat": 33.6407, "lon": -84.4277, "source": "NOAA LCD"},
    "kbos": {"id": "KBOS", "name": "Logan International Airport", "city": "Boston", "lat": 42.3656, "lon": -71.0096, "source": "NOAA LCD"},
    "kphx": {"id": "KPHX", "name": "Phoenix Sky Harbor International Airport", "city": "Phoenix", "lat": 33.4352, "lon": -112.0101, "source": "NOAA LCD"},
    "kiad": {"id": "KIAD", "name": "Washington Dulles International Airport", "city": "Washington", "lat": 38.9531, "lon": -77.4565, "source": "NOAA LCD"},
    "kmem": {"id": "KMEM", "name": "Memphis International Airport", "city": "Memphis", "lat": 35.0458, "lon": -89.9772, "source": "NOAA LCD"},
    
    # NYC specific
    "nyc": {"id": "KNYC", "name": "Central Park Weather Station", "city": "New York", "lat": 40.7789, "lon": -73.9695, "source": "NOAA LCD"},
    "jfk": {"id": "KJFK", "name": "John F. Kennedy International Airport", "city": "New York", "lat": 40.6413, "lon": -73.7781, "source": "NOAA LCD"},
    "lga": {"id": "KLGA", "name": "LaGuardia Airport", "city": "New York", "lat": 40.7769, "lon": -73.8740, "source": "NOAA LCD"},
    "ewr": {"id": "KEWR", "name": "Newark Liberty International Airport", "city": "Newark", "lat": 40.6895, "lon": -74.1745, "source": "NOAA LCD"},
    
    # International
    "lhr": {"id": "LHR", "name": "London Heathrow Airport", "city": "London", "lat": 51.4700, "lon": -0.4543, "source": "METAR"},
    "cdg": {"id": "CDG", "name": "Charles de Gaulle Airport", "city": "Paris", "lat": 49.0097, "lon": 2.5479, "source": "METAR"},
    "nrt": {"id": "RJTT", "name": "Narita International Airport", "city": "Tokyo", "lat": 35.7720, "lon": 140.3929, "source": "METAR"},
    "hnd": {"id": "RJTT", "name": "Tokyo Haneda Airport", "city": "Tokyo", "lat": 35.5494, "lon": 139.7798, "source": "METAR"},
    "iceland": {"id": "BIAR", "name": "Akureyri Airport", "city": "Akureyri", "lat": 65.6602, "lon": -18.0783, "source": "METAR"},
    "reykjavik": {"id": "BIRK", "name": "Reykjavik Airport", "city": "Reykjavik", "lat": 64.1300, "lon": -21.9426, "source": "METAR"},
}

# City to default station mapping
CITY_STATIONS = {
    "new york": {"id": "KNYC", "name": "Central Park Weather Station", "city": "New York", "lat": 40.7789, "lon": -73.9695, "source": "NOAA LCD"},
    "chicago": {"id": "KORD", "name": "O'Hare International Airport", "city": "Chicago", "lat": 41.9742, "lon": -87.9073, "source": "NOAA LCD"},
    "los angeles": {"id": "KLAX", "name": "Los Angeles International Airport", "city": "Los Angeles", "lat": 33.9416, "lon": -118.4085, "source": "NOAA LCD"},
    "san francisco": {"id": "KSFO", "name": "San Francisco International Airport", "city": "San Francisco", "lat": 37.6213, "lon": -122.3790, "source": "NOAA LCD"},
    "miami": {"id": "KMIA", "name": "Miami International Airport", "city": "Miami", "lat": 25.7959, "lon": -80.2870, "source": "NOAA LCD"},
    "seattle": {"id": "KSEA", "name": "Seattle-Tacoma International Airport", "city": "Seattle", "lat": 47.4502, "lon": -122.3088, "source": "NOAA LCD"},
    "boston": {"id": "KBOS", "name": "Logan International Airport", "city": "Boston", "lat": 42.3656, "lon": -71.0096, "source": "NOAA LCD"},
    "denver": {"id": "KDEN", "name": "Denver International Airport", "city": "Denver", "lat": 39.8561, "lon": -104.6737, "source": "NOAA LCD"},
    "dallas": {"id": "KDFW", "name": "Dallas/Fort Worth International Airport", "city": "Dallas", "lat": 32.8998, "lon": -97.0403, "source": "NOAA LCD"},
    "atlanta": {"id": "KATL", "name": "Hartsfield-Jackson Atlanta International Airport", "city": "Atlanta", "lat": 33.6407, "lon": -84.4277, "source": "NOAA LCD"},
    "phoenix": {"id": "KPHX", "name": "Phoenix Sky Harbor International Airport", "city": "Phoenix", "lat": 33.4352, "lon": -112.0101, "source": "NOAA LCD"},
    "las vegas": {"id": "KLAS", "name": "Harry Reid International Airport", "city": "Las Vegas", "lat": 36.0840, "lon": -115.1537, "source": "NOAA LCD"},
    "houston": {"id": "KIAH", "name": "George Bush Intercontinental Airport", "city": "Houston", "lat": 29.9902, "lon": -95.3368, "source": "NOAA LCD"},
    "washington": {"id": "KIAD", "name": "Washington Dulles International Airport", "city": "Washington", "lat": 38.9531, "lon": -77.4565, "source": "NOAA LCD"},
    "london": {"id": "LHR", "name": "London Heathrow Airport", "city": "London", "lat": 51.4700, "lon": -0.4543, "source": "METAR"},
    "paris": {"id": "CDG", "name": "Charles de Gaulle Airport", "city": "Paris", "lat": 49.0097, "lon": 2.5479, "source": "METAR"},
    "tokyo": {"id": "RJTT", "name": "Narita International Airport", "city": "Tokyo", "lat": 35.7720, "lon": 140.3929, "source": "METAR"},
    "berlin": {"id": "EDDB", "name": "Berlin Brandenburg Airport", "city": "Berlin", "lat": 52.3667, "lon": 13.5033, "source": "METAR"},
    "sydney": {"id": "YSSY", "name": "Sydney Airport", "city": "Sydney", "lat": -33.9399, "lon": 151.1753, "source": "METAR"},
    "dubai": {"id": "OMDB", "name": "Dubai International Airport", "city": "Dubai", "lat": 25.2532, "lon": 55.3657, "source": "METAR"},
    "singapore": {"id": "WSSS", "name": "Singapore Changi Airport", "city": "Singapore", "lat": 1.3644, "lon": 103.9915, "source": "METAR"},
    "hong kong": {"id": "VHHH", "name": "Hong Kong International Airport", "city": "Hong Kong", "lat": 22.3080, "lon": 113.9185, "source": "METAR"},
    "shanghai": {"id": "ZSPD", "name": "Shanghai Pudong International Airport", "city": "Shanghai", "lat": 31.1443, "lon": 121.8083, "source": "METAR"},
    "beijing": {"id": "ZBAA", "name": "Beijing Capital International Airport", "city": "Beijing", "lat": 40.0799, "lon": 116.6031, "source": "METAR"},
    "toronto": {"id": "CYYZ", "name": "Toronto Pearson International Airport", "city": "Toronto", "lat": 43.6777, "lon": -79.6248, "source": "METAR"},
    "vancouver": {"id": "CYVR", "name": "Vancouver International Airport", "city": "Vancouver", "lat": 49.1967, "lon": -123.1815, "source": "METAR"},
}


def extract_location_from_question(question: str) -> Optional[str]:
    """
    Extract location from market question.
    
    Args:
        question: Market question text
    
    Returns:
        Extracted location string or None
    """
    question = question.lower()
    
    # Common location patterns
    patterns = [
        r"(?:in|at|for|near)\s+([a-z\s]+?)\s+(?:on|before|by|end)",
        r"([a-z\s]+?)\s+(?:airport|station)",
        r"will\s+.+?\s+(?:in|at)\s+([a-z\s]+?)\s+",
    ]
    
    for pattern in patterns:
        match = re.search(pattern, question)
        if match:
            return match.group(1).strip()
    
    # Check for known cities/airports in text
    all_locations = list(AIRPORT_STATIONS.keys()) + list(CITY_STATIONS.keys())
    for loc in all_locations:
        if loc in question:
            return loc
    
    return None


def find_station(location: str) -> Optional[dict]:
    """
    Find weather station for a location.
    
    Args:
        location: Location string (city name, airport code, etc.)
    
    Returns:
        Station info dict or None
    """
    if not location:
        return None
    
    location = location.lower().strip()
    
    # Direct airport code match
    if location in AIRPORT_STATIONS:
        return AIRPORT_STATIONS[location]
    
    # City name match
    if location in CITY_STATIONS:
        return CITY_STATIONS[location]
    
    # Partial match for airport codes
    for code, station in AIRPORT_STATIONS.items():
        if location in code or code in location:
            return station
    
    # Partial match for cities
    for city, station in CITY_STATIONS.items():
        if location in city or city in location:
            return station
    
    return None


def bind_station_to_market(market: dict) -> dict:
    """
    Bind a weather station to a market based on its question.
    
    Args:
        market: Market card dictionary
    
    Returns:
        Market card with station info added
    """
    question = market.get("question", "")
    location = extract_location_from_question(question)
    
    if location:
        station = find_station(location)
        if station:
            market["station"] = station
            market["location_detected"] = location
            return market
    
    # No station found - mark as unspecified
    market["station"] = None
    market["location_detected"] = location
    return market


def bind_stations_to_markets(markets: list[dict]) -> list[dict]:
    """
    Bind stations to a list of markets.
    
    Args:
        markets: List of market cards
    
    Returns:
        Markets with station info
    """
    results = []
    bound_count = 0
    
    for market in markets:
        bound_market = bind_station_to_market(market)
        results.append(bound_market)
        if bound_market.get("station"):
            bound_count += 1
    
    print(f"Bound {bound_count}/{len(markets)} markets to weather stations")
    return results


def main():
    """Test station binding."""
    test_questions = [
        "Will it snow in NYC on February 28?",
        "Will it rain in London on March 15?",
        "Will temperature exceed 100°F in Dallas?",
        "Will there be a hurricane in Miami this season?",
        "Will it snow in Tokyo in January?",
    ]
    
    for q in test_questions:
        market = {"question": q}
        bound = bind_station_to_market(market)
        print(f"Question: {q}")
        print(f"  Location: {bound.get('location_detected')}")
        print(f"  Station: {bound.get('station')}")
        print()


if __name__ == "__main__":
    main()

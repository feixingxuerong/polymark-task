#!/usr/bin/env python3
"""
fetch_weather_markets.py - Fetch weather markets from Gamma API

Polls Polymarket's Gamma API to retrieve weather-related prediction markets.
"""

import json
import sys
from datetime import datetime
from typing import Optional

import requests

# Gamma API base URL
GAMMA_API_BASE = "https://clob.polymarket.com"


def fetch_markets_by_tag(tag: str = "weather", limit: int = 50) -> list[dict]:
    """
    Fetch markets by tag from Gamma API.
    
    Args:
        tag: Market tag to filter by
        limit: Maximum number of markets to return
    
    Returns:
        List of market dictionaries
    """
    url = f"{GAMMA_API_BASE}/markets"
    params = {
        "tag": tag,
        "limit": limit,
        "closed": "false",
    }
    
    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if isinstance(data, dict) and "data" in data:
            return data["data"]
        return data if isinstance(data, list) else []
    except requests.exceptions.RequestException as e:
        print(f"Error fetching markets: {e}", file=sys.stderr)
        return []


def fetch_markets_by_search(query: str = "weather", limit: int = 50) -> list[dict]:
    """
    Search markets by keyword.
    
    Args:
        query: Search query
        limit: Maximum number of markets to return
    
    Returns:
        List of market dictionaries
    """
    url = f"{GAMMA_API_BASE}/markets"
    params = {
        "search": query,
        "limit": limit,
        "closed": "false",
    }
    
    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if isinstance(data, dict) and "data" in data:
            return data["data"]
        return data if isinstance(data, list) else []
    except requests.exceptions.RequestException as e:
        print(f"Error searching markets: {e}", file=sys.stderr)
        return []


def fetch_market_details(condition_id: str) -> Optional[dict]:
    """
    Fetch detailed information for a specific market.
    
    Args:
        condition_id: The market's condition ID
    
    Returns:
        Market details dictionary or None
    """
    url = f"{GAMMA_API_BASE}/markets"
    params = {"conditionId": condition_id}
    
    try:
        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if isinstance(data, list) and len(data) > 0:
            return data[0]
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error fetching market details: {e}", file=sys.stderr)
        return None


def extract_market_card(market: dict) -> dict:
    """
    Extract relevant fields into a market card format.
    
    Args:
        market: Raw market data from API
    
    Returns:
        Standardized market card
    """
    # Handle nested market data
    market_data = market.get("market", market)
    
    return {
        "market_id": market_data.get("conditionId") or market.get("condition_id"),
        "condition_id": market_data.get("conditionId") or market.get("condition_id"),
        "slug": market_data.get("slug", ""),
        "question": market_data.get("question", market_data.get("title", "")),
        "description": market_data.get("description", ""),
        "rules": market_data.get("rules", ""),
        "resolution_source": market_data.get("resolutionSource", ""),
        "end_date": market_data.get("endDate") or market_data.get("end_date"),
        "liquidity_usd": float(market_data.get("liquidity", 0) or 0),
        "volume_usd": float(market_data.get("volume", 0) or 0),
        "bid": float(market_data.get("bid", 0) or 0) if market_data.get("bid") else None,
        "ask": float(market_data.get("ask", 0) or 0) if market_data.get("ask") else None,
        "spread_pct": market_data.get("spread"),
        "group_item_title": market_data.get("groupItemTitle", ""),
        "tags": market_data.get("tags", []),
        "closed": market_data.get("closed", False),
        "active": market_data.get("active", True),
    }


def filter_weather_markets(markets: list[dict]) -> list[dict]:
    """
    Filter markets to only include weather-related ones.
    
    Args:
        markets: List of raw markets
    
    Returns:
        Filtered list of market cards
    """
    weather_keywords = [
        "weather", "temperature", "rain", "snow", "storm", "hurricane",
        "typhoon", "tornado", "flood", "drought", "heat", "cold", "wind",
        "precipitation", "snowfall", "°C", "°F", "inches", "mm", "hPa",
        "forecast", "tropical", "winter", "summer", "spring", "fall"
    ]
    
    filtered = []
    for market in markets:
        card = extract_market_card(market)
        question = card.get("question", "").lower()
        desc = card.get("description", "").lower()
        rules = card.get("rules", "").lower()
        
        # Check if any keyword is in the market
        combined_text = f"{question} {desc} {rules}"
        if any(kw in combined_text for kw in weather_keywords):
            filtered.append(card)
    
    return filtered


def main():
    """Main entry point for fetching weather markets."""
    print("Fetching weather markets from Gamma API...")
    
    # Try fetching by tag first
    markets = fetch_markets_by_tag("weather", limit=100)
    
    # If no results, try search
    if not markets:
        print("No markets found by tag, trying search...")
        markets = fetch_markets_by_search("weather temperature rain snow", limit=100)
    
    # If still no results, try broader search
    if not markets:
        print("No markets found, trying general search...")
        markets = fetch_markets_by_search("", limit=200)
    
    if not markets:
        print("No markets found from Gamma API.")
        return []
    
    # Filter to weather markets
    weather_markets = filter_weather_markets(markets)
    print(f"Found {len(weather_markets)} weather markets")
    
    return weather_markets


if __name__ == "__main__":
    markets = main()
    print(json.dumps(markets, indent=2, default=str))

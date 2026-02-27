#!/usr/bin/env python3
"""
run.py - CLI entry point for weather market monitoring pipeline

Usage:
    python run.py --fetch              Fetch weather markets from Gamma API
    python run.py --bind                Bind official weather stations
    python run.py --annotate            Add risk annotations
    python run.py --full                Run full pipeline
    python run.py --output FILE         Output file path (default: stdout)
    python run.py --sample              Generate sample watchlist with mock data
    python run.py --format FORMAT       Output format: json or markdown
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from fetch_weather_markets import main as fetch_markets, extract_market_card
from bind_stations import bind_stations_to_markets
from risk_annotator import annotate_markets


def generate_sample_watchlist() -> list[dict]:
    """
    Generate sample watchlist with mock weather markets for demonstration.
    
    Returns:
        List of sample market cards
    """
    sample_markets = [
        {
            "market_id": "sample-001",
            "condition_id": "cond_001",
            "slug": "will-it-snow-in-nyc-feb-28-2026",
            "question": "Will it snow in New York City on February 28, 2026?",
            "liquidity_usd": 15000,
            "volume_usd": 8200,
            "bid": 0.42,
            "ask": 0.45,
            "spread_pct": 6.8,
            "resolution_source": "NOAA/NWS",
            "resolution_criteria": "≥1 inch snowfall at Central Park (KNYC)",
            "end_date": "2026-02-28T23:59:59Z",
            "rules": "Snowfall measured at Central Park weather station by NOAA.",
            "station": {
                "id": "KNYC",
                "name": "Central Park Weather Station",
                "city": "New York",
                "lat": 40.7789,
                "lon": -73.9695,
                "source": "NOAA LCD"
            }
        },
        {
            "market_id": "sample-002",
            "condition_id": "cond_002",
            "slug": "will-rain-in-london-mar-15-2026",
            "question": "Will it rain in London on March 15, 2026?",
            "liquidity_usd": 8500,
            "volume_usd": 4200,
            "bid": 0.55,
            "ask": 0.58,
            "spread_pct": 5.2,
            "resolution_source": "MET Office UK",
            "resolution_criteria": "≥1mm precipitation at Heathrow Airport",
            "end_date": "2026-03-15T23:59:59Z",
            "rules": "Precipitation measured at London Heathrow (LHR).",
            "station": {
                "id": "LHR",
                "name": "London Heathrow Airport",
                "city": "London",
                "lat": 51.4700,
                "lon": -0.4543,
                "source": "METAR"
            }
        },
        {
            "market_id": "sample-003",
            "condition_id": "cond_003",
            "slug": "temp-exceed-100f-dallas-jul-15",
            "question": "Will temperature exceed 100°F in Dallas on July 15, 2026 at 3pm CDT?",
            "liquidity_usd": 22000,
            "volume_usd": 15500,
            "bid": 0.72,
            "ask": 0.75,
            "spread_pct": 4.0,
            "resolution_source": "NOAA/NWS",
            "resolution_criteria": "Temperature ≥100°F at DFW airport at 3pm CDT",
            "end_date": "2026-07-15T20:00:00Z",
            "rules": "Temperature measured at Dallas/Fort Worth International Airport (KDFW) at 3pm local time.",
            "station": {
                "id": "KDFW",
                "name": "Dallas/Fort Worth International Airport",
                "city": "Dallas",
                "lat": 32.8998,
                "lon": -97.0403,
                "source": "NOAA LCD"
            }
        },
        {
            "market_id": "sample-004",
            "condition_id": "cond_004",
            "slug": "hurricane-miami-2026-season",
            "question": "Will there be a Category 3+ hurricane making landfall in Miami in 2026?",
            "liquidity_usd": 45000,
            "volume_usd": 28000,
            "bid": 0.15,
            "ask": 0.18,
            "spread_pct": 18.0,
            "resolution_source": "NOAA/NHC",
            "resolution_criteria": "Category 3+ hurricane (wind ≥111 mph) at Miami landfall",
            "end_date": "2026-11-30T23:59:59Z",
            "rules": "Hurricane data from NOAA National Hurricane Center.",
            "station": {
                "id": "KMIA",
                "name": "Miami International Airport",
                "city": "Miami",
                "lat": 25.7959,
                "lon": -80.2870,
                "source": "NOAA LCD"
            }
        },
        {
            "market_id": "sample-005",
            "condition_id": "cond_005",
            "slug": "snowfall-tokyo-jan-2026",
            "question": "Will it snow in Tokyo in January 2026?",
            "liquidity_usd": 12000,
            "volume_usd": 6800,
            "bid": 0.28,
            "ask": 0.32,
            "spread_pct": 12.5,
            "resolution_source": "JMA",
            "resolution_criteria": "Any snowfall recorded at Tokyo stations",
            "end_date": "2026-01-31T23:59:59Z",
            "rules": "Snowfall measured at Tokyo area weather stations (JMA).",
            "station": {
                "id": "RJTT",
                "name": "Narita International Airport",
                "city": "Tokyo",
                "lat": 35.7720,
                "lon": 140.3929,
                "source": "METAR"
            }
        },
        {
            "market_id": "sample-006",
            "condition_id": "cond_006",
            "slug": "rain-paris-apr-2026",
            "question": "Will it rain in Paris on April 5, 2026?",
            "liquidity_usd": 7500,
            "volume_usd": 3200,
            "bid": 0.48,
            "ask": 0.52,
            "spread_pct": 8.0,
            "resolution_source": "Météo-France",
            "resolution_criteria": "Precipitation ≥0.1mm at Paris Charles de Gaulle",
            "end_date": "2026-04-05T23:59:59Z",
            "rules": "Rain measured at Paris CDG airport station.",
            "station": {
                "id": "CDG",
                "name": "Charles de Gaulle Airport",
                "city": "Paris",
                "lat": 49.0097,
                "lon": 2.5479,
                "source": "METAR"
            }
        },
        {
            "market_id": "sample-007",
            "condition_id": "cond_007",
            "slug": "snow-denver-mar-2026",
            "question": "Will more than 4 inches of snow fall in Denver in March 2026?",
            "liquidity_usd": 18000,
            "volume_usd": 9500,
            "bid": 0.65,
            "ask": 0.68,
            "spread_pct": 4.4,
            "resolution_source": "NOAA/NWS",
            "resolution_criteria": "Total snowfall ≥4 inches at Denver International Airport",
            "end_date": "2026-03-31T23:59:59Z",
            "rules": "Snowfall measured at KDEN. Total for March 2026.",
            "station": {
                "id": "KDEN",
                "name": "Denver International Airport",
                "city": "Denver",
                "lat": 39.8561,
                "lon": -104.6737,
                "source": "NOAA LCD"
            }
        },
        {
            "market_id": "sample-008",
            "condition_id": "cond_008",
            "slug": "heat-wave-seattle-jul-2026",
            "question": "Will Seattle experience a heat wave (3+ days above 90°F) in July 2026?",
            "liquidity_usd": 11000,
            "volume_usd": 5800,
            "bid": 0.35,
            "ask": 0.38,
            "spread_pct": 8.2,
            "resolution_source": "NOAA/NWS",
            "resolution_criteria": "3+ consecutive days with high ≥90°F at SEA airport",
            "end_date": "2026-07-31T23:59:59Z",
            "rules": "Heat wave defined as 3+ consecutive days above 90°F.",
            "station": {
                "id": "KSEA",
                "name": "Seattle-Tacoma International Airport",
                "city": "Seattle",
                "lat": 47.4502,
                "lon": -122.3088,
                "source": "NOAA LCD"
            }
        },
        {
            "market_id": "sample-009",
            "condition_id": "cond_009",
            "slug": "typhoon-tokyo-sep-2026",
            "question": "Will a typhoon pass within 100km of Tokyo in September 2026?",
            "liquidity_usd": 25000,
            "volume_usd": 14000,
            "bid": 0.22,
            "ask": 0.26,
            "spread_pct": 15.0,
            "resolution_source": "JMA",
            "resolution_criteria": "Typhoon center passes within 100km of Tokyo (35.7°N, 139.7°E)",
            "end_date": "2026-09-30T23:59:59Z",
            "rules": "Typhoon track data from Japan Meteorological Agency.",
            "station": {
                "id": "RJTT",
                "name": "Narita International Airport",
                "city": "Tokyo",
                "lat": 35.7720,
                "lon": 140.3929,
                "source": "METAR"
            }
        },
        {
            "market_id": "sample-010",
            "condition_id": "cond_010",
            "slug": "freeze-texas-nov-2026",
            "question": "Will temperature drop below freezing in Houston in November 2026?",
            "liquidity_usd": 9500,
            "volume_usd": 4800,
            "bid": 0.58,
            "ask": 0.62,
            "spread_pct": 6.5,
            "resolution_source": "NOAA/NWS",
            "resolution_criteria": "Temperature <32°F at IAH airport",
            "end_date": "2026-11-30T23:59:59Z",
            "rules": "Freezing temperature at George Bush Intercontinental.",
            "station": {
                "id": "KIAH",
                "name": "George Bush Intercontinental Airport",
                "city": "Houston",
                "lat": 29.9902,
                "lon": -95.3368,
                "source": "NOAA LCD"
            }
        }
    ]
    
    # Add risk annotations to sample markets
    from risk_annotator import annotate_market
    
    annotated_markets = []
    for market in sample_markets:
        annotated = annotate_market(market)
        annotated_markets.append(annotated)
    
    return annotated_markets


def format_markdown_watchlist(watchlist: dict) -> str:
    """
    Format watchlist as markdown.
    
    Args:
        watchlist: Watchlist dictionary
    
    Returns:
        Markdown formatted string
    """
    lines = [
        "# Weather Market Watchlist",
        f"",
        f"*Generated: {watchlist['generated_at']}*",
        f"",
        f"**Total Markets:** {len(watchlist['markets'])}",
        f"",
        "---",
        ""
    ]
    
    risk_counts = {"low": 0, "medium": 0, "high": 0}
    for m in watchlist["markets"]:
        risk_counts[m.get("risk_level", "low")] += 1
    
    lines.append(f"**Risk Distribution:** Low: {risk_counts['low']} | Medium: {risk_counts['medium']} | High: {risk_counts['high']}")
    lines.append("")
    lines.append("---")
    lines.append("")
    
    for i, market in enumerate(watchlist["markets"], 1):
        risk_emoji = {"low": "🟢", "medium": "🟡", "high": "🔴"}.get(market.get("risk_level", "low"), "⚪")
        
        lines.append(f"### {i}. {market['question']}")
        lines.append("")
        lines.append(f"**Market ID:** `{market.get('market_id', 'N/A')}`")
        lines.append(f"**Risk Level:** {risk_emoji} {market.get('risk_level', 'unknown').upper()}")
        lines.append(f"**Liquidity:** ${market.get('liquidity_usd', 0):,.0f}")
        lines.append(f"**Volume:** ${market.get('volume_usd', 0):,.0f}")
        
        if market.get("bid") and market.get("ask"):
            lines.append(f"**Price:** {market['bid']:.2f} - {market['ask']:.2f}")
        
        if market.get("station"):
            station = market["station"]
            lines.append(f"**Station:** {station.get('name')} ({station.get('id')})")
            lines.append(f"**Location:** {station.get('city')}, {station.get('lat')}, {station.get('lon')}")
        
        if market.get("risk_flags"):
            lines.append(f"**Risk Flags:** {', '.join(market['risk_flags'])}")
        
        if market.get("resolution_source"):
            lines.append(f"**Resolution Source:** {market['resolution_source']}")
        
        if market.get("end_date"):
            lines.append(f"**End Date:** {market['end_date']}")
        
        lines.append("")
        lines.append("---")
        lines.append("")
    
    return "\n".join(lines)


def run_pipeline(
    fetch: bool = False,
    bind: bool = False,
    annotate: bool = False,
    full: bool = False,
    sample: bool = False,
    output: Optional[str] = None,
    output_format: str = "json"
) -> dict:
    """
    Run the weather market pipeline.
    
    Args:
        fetch: Fetch markets from API
        bind: Bind stations to markets
        annotate: Add risk annotations
        full: Run full pipeline
        sample: Generate sample data
        output: Output file path
        output_format: Output format (json or markdown)
    
    Returns:
        Watchlist dictionary
    """
    markets = []
    
    if sample or full:
        # Generate sample data for MVP
        markets = generate_sample_watchlist()
    elif fetch:
        # Fetch from Gamma API
        markets = fetch_markets()
        
        if bind or annotate:
            markets = bind_stations_to_markets(markets)
        
        if annotate:
            markets = annotate_markets(markets)
    
    # Build watchlist
    watchlist = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "source": "sample" if sample else "gamma_api",
        "markets": markets
    }
    
    # Output
    if output_format == "markdown":
        output_str = format_markdown_watchlist(watchlist)
    else:
        output_str = json.dumps(watchlist, indent=2, default=str)
    
    if output:
        with open(output, "w", encoding="utf-8") as f:
            f.write(output_str)
        print(f"Output written to: {output}")
    else:
        print(output_str)
    
    return watchlist


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Weather Market Monitoring Pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run.py --sample                    Generate sample watchlist
  python run.py --full                       Run full pipeline (sample data)
  python run.py --fetch                      Fetch markets from Gamma API
  python run.py --output watchlist.json      Save to file
  python run.py --format markdown            Output as markdown
        """
    )
    
    parser.add_argument(
        "--fetch",
        action="store_true",
        help="Fetch weather markets from Gamma API"
    )
    
    parser.add_argument(
        "--bind",
        action="store_true",
        help="Bind official weather stations to markets"
    )
    
    parser.add_argument(
        "--annotate",
        action="store_true",
        help="Add risk annotations to markets"
    )
    
    parser.add_argument(
        "--full",
        action="store_true",
        help="Run full pipeline (fetch, bind, annotate)"
    )
    
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Generate sample watchlist with mock data"
    )
    
    parser.add_argument(
        "--output", "-o",
        type=str,
        help="Output file path"
    )
    
    parser.add_argument(
        "--format", "-f",
        type=str,
        choices=["json", "markdown"],
        default="json",
        help="Output format (default: json)"
    )
    
    args = parser.parse_args()
    
    # Default to sample if no flags
    if not any([args.fetch, args.bind, args.annotate, args.full, args.sample]):
        args.sample = True
    
    run_pipeline(
        fetch=args.fetch,
        bind=args.bind,
        annotate=args.annotate,
        full=args.full,
        sample=args.sample,
        output=args.output,
        output_format=args.format
    )


if __name__ == "__main__":
    main()

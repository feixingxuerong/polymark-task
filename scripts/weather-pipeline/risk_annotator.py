#!/usr/bin/env python3
"""
risk_annotator.py - Add risk flags to markets per Issue #10

Analyzes market questions and rules to identify potential risk factors
that could lead to disputes or unclear resolutions.
"""

import json
import re
import sys
from typing import Optional

# Risk flag definitions from Issue #10
RISK_FLAGS = {
    "TIME_WINDOW_UNCLEAR": {
        "description": "Time window/hours not specified",
        "check": lambda q, r: not any(time_pattern in q.lower() + r.lower() 
                     for time_pattern in ["am", "pm", "utc", "hour", "12:00", "00:00", "midnight", "noon"]),
    },
    "TIMEZONE_AMBIGUOUS": {
        "description": "UTC vs local timezone not specified",
        "check": lambda q, r: not any(tz in q.lower() + r.lower() 
                     for tz in ["utc", "gmt", "local time", "est", "pst", "cst", "mst"]),
    },
    "STATION_UNSPECIFIED": {
        "description": "No specific weather station mentioned",
        "check": lambda q, r: not any(station in q.lower() + r.lower() 
                     for station in ["airport", "station", "kjfk", "kord", "klaX", "ksfo", "kmia", 
                                    "weather station", "noaa", "nws"]),
    },
    "THRESHOLD_VAGUE": {
        "description": "Threshold value unclear or ambiguous",
        "check": lambda q, r: any(vague in q.lower() + r.lower() 
                    for vague in ["more than", "less than", "above", "below", "exceed", "under"])
                    and not any(unit in q.lower() + r.lower() 
                    for unit in ["°f", "°c", "mm", "inch", "inches", "cm", "mph", "kph", "hpa", "mb"]),
    },
    "DATA_SOURCE_UNCLEAR": {
        "description": "Resolution data source not specified",
        "check": lambda q, r: not any(source in q.lower() + r.lower() 
                     for source in ["noaa", "nws", "ncei", "wmo", "met office", "jma", 
                                   "weather.com", "accuweather", "open-meteo"]),
    },
    "BOUNDARY_UNCLEAR": {
        "description": "Boundary value handling unclear (>= vs >)",
        "check": lambda q, r: any(boundary in q.lower() + r.lower() 
                    for boundary in ["inch", "mm", "°f", "°c"]) 
                    and not any(clear in q.lower() + r.lower() 
                    for clear in ["at least", "more than", "exceed", "greater than or equal"]),
    },
    "NO_VERIFICATION_SOURCE": {
        "description": "No publicly verifiable data source",
        "check": lambda q, r: not any(verify in q.lower() + r.lower() 
                     for verify in ["noaa", "nws", "official", "public", "verified", "source"]),
    },
}


def analyze_question(question: str) -> list[str]:
    """
    Analyze a question for risk factors.
    
    Args:
        question: Market question text
    
    Returns:
        List of risk flags
    """
    question = question or ""
    rules = ""
    
    return analyze_question_and_rules(question, rules)


def analyze_question_and_rules(question: str, rules: str) -> list[str]:
    """
    Analyze question and rules for risk factors.
    
    Args:
        question: Market question text
        rules: Market rules/resolution criteria
    
    Returns:
        List of risk flags
    """
    question = question or ""
    rules = rules or ""
    combined = f"{question.lower()} {rules.lower()}"
    
    flags = []
    for flag_name, flag_info in RISK_FLAGS.items():
        try:
            if flag_info["check"](question, rules):
                flags.append(flag_name)
        except Exception:
            pass
    
    return flags


def calculate_risk_level(flags: list[str]) -> str:
    """
    Calculate overall risk level based on flags.
    
    Args:
        flags: List of risk flags
    
    Returns:
        Risk level: "low", "medium", or "high"
    """
    if not flags:
        return "low"
    
    # Count critical flags
    critical = ["TIME_WINDOW_UNCLEAR", "TIMEZONE_AMBIGUOUS", "BOUNDARY_UNCLEAR"]
    critical_count = sum(1 for f in flags if f in critical)
    
    if critical_count >= 2 or len(flags) >= 4:
        return "high"
    elif critical_count >= 1 or len(flags) >= 2:
        return "medium"
    else:
        return "low"


def annotate_market(market: dict) -> dict:
    """
    Add risk annotations to a market.
    
    Args:
        market: Market card dictionary
    
    Returns:
        Market with risk annotations
    """
    question = market.get("question", "")
    rules = market.get("rules", "")
    
    # Get risk flags
    flags = analyze_question_and_rules(question, rules)
    
    # Add risk metadata
    market["risk_flags"] = flags
    market["risk_level"] = calculate_risk_level(flags)
    
    # Add flag descriptions
    market["risk_descriptions"] = [
        {"flag": flag, "description": RISK_FLAGS[flag]["description"]}
        for flag in flags
    ]
    
    return market


def annotate_markets(markets: list[dict]) -> list[dict]:
    """
    Annotate a list of markets with risk flags.
    
    Args:
        markets: List of market cards
    
    Returns:
        Markets with risk annotations
    """
    results = []
    for market in markets:
        annotated = annotate_market(market)
        results.append(annotated)
    
    # Summary stats
    risk_counts = {"low": 0, "medium": 0, "high": 0}
    for m in results:
        risk_counts[m.get("risk_level", "low")] += 1
    
    print(f"Risk distribution: {risk_counts}")
    return results


def main():
    """Test risk annotation."""
    test_markets = [
        {
            "question": "Will it snow in NYC on February 28?",
            "rules": "Snowfall measured at Central Park weather station."
        },
        {
            "question": "Will temperature exceed 100°F in Dallas on July 15 at 3pm CDT?",
            "rules": "Temperature measured at DFW airport official station."
        },
        {
            "question": "Will there be rain in London tomorrow?",
            "rules": ""
        },
        {
            "question": "Will more than 2 inches of snow fall in Denver?",
            "rules": "At least 2 inches of snowfall measured at Denver International Airport."
        },
        {
            "question": "Will it be hot in Miami this summer?",
            "rules": ""
        },
    ]
    
    for market in test_markets:
        annotated = annotate_market(market)
        print(f"Question: {annotated['question']}")
        print(f"  Risk Level: {annotated['risk_level']}")
        print(f"  Flags: {annotated['risk_flags']}")
        print()


if __name__ == "__main__":
    main()

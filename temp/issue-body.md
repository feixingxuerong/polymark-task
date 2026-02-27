## Goal
Run pipeline script to fetch real-time weather/event markets from Gamma API and generate actionable watchlist.

## Background
- #12 MVP pipeline implemented
- Need to verify pipeline with real data

## Steps
1. Run `python scripts/weather-pipeline/run.py --fetch` to fetch real markets
2. Filter candidates with liquidity > $1000
3. Bind official weather stations
4. Output watchlist with risk flags (JSON + Markdown)
5. Select 3-5 high-confidence candidates, mark as "actionable"

## Deliverables
- Real weather watchlist (JSON)
- Market analysis summary (Markdown)
- 3-5 actionable trade candidate cards

## Note
No actual trading; market scan + candidate recommendation only.
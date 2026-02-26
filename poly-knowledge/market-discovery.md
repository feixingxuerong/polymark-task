# Daily market discovery + watchlist process

Purpose: a repeatable workflow to generate a short list of Polymarket markets that are (a) tradable today and (b) plausibly mispriced.

## 1) Inputs / sources (check in this order)

### A. Polymarket first-party
- **Polymarket Browse/New/Trending**: identify newly listed markets, sudden volume spikes, or narrative-driven flow.
- **Category pages** (Politics, Crypto, Sports, etc.): stay within domains you can actually evaluate.
- **Market pages**: look for
  - liquidity / depth (can you enter/exit without huge slippage?)
  - spread / implied probability stability
  - resolution criteria clarity
  - time to resolution

Notes:
- If an official public API is available, prefer it; otherwise rely on the UI plus any allowable endpoints surfaced in the web app.

### B. News + catalysts
- A quick scan of **top headlines** in the domains you trade (politics/crypto/macrosports). The goal is not “read everything”—it’s to detect catalysts.
- For politics: debate dates, court deadlines, primaries, major legislative votes.
- For crypto: ETF decisions, major unlocks, large protocol upgrades, regulatory rulings.

### C. Social signal (only as a lead generator)
- Twitter/X lists of domain experts, journalists, and on-chain analysts.
- Treat social as *idea generation*, not proof.

## 2) Filter: what’s even worth scoring?

Hard filters (skip if any fail):
1. **Resolution is objective and unambiguous** (clear source + criteria).
2. **Time to resolution fits strategy** (avoid ultra-long unless you want capital tied up).
3. **You can size in/out** (liquidity + depth adequate; spreads not insane).
4. **No obvious “gotcha”** (weird wording, dependent sub-conditions, likely disputes).

## 3) Scoring rubric (0–5 each)

Score each candidate market; keep only top 3–10 on the watchlist.

1. **Edge clarity (0–5)**
   - 0: pure vibes
   - 3: you can state a falsifiable thesis + key indicators
   - 5: strong model/forecast or hard data advantage

2. **Liquidity & depth (0–5)**
   - 0: illiquid; cannot exit
   - 5: can enter/exit near mid with modest slippage

3. **Spread / execution cost (0–5)**
   - 0: huge spread, thin book
   - 5: tight spread; efficient execution possible

4. **Catalyst quality (0–5)**
   - 0: no clear catalyst
   - 5: defined date/event where info resolves uncertainty

5. **Manipulability / whale risk (0–5; reverse)**
   - 0: easily pushed around
   - 5: hard to manipulate; diversified flow

6. **Rule / settlement risk (0–5; reverse)**
   - 0: ambiguous; high dispute probability
   - 5: crystal clear

**Total /30**. Optional: add a “confidence” tag (Low/Med/High).

## 4) Watchlist template (copy/paste)

Create a table or YAML block per market.

### Minimal table fields
- Market name + URL
- Category
- Current price (Yes/No)
- Your fair value (FV)
- Edge (FV - price)
- Liquidity notes (depth/spread)
- Key catalyst + date
- Resolution criteria notes
- Thesis (2–3 bullets)
- What would change your mind?
- Risk notes
- Action: Watch / Small test / Build position / Avoid

### YAML template
```yaml
market:
  name: ""
  url: ""
  category: ""
  current:
    yes: null
    no: null
  fair_value_yes: null
  edge_bps: null
  catalyst:
    description: ""
    date: ""
  resolution_notes: ""
  liquidity:
    spread: ""
    depth: ""
  rubric:
    edge_clarity: 0
    liquidity_depth: 0
    spread_cost: 0
    catalyst_quality: 0
    manipulability_risk_reverse: 0
    settlement_risk_reverse: 0
    total_30: 0
  thesis:
    - ""
    - ""
  falsifiers:
    - ""
  risks:
    - ""
  next_action: "watch"
```

## 5) Routine

### Daily (15 minutes)
1. **5 min**: scan Polymarket Trending + New.
2. **5 min**: open 5–10 candidate markets; apply hard filters.
3. **5 min**: score 3–5 survivors; update watchlist; pick top 1–2 to research deeper.

### Weekly (60 minutes)
1. Review watchlist performance: did catalysts behave as expected?
2. Post-mortem any bad thesis: was it data, rules, or execution?
3. Update scoring weights and “auto-skip” rules.

## 6) Execution notes (practical)
- Prefer markets where you can state **why the crowd is wrong** (not just why you are right).
- Be wary of:
  - vague settlement language
  - “by date X” wording traps
  - low-liquidity markets that look mispriced but are untradeable
- Track fees/slippage explicitly; many “edges” disappear after costs.

# Match Brain

Match Brain is an educational / experimental project developed in **Google Apps Script (JavaScript)**.
It builds probabilistic picks for football events by transforming match/team variables into statistical features, computing market probabilities, and tracking real-world performance over time.

> Disclaimer: probabilities are estimates, not guarantees. This repository is shared for educational purposes.

---

## Architecture overview

**Data flow (high level)**

1. **Fetch**
   - Pull upcoming matches + standings/team stats from external REST APIs (optionally via a proxy to handle API keys and quotas).
2. **Transform**
   - Convert football variables (form, goals, points-per-game, etc.) into numeric features (`atk`, `def`, `strength`, …).
3. **Score**
   - Compute probabilities:
     - **1X2** via **Poisson model**
     - Derived markets:
       - Over/Under 2.5
       - BTTS (Goal/NoGoal)
       - Double Chance
4. **Compose**
   - Build “schedine” (multi-picks) and compute a **risk score** based on probability + market type + composition.
5. **Store / Dashboard**
   - Write outputs to Google Sheets tabs (e.g. `Partite`, `Schedine`, `RISULTATI`).
6. **Feedback loop**
   - Compare predicted outcomes vs real outcomes and calculate performance metrics (accuracy by market / league / time).
7. **Notify**
   - Send Telegram reports/alerts (weekly summary, value bets, accuracy alerts).

---

## Modules (GitHub)

- `src/engine/`
  - `poissonModel.js` → Poisson-based 1X2 probabilities
  - `markets.js` → derived markets (Over/BTTS/DoubleChance)
- `src/integrations/`
  - `retry.js` → retry/backoff for external calls
  - `telegram.js` → Telegram integration (no secrets committed)
- `src/messaging/`
  - `telegramReports.js` → weekly report + value bets report
  - `accuracyAlert.js` → alert when accuracy drops below threshold
- `src/pipeline/`
  - `analytics.js` → performance tracking (accuracy by market/league/time)
  - `valueBets.js` → QUOTE_INPUT generation + value recompute

> Code is modular here for reviewability; in Apps Script it can be merged into a single `.gs` file or multiple `.gs` files.

---

## Probabilistic model (1X2)

- Uses a Poisson goal model with expected goals (λ) derived from:
  - team attack (`atk`)
  - opponent defense (`def`)
  - tunable weights (for calibration)

Output:
- `p(1)`, `p(X)`, `p(2)` plus `lambdaHome`, `lambdaAway`.

Derived markets are computed via deterministic heuristics to keep runtime light and avoid external ML dependencies.

---

## Risk scoring

Each

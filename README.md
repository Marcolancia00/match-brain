# Match Brain

Match Brain is a Google Apps Script (JavaScript) project that generates football picks/schedules based on probabilistic estimates.
It integrates external data sources (API), transforms match variables into statistical features, computes market probabilities, and tracks performance over time.

> Educational / experimental project. Probabilities are estimates, not guarantees.

## Features
- 1X2 probability model (Poisson-based)
- Derived markets:
  - Over/Under 2.5
  - BTTS (Goal/NoGoal)
  - Double Chance
- Risk scoring logic for multi-picks
- VALUE bets support (fair odds vs bookmaker odds)
- Performance tracking & analytics dashboard (Google Sheets)
- Telegram notifications:
  - weekly report
  - value report
  - accuracy alert

## Tech Stack
- Google Apps Script (JavaScript)
- Google Sheets as storage + dashboard
- REST API integrations (via proxy if needed)
- Telegram Bot for messaging

## Project structure (GitHub)
- `src/engine/` → probability engine (Poisson + derived markets)
- `src/pipeline/` → orchestration (analytics + value bets)
- `src/integrations/` → external services (retry, telegram)
- `src/messaging/` → Telegram reports & alerts

> The repository is modular for readability. In Apps Script the same logic can be merged into one or multiple `.gs` files.

## Secrets
This repo contains **no secrets**.
Set these values in Google Apps Script ScriptProperties:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `API_BASE` (if using a private proxy)

## Disclaimer
This project is shared for educational purposes. No outcome is guaranteed.

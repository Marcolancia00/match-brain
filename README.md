## Project structure (GitHub)
This repository is organized in modules for readability:

- `src/engine/` → probability engine (Poisson 1X2 + derived markets)
- `src/integrations/` → external API calls + retry logic
- `src/pipeline/` → orchestration (fetch → compute → write to Sheets)
- `src/utils/` → helpers

In Google Apps Script the code can still live in a single file or multiple `.gs` files.
The modular structure here is meant to make the logic easier to review.

## Secrets
This repo contains no secrets.
Configure these in Google Apps Script ScriptProperties:
- TELEGRAM_BOT_TOKEN
- TELEGRAM_CHAT_ID
- API_BASE (if using a private proxy)


## Telegram notifications
Telegram integration is included, but **no tokens or chat ids** are stored in this repository.

Configure these ScriptProperties in Google Apps Script:
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`

Then you can run:
- weekly report (`inviaAlertTelegramSettimanale`)
- value report (`inviaValueBetsTelegram`)
- accuracy alert (`inviaAlertTelegramSuAccuracy`)

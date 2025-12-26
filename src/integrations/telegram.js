/**
 * Telegram integration (safe for public repo).
 * Secrets must be stored in Google Apps Script ScriptProperties:
 * - TELEGRAM_BOT_TOKEN
 * - TELEGRAM_CHAT_ID
 */

export function escapeMarkdownV2(s) {
  if (s === null || s === undefined) return "";
  s = String(s);
  return s.replace(/([_*\[\]\(\)~`>#+\-=|{}\.!\\])/g, "\\$1");
}

export function sendTelegramMessage(text, { parseMode = "MarkdownV2" } = {}) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty("TELEGRAM_BOT_TOKEN");
  const chatId = props.getProperty("TELEGRAM_CHAT_ID");

  const enabled = props.getProperty("ENABLE_TELEGRAM");
  if (enabled !== "true") {
    Logger.log("Telegram disabled (ENABLE_TELEGRAM !== 'true').");
    return;
  }

  if (!token || !chatId) {
    Logger.log("Telegram not configured.");
    return;
  }

  // fetch...
}

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const payload = {
    chat_id: chatId,
    text: parseMode === "MarkdownV2" ? escapeMarkdownV2(text) : String(text),
    parse_mode: parseMode,
  };

  const options = { method: "post", payload, muteHttpExceptions: true };
  const resp = UrlFetchApp.fetch(url, options);
  Logger.log("Telegram response: " + resp.getContentText());
}

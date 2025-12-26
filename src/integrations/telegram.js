/**
 * Telegram integration (Google Apps Script).
 * SECURITY: do NOT hardcode tokens/chat ids in public repos.
 *
 * Store secrets in ScriptProperties:
 * - TELEGRAM_BOT_TOKEN
 * - TELEGRAM_CHAT_ID
 */

export function getTelegramConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    token: props.getProperty("TELEGRAM_BOT_TOKEN"),
    chatId: props.getProperty("TELEGRAM_CHAT_ID"),
  };
}

export function escapeMarkdownV2(text) {
  if (text === null || text === undefined) return "";
  const s = String(text);
  return s.replace(/([_*\[\]\(\)~`>#+\-=|{}\.!\\])/g, "\\$1");
}

export function sendTelegramMessage(text, opts = {}) {
  const { parseMode = "MarkdownV2" } = opts;
  const { token, chatId } = getTelegramConfig();

  if (!token || !chatId) {
    Logger.log("Telegram not configured: missing TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID in ScriptProperties.");
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const payload = {
    chat_id: chatId,
    text: parseMode === "MarkdownV2" ? escapeMarkdownV2(text) : String(text),
    parse_mode: parseMode,
  };

  const options = {
    method: "post",
    payload,
    muteHttpExceptions: true,
  };

  const resp = UrlFetchApp.fetch(url, options);
  Logger.log("Telegram response: " + resp.getContentText());
}

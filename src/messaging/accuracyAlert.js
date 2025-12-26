import { sendTelegramMessage } from "../integrations/telegram.js";

export const ANALYTICS_SHEET_NAME = "ANALYTICS";

export function inviaAlertTelegramSuAccuracy({ soglia = 0.60 } = {}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ANALYTICS_SHEET_NAME);
  if (!sheet) {
    Logger.log("Foglio ANALYTICS non trovato per alert Telegram.");
    return;
  }

  const rng = sheet.getRange(1, 1, 10, 2).getValues();
  let accuracy = null;
  let totPron = null;

  rng.forEach(r => {
    if (r[0] === "Accuratezza totale") accuracy = r[1];
    if (r[0] === "Pronostici valutati") totPron = r[1];
  });

  if (accuracy === null || totPron === null) {
    Logger.log("KPI non trovati in ANALYTICS, nessun alert.");
    return;
  }

  if (accuracy >= soglia) {
    Logger.log("Accuracy sopra soglia, nessun alert. Attuale: " + accuracy);
    return;
  }

  const accPercent = Math.round(accuracy * 1000) / 10;
  const sogliaPercent = soglia * 100;

  const msg =
    "⚠️ Alert accuratezza sistema\n" +
    "Accuracy attuale: *" + accPercent + "%* su " + totPron + " pronostici.\n" +
    "Soglia impostata: " + sogliaPercent + "%.\n\n" +
    "Suggerimento: limita le giocate ai mercati e campionati con migliore accuracy (vedi foglio ANALYTICS).";

  sendTelegramMessage(msg, { parseMode: "Markdown" });
}

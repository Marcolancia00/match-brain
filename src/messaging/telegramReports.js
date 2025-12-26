import { sendTelegramMessage } from "../integrations/telegram.js";

/**
 * Thresholds for categorization.
 */
export const TELEGRAM_PROB_ALTA = 0.70;   // >= 70%
export const TELEGRAM_PROB_MEDIA = 0.55;  // 55–70%

/**
 * Build and send weekly report based on the "Partite" sheet.
 * NOTE: This function assumes your Sheets columns match the expected indexes.
 * Keep it as "example implementation" for the public repo.
 */
export function inviaAlertTelegramSettimanale({ timezone = "Europe/Rome" } = {}) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Partite");
  if (!sheet) {
    SpreadsheetApp.getActive().toast("Foglio 'Partite' non trovato", "MatchBrain", 5);
    return;
  }

  // Optional: refresh data before reporting
  // (In your production project you can call generaSchedine() here.)
  // try { generaSchedine(); } catch (e) { Logger.log(e); }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    SpreadsheetApp.getActive().toast("Nessuna partita da analizzare", "MatchBrain", 5);
    return;
  }

  const probabili = [];
  const medie = [];
  const difficili = [];

  // IMPORTANT:
  // These indexes depend on your sheet layout.
  // If you change the sheet structure, update them here.
  const COL_DATA = 5;
  const COL_MATCH = 6;
  const COL_P = 9;
  const COL_BEST = 10;
  const COL_COMMENT = 11;

  for (let i = 1; i < values.length; i++) {
    const row = values[i];

    const dataVal = row[COL_DATA];
    const matchName = row[COL_MATCH];
    let prob = row[COL_P];
    const bestEsito = row[COL_BEST];
    const commento = row[COL_COMMENT];

    if (prob === null || prob === "") continue;
    prob = Number(prob);
    if (isNaN(prob)) continue;

    const pPercent = Math.round(prob * 1000) / 10;

    let dataStr = "";
    if (dataVal instanceof Date) {
      dataStr = Utilities.formatDate(dataVal, timezone, "dd/MM HH:mm");
    } else if (typeof dataVal === "string") {
      dataStr = dataVal;
    }

    let descr = "";
    if (dataStr) descr += dataStr + " | ";
    descr += matchName || "";
    if (bestEsito) descr += " | " + bestEsito;
    if (commento) descr += " | " + commento;
    descr += ` (${pPercent}%)`;

    if (prob >= TELEGRAM_PROB_ALTA) probabili.push(descr);
    else if (prob >= TELEGRAM_PROB_MEDIA) medie.push(descr);
    else difficili.push(descr);
  }

  const maxPerSezione = 15;
  const P = probabili.slice(0, maxPerSezione);
  const M = medie.slice(0, maxPerSezione);
  const D = difficili.slice(0, maxPerSezione);

  const now = new Date();
  const lines = [];
  lines.push("📊 *Report settimanale analisi partite*");
  lines.push("_Generato il_ " + Utilities.formatDate(now, timezone, "dd/MM/yyyy HH:mm"));
  lines.push("");

  function addSection(title, arr) {
    lines.push("▫️ *" + title + "*");
    if (!arr.length) lines.push("  (nessuna partita in questa categoria)");
    else arr.forEach(s => lines.push("  - " + s));
    lines.push("");
  }

  addSection(`Scheda probabile (≥ ${Math.round(TELEGRAM_PROB_ALTA * 100)}%)`, P);
  addSection(
    `Equilibrate / medie (${Math.round(TELEGRAM_PROB_MEDIA * 100)}% – ${Math.round(TELEGRAM_PROB_ALTA * 100)}%)`,
    M
  );
  addSection(`Difficili (< ${Math.round(TELEGRAM_PROB_MEDIA * 100)}%)`, D);

  lines.push("ℹ️ *Come usarle*");
  lines.push("- Per schedine ragionate: 1–3 partite dalla sezione *Scheda probabile*.");
  lines.push("- Per alzare la quota: aggiungi al massimo 1 partita dalle *Equilibrate / medie*.");
  lines.push("- Le *Difficili* sono solo per giocate ad alto rischio.");
  lines.push("");
  lines.push("_Le percentuali sono stime statistiche, non garanzie di vincita._");

  sendTelegramMessage(lines.join("\n"), { parseMode: "MarkdownV2" });
}

/**
 * Sends only VALUE bets from the QUOTE_INPUT sheet.
 * Expects QUOTE_INPUT columns:
 * A Data partita | B Campionato | C Match | D Mercato | E Esito | F Prob | G Quota equa | H Quota bookmaker | I Value% | J ESITO VALUE
 */
export function inviaValueBetsTelegram() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName("QUOTE_INPUT");
  if (!sh) {
    SpreadsheetApp.getActive().toast("Foglio QUOTE_INPUT non trovato", "MatchBrain", 5);
    return;
  }

  const lastRow = sh.getLastRow();
  if (lastRow < 2) {
    sendTelegramMessage("📭 Nessun dato in QUOTE_INPUT (vuoto).");
    return;
  }

  const rows = sh.getRange(2, 1, lastRow - 1, 10).getValues();

  const valueRows = rows
    .filter(r => String(r[9] || "").toUpperCase().trim() === "VALUE") // J
    .map(r => ({
      date: r[0],
      league: r[1],
      match: r[2],
      market: r[3],
      esito: r[4],
      prob: r[5],
      fair: r[6],
      book: r[7],
      edge: r[8],
    }));

  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");

  if (!valueRows.length) {
    sendTelegramMessage(
      `📉 *VALUE Report*\nGenerato il ${now}\n\nNessuna giocata VALUE trovata in QUOTE_INPUT.\n\n` +
      `_Suggerimento:_ aggiorna QUOTE_INPUT e inserisci le quote bookmaker in colonna H.`
    );
    return;
  }

  valueRows.sort((a, b) => {
    const da = new Date(a.date);
    const db = new Date(b.date);

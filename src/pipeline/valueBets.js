export const SHEET_PARTITE = "Partite";
export const SHEET_QUOTE_INPUT = "QUOTE_INPUT";

export const MIN_BOOK_ODDS = 1.60;
export const MIN_EDGE = 0.00;

export function aggiornaQuoteInputDaPartite() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const src = ss.getSheetByName(SHEET_PARTITE);
  if (!src) {
    SpreadsheetApp.getActive().toast("Foglio PARTITE non trovato", "ValueBets", 6);
    return;
  }

  const sh = ss.getSheetByName(SHEET_QUOTE_INPUT) || ss.insertSheet(SHEET_QUOTE_INPUT);

  const data = src.getDataRange().getValues();
  if (data.length < 2) {
    SpreadsheetApp.getActive().toast("PARTITE è vuoto", "ValueBets", 5);
    return;
  }

  const hdr = data[0].map(x => String(x || "").trim());
  const idx = (name) => hdr.indexOf(name);

  const I = {
    DATA: idx("Data"),
    CAMP: idx("Campionato"),
    CASA: idx("Casa"),
    TRASF: idx("Trasferta"),
    BEST: idx("Miglior esito"),
    P1: idx("p(1)"),
    PX: idx("p(X)"),
    P2: idx("p(2)"),
    POVER: idx("p(OVER_2.5)"),
    PBTTS: idx("p(BTTS)"),
    PNOG: idx("p(NOGOAL)"),
    PUNDER: idx("p(UNDER_2.5)"),
    P1X: idx("p(1X)"),
    PX2: idx("p(X2)"),
    P12: idx("p(12)"),
  };

  const required = [I.DATA, I.CAMP, I.CASA, I.TRASF, I.BEST, I.P1, I.PX, I.P2, I.POVER, I.PBTTS];
  if (required.some(x => x === -1)) {
    SpreadsheetApp.getActive().toast("Header PARTITE non compatibile (mancano colonne chiave)", "ValueBets", 8);
    Logger.log("Headers trovati: " + JSON.stringify(hdr));
    return;
  }

  // Preserve existing bookmaker odds (col H)
  const qbMap = new Map();
  const last = sh.getLastRow();
  if (last >= 2) {
    const old = sh.getRange(2, 1, last - 1, 10).getValues();
    old.forEach(r => {
      const key = buildKey_(r[1], r[0], r[2], r[4]); // league, date, match, esito
      if (key) qbMap.set(key, r[7]); // H
    });
  }

  const HEAD = [[
    "Data partita", "Campionato", "Match", "Mercato",
    "Esito pronosticato", "Probabilità modello",
    "Quota equa", "Quota bookmaker",
    "Value %", "ESITO VALUE"
  ]];

  const out = [];
  const seen = new Set();

  for (let i = 1; i < data.length; i++) {
    const r = data[i];

    const d = r[I.DATA];
    const league = r[I.CAMP];
    const casa = r[I.CASA];
    const trasf = r[I.TRASF];
    const best = String(r[I.BEST] || "").trim().toUpperCase();

    if (!d || !league || !casa || !trasf || !best) continue;

    const match = `${casa} vs ${trasf}`;

    const pick = pickFromBest_(best, r, I);
    if (!pick || !pick.prob || pick.prob <= 0) continue;

    const key = buildKey_(league, d, match, pick.esito);
    if (seen.has(key)) continue;
    seen.add(key);

    const quotaEqua = 1 / pick.prob;
    const qb = qbMap.has(key) ? qbMap.get(key) : "";

    const val = computeValue_(pick.prob, qb, quotaEqua);

    out.push([d, league, match, pick.mercato, pick.esito, pick.prob, quotaEqua, qb, val.valuePct, val.label]);
  }

  sh.clearContents();
  sh.getRange(1, 1, 1, 10).setValues(HEAD);

  if (!out.length) {
    SpreadsheetApp.getActive().toast("QUOTE_INPUT: nessun dato valido da PARTITE", "ValueBets", 7);
    return;
  }

  sh.getRange(2, 1, out.length, 10).setValues(out);

  // Formats
  sh.getRange(2, 6, out.length, 1).setNumberFormat("0.00%"); // Prob
  sh.getRange(2, 7, out.length, 1).setNumberFormat("0.00");  // Fair
  sh.getRange(2, 8, out.length, 1).setNumberFormat("0.00");  // Book
  sh.getRange(2, 9, out.length, 1).setNumberFormat("0.00%"); // Value%

  SpreadsheetApp.getActive().toast("QUOTE_INPUT aggiornato ✔️", "ValueBets", 5);
}

export function ricalcolaValueQuoteInput() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET_QUOTE_INPUT);
  if (!sh || sh.getLastRow() < 2) return;

  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues();

  rows.forEach(r => {
    const prob = toProb_(r[5]);
    const qb = toNum_(r[7]);
    const quotaEqua = toNum_(r[6]) || (prob > 0 ? (1 / prob) : NaN);

    if (!prob || !qb || !quotaEqua) {
      r[8] = "";
      r[9] = "";
      return;
    }

    const edge = (qb / quotaEqua) - 1;
    r[8] = edge;
    r[9] = (qb >= MIN_BOOK_ODDS && edge >= MIN_EDGE && qb > quotaEqua) ? "VALUE" : "NO";
  });

  sh.getRange(2, 1, rows.length, 10).setValues(rows);
  sh.getRange(2, 9, rows.length, 1).setNumberFormat("0.00%");
}

/** ---- helpers ---- */

function pickFromBest_(best, row, I) {
  if (best === "1") return { mercato: "1X2", esito: "1", prob: toProb_(row[I.P1]) };
  if (best === "X") return { mercato: "1X2", esito: "X", prob: toProb_(row[I.PX]) };
  if (best === "2") return { mercato: "1X2", esito: "2", prob: toProb_(row[I.P2]) };

  if (best === "1X" && I.P1X !== -1) return { mercato: "DOPPIA_CHANCE", esito: "1X", prob: toProb_(row[I.P1X]) };
  if (best === "X2" && I.PX2 !== -1) return { mercato: "DOPPIA_CHANCE", esito: "X2", prob: toProb_(row[I.PX2]) };
  if (best === "12" && I.P12 !== -1) return { mercato: "DOPPIA_CHANCE", esito: "12", prob: toProb_(row[I.P12]) };

  if (best === "OVER" || best === "OVER_2.5") return { mercato: "OVER_2.5", esito: "OVER", prob: toProb_(row[I.POVER]) };

  if (best === "UNDER" || best === "UNDER_2.5") {
    const pOver = toProb_(row[I.POVER]);
    const pUnder = (I.PUNDER !== -1) ? toProb_(row[I.PUNDER]) : clamp_(1 - pOver, 0, 1);
    return { mercato: "UNDER_2.5", esito: "UNDER", prob: pUnder };
  }

  if (best === "GOAL" || best === "BTTS") return { mercato: "BTTS", esito: "GOAL", prob: toProb_(row[I.PBTTS]) };
  if (best === "NOGOAL" || best === "NO GOAL") {
    const pBtts = toProb_(row[I.PBTTS]);
    const pNo = (I.PNOG !== -1) ? toProb_(row[I.PNOG]) : clamp_(1 - pBtts, 0, 1);
    return { mercato: "BTTS", esito: "NOGOAL", prob: pNo };
  }

  return null;
}

function computeValue_(prob, qbRaw, quotaEqua) {
  const qb = toNum_(qbRaw);
  if (!qb || isNaN(qb) || qb <= 1) return { valuePct: "", label: "" };

  const edge = (qb / quotaEqua) - 1;
  const label = (qb >= MIN_BOOK_ODDS && qb > quotaEqua && edge >= MIN_EDGE) ? "VALUE" : "NO";
  return { valuePct: edge, label };
}

function buildKey_(league, dateVal, match, esito) {
  const iso = dateToIsoSafe_(dateVal);
  if (!league || !iso || !match || !esito) return "";
  return [String(league).trim(), iso, String(match).trim(), String(esito).trim().toUpperCase()].join("||");
}

function dateToIsoSafe_(v) {
  if (!v) return "";
  if (v instanceof Date) return Utilities.formatDate(v, "GMT", "yyyy-MM-dd");

  let s = String(v).trim();
  if (s.includes(" ")) s = s.split(" ")[0];

  const parts = s.split("/");
  if (parts.length === 3) {
    const dd = parts[0].padStart(2, "0");
    const mm = parts[1].padStart(2, "0");
    const yy = parts[2];
    return `${yy}-${mm}-${dd}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

function toNum_(v) {
  if (v == null || v === "") return NaN;
  if (typeof v === "number") return v;
  const s = String(v).trim().replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return isNaN(n) ? NaN : n;
}

function toProb_(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return (v > 1) ? v / 100 : v;

  let

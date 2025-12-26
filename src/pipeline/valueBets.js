/***************
 * VALUE BETS – VERSIONE STABILE (NO FORMULE)
 ***************/

const SHEET_QUOTE = "QUOTE_INPUT";

const MIN_BOOK_ODDS = 1.60; // quota minima bookmaker
const MIN_EDGE = 0.00;      // value minimo (0 = >= equa)

/**
 * CREA / AGGIORNA QUOTE_INPUT DA PARTITE
 * NON tocca le quote bookmaker già inserite
 */
function aggiornaQuoteInputDaPartite() {
  const ss = SpreadsheetApp.getActive();
  const src = ss.getSheetByName(SHEET_PARTITE);
  if (!src) {
    SpreadsheetApp.getUi().alert("Foglio PARTITE non trovato");
    return;
  }

  const sh = ss.getSheetByName(SHEET_QUOTE) || ss.insertSheet(SHEET_QUOTE);

  const data = src.getDataRange().getValues();
  if (data.length < 2) return;

  const hdr = data[0];
  const idx = n => hdr.indexOf(n);

  const I = {
    DATA: idx("Data"),
    CAMP: idx("Campionato"),
    MATCH: idx("Match"),
    BEST: idx("Miglior esito"),
    P1: idx("p(1)"),
    PX: idx("p(X)"),
    P2: idx("p(2)"),
    POVER: idx("p(OVER_2.5)"),
    PBTTS: idx("p(BTTS)")
  };

  // salvo quote bookmaker esistenti
  const old = sh.getLastRow() >= 2
    ? sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues()
    : [];

  const qbMap = new Map();
  old.forEach(r => {
    const k = key_(r[1], r[0], r[2], r[4]);
    if (k) qbMap.set(k, r[7]);
  });

  const out = [];
  const seen = new Set();

  for (let i = 1; i < data.length; i++) {
    const r = data[i];
    const best = String(r[I.BEST] || "").toUpperCase();
    if (!best) continue;

    let mercato = "", esito = "", prob = null;

    if (best === "1") { mercato = "1X2"; esito = "1"; prob = r[I.P1]; }
    else if (best === "X") { mercato = "1X2"; esito = "X"; prob = r[I.PX]; }
    else if (best === "2") { mercato = "1X2"; esito = "2"; prob = r[I.P2]; }
    else if (best === "GOAL") { mercato = "BTTS"; esito = "GOAL"; prob = r[I.PBTTS]; }
    else if (best === "OVER") { mercato = "OVER_2.5"; esito = "OVER"; prob = r[I.POVER]; }
    else continue;

    prob = num_(prob);
    if (!prob || prob <= 0) continue;

    const k = key_(r[I.CAMP], r[I.DATA], r[I.MATCH], esito);
    if (seen.has(k)) continue;
    seen.add(k);

    const qe = 1 / prob;
    const qb = qbMap.get(k) || "";

    out.push([
      r[I.DATA], r[I.CAMP], r[I.MATCH],
      mercato, esito,
      prob, qe, qb,
      "", ""
    ]);
  }

  sh.clear();
  sh.getRange(1, 1, 1, 10).setValues([[
    "Data partita","Campionato","Match","Mercato",
    "Esito pronosticato","Probabilità modello",
    "Quota equa","Quota bookmaker","Value %","ESITO VALUE"
  ]]);

  if (out.length) {
    sh.getRange(2, 1, out.length, 10).setValues(out);
    sh.getRange(2, 6, out.length, 1).setNumberFormat("0.00%");
    sh.getRange(2, 7, out.length, 1).setNumberFormat("0.00");
    sh.getRange(2, 8, out.length, 1).setNumberFormat("0.00");
  }

  SpreadsheetApp.getActive().toast("QUOTE_INPUT aggiornato ✔️", "ValueBets", 4);
}

/**
 * RICALCOLA VALUE DOPO CHE INSERISCI LE QUOTE BOOKMAKER
 */
function ricalcolaValueQuoteInput() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEET_QUOTE);
  if (!sh || sh.getLastRow() < 2) return;

  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues();

  rows.forEach(r => {
    const prob = num_(r[5]);
    const qb = num_(r[7]);

    if (!prob || !qb) {
      r[8] = "";
      r[9] = "";
      return;
    }

    const qe = 1 / prob;
    const edge = (qb / qe) - 1;

    r[8] = edge;
    r[9] = (qb >= MIN_BOOK_ODDS && edge >= MIN_EDGE) ? "VALUE" : "NO";
  });

  sh.getRange(2, 1, rows.length, 10).setValues(rows);
  sh.getRange(2, 9, rows.length, 1).setNumberFormat("0.00%");
}

/* ===== Helpers ===== */
function num_(v) {
  if (v === "" || v == null) return null;
  if (typeof v === "number") return v;
  const n = Number(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

function key_(camp, data, match, esito) {
  const iso = Utilities.formatDate(new Date(data), "GMT", "yyyy-MM-dd");
  return [camp, iso, match, esito].join("||");
}


/**
 * Aggiorna QUOTE_INPUT prendendo i pronostici dal foglio SCHEDINE.
 * - Deduplica per: Campionato + Data(ISO) + Match + Esito
 * - Preserva "Quota bookmaker" già inserita
 * - Calcola Quota equa, Value % e ESITO VALUE senza formule (niente problemi lingua)
 */
function aggiornaQuoteInputDaSchedine() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const shSched = ss.getSheetByName("SCHEDINE") || ss.getSheetByName("Schedine");
  if (!shSched) {
    SpreadsheetApp.getActive().toast("Foglio 'SCHEDINE' non trovato", "ValueBets", 6);
    return;
  }

  const shQuote = ss.getSheetByName("QUOTE_INPUT") || ss.insertSheet("QUOTE_INPUT");

  const lastRow = shSched.getLastRow();
  const lastCol = shSched.getLastColumn();
  if (lastRow < 2) {
    SpreadsheetApp.getActive().toast("SCHEDINE è vuoto", "ValueBets", 6);
    return;
  }

  // Leggo header SCHEDINE e creo mappa colonne
  const headers = shSched.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || "").trim());
  const idx = (name) => headers.indexOf(name);

  // Nomi attesi in SCHEDINE (come nel tuo file)
  const COL_LEAGUE = idx("Campionato");
  const COL_DATA   = idx("Data partita");
  const COL_MATCH  = idx("Match");
  const COL_MARKET = idx("Mercato");
  const COL_ESITO  = idx("Esito");
  const COL_P      = idx("p");

  const missing = [];
  if (COL_LEAGUE === -1) missing.push("Campionato");
  if (COL_DATA === -1)   missing.push("Data partita");
  if (COL_MATCH === -1)  missing.push("Match");
  if (COL_MARKET === -1) missing.push("Mercato");
  if (COL_ESITO === -1)  missing.push("Esito");
  if (COL_P === -1)      missing.push("p");

  if (missing.length) {
    SpreadsheetApp.getActive().toast("SCHEDINE: mancano colonne: " + missing.join(", "), "ValueBets", 8);
    Logger.log("Headers trovati in SCHEDINE: " + JSON.stringify(headers));
    return;
  }

  // --- Carico quota bookmaker già inserite per NON perderle ---
  const qbMap = new Map(); // key -> quota bookmaker
  const qLast = shQuote.getLastRow();
  if (qLast >= 2) {
    const old = shQuote.getRange(2, 1, qLast - 1, 10).getValues(); // A..J
    old.forEach(r => {
      const league = r[1];
      const dateV  = r[0];
      const match  = r[2];
      const esito  = r[4];
      const qb     = r[7]; // H = Quota bookmaker (nel nuovo layout)
      if (!league || !dateV || !match || !esito) return;
      qbMap.set(buildVBKey_(league, dateV, match, esito), qb);
    });
  }

  // Leggo righe SCHEDINE
  const rows = shSched.getRange(2, 1, lastRow - 1, lastCol).getValues();

  // Header QUOTE_INPUT (10 colonne)
  const HEAD = [[
    "Data partita",          // A
    "Campionato",            // B
    "Match",                 // C
    "Mercato",               // D
    "Esito pronosticato",    // E
    "Probabilità modello",   // F
    "Quota equa",            // G
    "Quota bookmaker",       // H (manuale)
    "Value %",               // I
    "ESITO VALUE"            // J
  ]];

  const out = [];
  const seen = new Set();

  rows.forEach(r => {
    const league = r[COL_LEAGUE];
    const dateV  = r[COL_DATA];
    const match  = r[COL_MATCH];
    const market = r[COL_MARKET];
    const esito  = String(r[COL_ESITO] || "").trim().toUpperCase();
    const pRaw   = r[COL_P];

    if (!league || !dateV || !match || !market || !esito || pRaw === "" || pRaw == null) return;

    const p = toProb_(pRaw);
    if (!p || p <= 0) return;

    const key = buildVBKey_(league, dateV, match, esito);
    if (seen.has(key)) return;  // deduplica tra schedine diverse
    seen.add(key);

    const quotaEqua = 1 / p;
    const qbSaved = qbMap.get(key);
    const qb = qbSaved !== undefined ? qbSaved : "";

    // Value calc (se quota bookmaker presente)
    const val = computeValue_(p, qb, quotaEqua);

    out.push([
      dateV, league, match,
      market,
      esito,
      p,
      quotaEqua,
      qb,
      val.valuePct,
      val.label
    ]);
  });

  // Scrivo foglio
  shQuote.clearContents();
  shQuote.getRange(1, 1, 1, 10).setValues(HEAD);

  if (!out.length) {
    SpreadsheetApp.getActive().toast("QUOTE_INPUT: nessun dato valido da SCHEDINE", "ValueBets", 7);
    return;
  }

  shQuote.getRange(2, 1, out.length, 10).setValues(out);

  // Formati corretti (così “Quota bookmaker” NON diventa percentuale)
  shQuote.getRange(2, 6, out.length, 1).setNumberFormat("0.00%"); // Prob
  shQuote.getRange(2, 7, out.length, 1).setNumberFormat("0.00");  // Quota equa
  shQuote.getRange(2, 8, out.length, 1).setNumberFormat("0.00");  // Quota bookmaker
  shQuote.getRange(2, 9, out.length, 1).setNumberFormat("0.00%"); // Value %

  shQuote.setFrozenRows(1);

  SpreadsheetApp.getActive().toast(`QUOTE_INPUT aggiornato ✔️ (${out.length} righe, deduplicate)`, "ValueBets", 6);
}

/** key univoca: league + isoDate + match + esito */
function buildVBKey_(league, dateVal, match, esito) {
  const iso = dateToIsoSafe_(dateVal);
  return [String(league||"").trim(), iso, String(match||"").trim(), String(esito||"").trim()].join("||");
}

/** Data -> yyyy-MM-dd robusta */
function dateToIsoSafe_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, "GMT", "yyyy-MM-dd");
  const s = String(v || "").trim();
  // prende solo la parte data se "dd/MM/yyyy HH:mm"
  const dmy = s.split(" ")[0];
  const parts = dmy.split("/");
  if (parts.length === 3) {
    const dd = parts[0].padStart(2, "0");
    const mm = parts[1].padStart(2, "0");
    const yy = parts[2];
    return `${yy}-${mm}-${dd}`;
  }
  // già ISO?
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s || "NA";
}

/** Prob: supporta 0,73 / 0.73 / 73% / "73,00%" / 73 */
function toProb_(v) {
  if (v === "" || v == null) return 0;
  if (typeof v === "number") return v > 1 ? v / 100 : v;

  let s = String(v).trim();
  const isPct = s.includes("%");
  s = s.replace("%", "").replace(",", ".").replace(/[^\d.\-]/g, "");
  const n = Number(s);
  if (isNaN(n)) return 0;

  if (isPct) return n / 100;
  return n > 1 ? n / 100 : n;
}

/**
 * Calcolo value:
 * - valuePct = (qb / quotaEqua) - 1
 * - label = VALUE se qb >= 1.60 e qb > quotaEqua
 */
function computeValue_(prob, qbRaw, quotaEqua) {
  const qb = (qbRaw === "" || qbRaw == null) ? NaN : Number(String(qbRaw).replace(",", "."));
  if (isNaN(qb) || qb <= 1) return { valuePct: "", label: "" };

  const edge = (qb / quotaEqua) - 1;     // 0.10 = +10%
  const label = (qb >= 1.60 && qb > quotaEqua) ? "VALUE" : "NO";
  return { valuePct: edge, label };
}

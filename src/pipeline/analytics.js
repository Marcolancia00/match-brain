export const RISULTATI_SHEET_NAME = "RISULTATI";
export const ANALYTICS_SHEET_NAME = "ANALYTICS";

export function aggiornaAnalytics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const resSheet = ss.getSheetByName(RISULTATI_SHEET_NAME);
  if (!resSheet) {
    SpreadsheetApp.getActive().toast("Foglio 'RISULTATI' non trovato", "Analytics", 5);
    return;
  }

  let analyticsSheet = ss.getSheetByName(ANALYTICS_SHEET_NAME);
  if (!analyticsSheet) analyticsSheet = ss.insertSheet(ANALYTICS_SHEET_NAME);

  const values = resSheet.getDataRange().getValues();
  if (values.length < 2) {
    analyticsSheet.clear();
    analyticsSheet.getRange(1, 1).setValue("Nessun dato in RISULTATI");
    return;
  }

  const data = values.slice(1);

  const COL_LEAGUE = 1;
  const COL_DATA_PART = 2;
  const COL_SNAPSHOT = 0;
  const COL_MATCH = 3;
  const COL_PRON = 4;
  const COL_PROB = 5;
  const COL_CORRETTA = 7;

  let tot = 0, corretti = 0;
  const byMarket = {};
  const byLeague = {};
  const byDate = {};

  data.forEach(row => {
    const league = row[COL_LEAGUE];
    const dataPart = row[COL_DATA_PART];
    const snapshot = row[COL_SNAPSHOT];
    const match = row[COL_MATCH];
    const pron = row[COL_PRON];
    const probVal = row[COL_PROB];
    const corretta = row[COL_CORRETTA];

    if (!match || !league) return;
    if (corretta !== "SI" && corretta !== "NO") return;

    tot++;
    if (corretta === "SI") corretti++;

    const mercato = mercatoFromPronostico_(pron);
    byMarket[mercato] ||= { tot: 0, corretti: 0, sumProb: 0 };
    byMarket[mercato].tot++;
    if (corretta === "SI") byMarket[mercato].corretti++;

    const pNum = Number(probVal);
    if (!isNaN(pNum) && pNum > 0 && pNum <= 1) byMarket[mercato].sumProb += pNum;

    byLeague[league] ||= { tot: 0, corretti: 0 };
    byLeague[league].tot++;
    if (corretta === "SI") byLeague[league].corretti++;

    const dateVal = snapshot || dataPart;
    const dateKey = normalizeDateKey_(dateVal);
    if (!dateKey) return;

    byDate[dateKey] ||= { tot: 0, corretti: 0 };
    byDate[dateKey].tot++;
    if (corretta === "SI") byDate[dateKey].corretti++;
  });

  analyticsSheet.clear();
  try { analyticsSheet.clearCharts(); } catch (e) {}

  let r = 1;
  analyticsSheet.getRange(r++, 1).setValue("KPI globali");
  const accuracy = tot > 0 ? corretti / tot : "";
  analyticsSheet.getRange(r++, 1, 1, 2).setValues([["Accuratezza totale", accuracy]]);
  analyticsSheet.getRange(r++, 1, 1, 2).setValues([["Pronostici valutati", tot]]);
  analyticsSheet.getRange(r++, 1, 1, 2).setValues([["Pronostici corretti", corretti]]);
  analyticsSheet.getRange(r++, 1, 1, 2).setValues([["Ultimo aggiornamento", new Date()]]);
  r += 2;

  const marketTitleRow = r;
  analyticsSheet.getRange(r++, 1).setValue("Accuratezza per mercato");
  analyticsSheet.getRange(r++, 1, 1, 6).setValues([["Mercato","Totale","Corretti","Accuracy","Prob media prevista","Quota equa media"]]);

  Object.keys(byMarket).forEach(m => {
    const o = byMarket[m];
    const acc = o.tot ? o.corretti / o.tot : "";
    const probMedia = (o.tot && o.sumProb) ? (o.sumProb / o.tot) : "";
    const quotaEqua = probMedia ? (1 / probMedia) : "";
    analyticsSheet.getRange(r++, 1, 1, 6).setValues([[m, o.tot, o.corretti, acc, probMedia, quotaEqua]]);
  });

  r += 2;
  const leagueTitleRow = r;
  analyticsSheet.getRange(r++, 1).setValue("Accuratezza per campionato");
  analyticsSheet.getRange(r++, 1, 1, 4).setValues([["Campionato","Totale","Corretti","Accuracy"]]);

  Object.keys(byLeague)
    .sort((a,b) => (byLeague[b].corretti/byLeague[b].tot || 0) - (byLeague[a].corretti/byLeague[a].tot || 0))
    .forEach(l => {
      const o = byLeague[l];
      const acc = o.tot ? o.corretti / o.tot : "";
      analyticsSheet.getRange(r++, 1, 1, 4).setValues([[l, o.tot, o.corretti, acc]]);
    });

  r += 2;
  const timeTitleRow = r;
  analyticsSheet.getRange(r++, 1).setValue("Andamento nel tempo (per giorno)");
  analyticsSheet.getRange(r++, 1, 1, 4).setValues([["Data","Totale","Corretti","Accuracy"]]);

  Object.keys(byDate).sort().forEach(dk => {
    const o = byDate[dk];
    const acc = o.tot ? o.corretti / o.tot : "";
    analyticsSheet.getRange(r++, 1, 1, 4).setValues([[dk, o.tot, o.corretti, acc]]);
  });

  SpreadsheetApp.getActive().toast("Analytics aggiornati ✔️", "Analytics", 5);

  // Charts (optional): puoi aggiungerli qui come nel tuo codice originale
}

function mercatoFromPronostico_(p) {
  if (!p) return "Altro";
  const s = p.toString().toUpperCase().trim();
  if (s === "1" || s === "X" || s === "2") return "1X2";
  if (s.startsWith("OVER")) return "OVER";
  if (s.startsWith("GOAL") || s.startsWith("NOGOAL") || s.startsWith("NO GOAL")) return "BTTS";
  return "Altro";
}

function normalizeDateKey_(val) {
  if (!val) return "";
  if (val instanceof Date) return Utilities.formatDate(val, "Europe/Rome", "yyyy-MM-dd");

  let s = String(val).trim();
  if (s.includes(" ")) s = s.split(" ")[0];

  const parts = s.split("/");
  if (parts.length === 3) {
    const d = parts[0].padStart(2, "0");
    const m = parts[1].padStart(2, "0");
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return "";
}

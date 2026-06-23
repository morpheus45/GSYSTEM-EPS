// Plages de dates pour les tableaux de bord (admin / responsable).
// Chaque preset renvoie { key, label, start, end } (bornes Date incluses).

function d(y, m, day) { return new Date(y, m, day); }
function startOfDay(x) { return new Date(x.getFullYear(), x.getMonth(), x.getDate()); }
function addDays(x, n) { return new Date(x.getFullYear(), x.getMonth(), x.getDate() + n); }

// Lundi de la semaine d'une date (semaine ISO : lundi→dimanche).
function monday(x) {
  const wd = (x.getDay() + 6) % 7; // 0=lundi
  return addDays(startOfDay(x), -wd);
}

export const RANGE_PRESETS = [
  ["today", "Aujourd'hui"],
  ["yesterday", "Hier"],
  ["thisWeek", "Cette semaine"],
  ["lastWeek", "Semaine préc."],
  ["thisMonth", "Ce mois"],
  ["lastMonth", "Mois préc."],
  ["thisYear", "Année"],
  ["custom", "Personnalisé"],
];

export function rangeFor(key, customStart, customEnd) {
  const now = new Date();
  const t = startOfDay(now);
  let start, end, label;
  switch (key) {
    case "yesterday": start = addDays(t, -1); end = addDays(t, -1); label = "Hier"; break;
    case "thisWeek": start = monday(t); end = addDays(start, 6); label = "Cette semaine"; break;
    case "lastWeek": start = addDays(monday(t), -7); end = addDays(start, 6); label = "Semaine préc."; break;
    case "thisMonth": start = d(t.getFullYear(), t.getMonth(), 1); end = d(t.getFullYear(), t.getMonth() + 1, 0); label = "Ce mois"; break;
    case "lastMonth": start = d(t.getFullYear(), t.getMonth() - 1, 1); end = d(t.getFullYear(), t.getMonth(), 0); label = "Mois préc."; break;
    case "thisYear": start = d(t.getFullYear(), 0, 1); end = d(t.getFullYear(), 11, 31); label = "Année " + t.getFullYear(); break;
    case "custom":
      start = customStart ? startOfDay(new Date(customStart)) : t;
      end = customEnd ? startOfDay(new Date(customEnd)) : t;
      label = "Personnalisé"; break;
    case "today":
    default: start = t; end = t; label = "Aujourd'hui"; break;
  }
  return { key, label, start, end };
}

// Liste de jours (Date) entre start et end inclus — pour les courbes d'évolution.
export function eachDay(start, end) {
  const out = []; let c = startOfDay(start); const last = startOfDay(end);
  let guard = 0;
  while (c <= last && guard++ < 400) { out.push(new Date(c)); c = addDays(c, 1); }
  return out;
}

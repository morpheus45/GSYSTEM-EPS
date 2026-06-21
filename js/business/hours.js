// Heures — port de util/HoursCalculator.kt (table 0/4/6/8h, journée entière 7h).

export const WHOLE_DAY_TYPES = ["VACANCES", "FORMATION", "FERIE"];

function isWholeDay(e) {
  return WHOLE_DAY_TYPES.includes((e.typeMission || "").toUpperCase());
}
function inSlot(e, slot) {
  const s = e.slotMidi || "";
  if (slot === "MATIN") return s === "MATIN" || s === ""; // legacy → matin
  if (slot === "APREM") return s === "APREM";
  return false;
}

/** Heures d'une journée à partir de ses entrées TEMPS. */
export function computeForDay(entries) {
  if (!entries.length) return 0;
  if (entries.some(isWholeDay)) return 7;

  const matinActive = entries.some((e) => inSlot(e, "MATIN"));
  const apremActive = entries.some((e) => inSlot(e, "APREM"));
  const matinOk = entries.some((e) => inSlot(e, "MATIN") && !(e.observationType || ""));
  const apremOk = entries.some((e) => inSlot(e, "APREM") && !(e.observationType || ""));

  const nActive = (matinActive ? 1 : 0) + (apremActive ? 1 : 0);
  const nOk = (matinOk ? 1 : 0) + (apremOk ? 1 : 0);

  if (nActive === 0) return 0;
  if (nActive === 1) return 4;
  if (nOk === 2) return 8;
  return 6;
}

/** Total d'heures sur un ensemble d'entrées, groupées par jour. */
export function totalHours(entries) {
  const byDay = {};
  for (const e of entries) (byDay[e.date] ||= []).push(e);
  return Object.values(byDay).reduce((sum, day) => sum + computeForDay(day), 0);
}

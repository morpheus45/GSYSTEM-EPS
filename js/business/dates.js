// Dates — port de util/Dates.kt (cycle de paie 21→20 par défaut).

export function todayIso() {
  return toIso(new Date());
}
export function toIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function parseIso(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function fr(dOrIso) {
  const d = typeof dOrIso === "string" ? parseIso(dOrIso) : dOrIso;
  const day = String(d.getDate()).padStart(2, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${m}/${d.getFullYear()}`;
}

/**
 * Période du cycle courant. cycleStartDay=21 :
 *   15/05 → [21/04, 20/05] ; 22/05 → [21/05, 20/06].
 * Retourne { start, end } (objets Date, bornes incluses).
 */
export function cyclePeriod(reference, cycleStartDay) {
  const day = Math.min(Math.max(cycleStartDay, 1), 28);
  const ref = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  let start = new Date(ref.getFullYear(), ref.getMonth(), day);
  if (ref < start) start = new Date(ref.getFullYear(), ref.getMonth() - 1, day);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, day - 0);
  end.setDate(end.getDate() - 1); // start + 1 mois - 1 jour
  return { start, end };
}

export function inRange(iso, start, end) {
  const d = parseIso(iso);
  return d >= start && d <= end;
}

export function currentQuarter() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `${now.getFullYear()} / Q${q}`;
}

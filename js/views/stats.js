// Panneau RÉCAP réutilisable (fidèle au RÉCAP de l'APK) + sélecteur de période.
// Utilisé par : tech /recap (ses stats), admin/responsable (détail d'un tech),
// tableau de bord. Les données complètes sont déjà chargées → filtrage client.
import { h, icon } from "../ui.js";
import { CONFIG } from "../config.js";
import { cyclePeriod, fr, inRange } from "../business/dates.js";
import { totalHours } from "../business/hours.js";
import { eur, htFromTtc, tvaFromTtc } from "../business/frais.js";
import { GESTE_TYPES, DEFAULT_PRIMES, totalPrime } from "../business/gesteco.js";
import { pieChart, barChart } from "./charts.js";

// Résultats possibles d'une intervention (observationType) + libellé + couleur.
export const OUTCOMES = [
  ["", "Réalisée (OK)", "#22C55E"],
  ["NR_CLIENT", "NR client", "#F59E0B"],
  ["NR_TECHNIQUE", "NR technique", "#06B6D4"],
  ["NR_CLIENT_ABS", "NR client absent", "#8B5CF6"],
  ["ANNULE", "Annulé", "#EF4444"],
];

function shiftMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, d.getDate()); }

// Stats détaillées : résultats des interventions + qualité commerciale des installations.
export function detailStats(store, start, end) {
  const f = (a) => (a || []).filter((e) => inRange(e.date, start, end));
  const temps = f(store.temps), geste = f(store.gesteCo);
  const outc = {}; OUTCOMES.forEach(function (o) { outc[o[0]] = 0; });
  temps.forEach((e) => { const o = e.observationType || ""; if (o in outc) outc[o]++; else outc[""]++; });
  const inst = temps.filter((e) => e.typeMission === "INST");
  const instOk = inst.filter((e) => !(e.observationType || "")).length;
  const instAnnule = inst.filter((e) => e.observationType === "ANNULE").length;
  const instNR = inst.length - instOk - instAnnule;
  const extByType = {}; GESTE_TYPES.forEach((t) => extByType[t] = 0);
  geste.forEach((g) => GESTE_TYPES.forEach((t) => extByType[t] += (g.installed?.[t] || 0)));
  const extTotal = Object.values(extByType).reduce((s, n) => s + n, 0);
  return {
    outc, inst: { total: inst.length, ok: instOk, annule: instAnnule, nr: instNR },
    ventesSites: geste.length,
    tauxTransfo: inst.length ? Math.round(geste.length / inst.length * 100) : 0,
    extByType, extTotal, extPerInst: inst.length ? extTotal / inst.length : 0,
  };
}

// Bloc DOM « résultats + qualité commerciale » pour une période.
export function detailNodes(store, start, end) {
  const d = detailStats(store, start, end);
  const kpi = (v, k, c) => h("div", { class: "kpi" },
    h("div", { class: "v", style: c ? `color:${c}` : "" }, v), h("div", { class: "k" }, k));
  const out = [];

  out.push(pieChart(OUTCOMES.map(([k, l, c]) => ({ label: l, value: d.outc[k], color: c })),
    "Résultats des interventions"));

  out.push(h("div", { class: "card" },
    h("h3", {}, "Qualité commerciale · installations"),
    h("div", { class: "kpi-grid" },
      kpi(String(d.inst.total), "Installations"),
      kpi(String(d.inst.ok), "INST réalisées", "var(--success)"),
      kpi(String(d.inst.annule), "INST annulées", "var(--signal)"),
      kpi(String(d.inst.nr), "INST en NR", "var(--warning)"),
      kpi(d.tauxTransfo + " %", "Taux transfo", "var(--geste-accent)"),
      kpi(d.extPerInst.toFixed(1), "Ext. / install."),
      kpi(String(d.ventesSites), "Ventes (sites)"),
      kpi(String(d.extTotal), "Extensions"))));

  out.push(barChart(
    GESTE_TYPES.filter((t) => d.extByType[t] > 0).map((t) => ({ label: t, value: d.extByType[t] })),
    "Extensions vendues par type"));

  return out;
}

// Période du cycle décalée de `offset` mois (0 = cycle courant).
export function periodForOffset(offset) {
  return cyclePeriod(shiftMonths(new Date(), offset), CONFIG.DEFAULT_CYCLE_START_DAY);
}

// Calcule le récap d'un jeu d'entrées sur une période.
export function computeRecap(store, start, end) {
  const f = (a) => (a || []).filter((e) => inRange(e.date, start, end));
  const temps = f(store.temps), frais = f(store.frais), geste = f(store.gesteCo);
  const hours = totalHours(temps);
  const ttc = frais.reduce((s, e) => s + (e.montantEur || 0), 0);
  const tva = frais.reduce((s, e) => s + tvaFromTtc(e.montantEur || 0, e.categorie), 0);
  const prime = geste.reduce((s, g) => s + totalPrime(g.installed || {}, DEFAULT_PRIMES), 0);
  const byType = {};
  for (const t of GESTE_TYPES) byType[t] = 0;
  for (const g of geste) for (const t of GESTE_TYPES) byType[t] += (g.installed?.[t] || 0);
  return { temps, frais, geste, hours, ttc, tva, ht: ttc - tva, prime, byType };
}

// Panneau interactif avec navigation de période (← mois →).
// store = {temps,frais,gesteCo,compteur} complet. startOffset par défaut 0.
export function recapPanel(store) {
  let offset = 0;
  const content = h("div", {});

  const kpi = (v, k) => h("div", { class: "kpi" }, h("div", { class: "v" }, v), h("div", { class: "k" }, k));
  const stat = (k, v) => h("div", { class: "statrow" }, h("span", { class: "k" }, k), h("span", { class: "v" }, v));

  function render() {
    const { start, end } = periodForOffset(offset);
    const r = computeRecap(store, start, end);
    content.innerHTML = "";
    content.append(
      h("div", { class: "kpi-grid" },
        kpi(String(r.temps.length), "Interventions"),
        kpi(r.hours + " h", "Heures"),
        kpi(eur(r.prime), "Primes"),
        kpi(eur(r.ttc), "Frais TTC")),
      h("div", { class: "card" },
        h("h3", {}, "GESTE CO installés"),
        GESTE_TYPES.some((t) => r.byType[t] > 0)
          ? GESTE_TYPES.filter((t) => r.byType[t] > 0).map((t) => stat(t, String(r.byType[t])))
          : h("div", { class: "muted-empty" }, "Aucune extension cette période")),
      h("div", { class: "card" },
        h("h3", {}, "Frais"),
        stat("HT", eur(r.ht)), stat("TVA", eur(r.tva)),
        h("div", { class: "statrow" }, h("span", { class: "k", style: "color:var(--frais-accent)" }, "TOTAL TTC"),
          h("span", { class: "v", style: "color:var(--frais-accent)" }, eur(r.ttc)))),
      ...detailNodes(store, start, end)
    );
  }

  const label = h("span", { class: "t-label", style: "flex:1;text-align:center" });
  function refreshLabel() { const { start, end } = periodForOffset(offset); label.textContent = `${fr(start)} → ${fr(end)}`; }

  const prev = h("button", { class: "icon-btn", title: "Mois précédent",
    onclick: () => { offset--; refreshLabel(); render(); } }, "‹");
  const next = h("button", { class: "icon-btn", title: "Mois suivant",
    onclick: () => { if (offset < 0) { offset++; refreshLabel(); render(); } } }, "›");

  const nav = h("div", { class: "period-nav" }, prev, label, next);
  refreshLabel(); render();
  return h("div", {}, nav, content);
}

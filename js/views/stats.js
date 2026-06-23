// Panneau RÉCAP réutilisable (fidèle au RÉCAP de l'APK) + sélecteur de période.
// Utilisé par : tech /recap (ses stats), admin/responsable (détail d'un tech),
// tableau de bord. Les données complètes sont déjà chargées → filtrage client.
import { h, icon } from "../ui.js";
import { CONFIG } from "../config.js";
import { cyclePeriod, fr, inRange } from "../business/dates.js";
import { totalHours } from "../business/hours.js";
import { eur, htFromTtc, tvaFromTtc } from "../business/frais.js";
import { GESTE_TYPES, DEFAULT_PRIMES, totalPrime } from "../business/gesteco.js";

function shiftMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, d.getDate()); }

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
          h("span", { class: "v", style: "color:var(--frais-accent)" }, eur(r.ttc))))
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

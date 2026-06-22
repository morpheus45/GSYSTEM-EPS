import { h, toast, overlay } from "../../ui.js";
import { screen } from "../shell.js";
import { token } from "../../auth.js";
import { api } from "../../api.js";
import { loadMine } from "../../store.js";
import { CONFIG } from "../../config.js";
import { cyclePeriod, fr, inRange } from "../../business/dates.js";
import { totalHours } from "../../business/hours.js";
import { eur } from "../../business/frais.js";
import { GESTE_TYPES, DEFAULT_PRIMES, totalPrime } from "../../business/gesteco.js";

export async function recapView() {
  const store = await loadMine();
  const { start, end } = cyclePeriod(new Date(), CONFIG.DEFAULT_CYCLE_START_DAY);
  const f = (a) => a.filter((e) => inRange(e.date, start, end));

  const temps = f(store.temps);
  const geste = f(store.gesteCo);
  const frais = f(store.frais);

  const hours = totalHours(temps);
  const sumFrais = frais.reduce((s, e) => s + (e.montantEur || 0), 0);
  const prime = geste.reduce((s, g) => s + totalPrime(g.installed || {}, DEFAULT_PRIMES), 0);

  // détail primes par type
  const byType = {};
  for (const t of GESTE_TYPES) byType[t] = 0;
  for (const g of geste) for (const t of GESTE_TYPES) byType[t] += (g.installed?.[t] || 0);

  const stat = (k, v) => h("div", { class: "statrow" }, h("span", { class: "k" }, k), h("span", { class: "v" }, v));

  const send = async () => {
    try { overlay(true);
      await api("send", { type: "email", channel: "recap", payload: { start: fr(start), end: fr(end) } }, token());
      overlay(false); toast("Récap PDF envoyé");
    } catch (e) { overlay(false); toast(e.message); }
  };

  return screen("RÉCAP", "var(--recap-start)", [
    h("div", { class: "banner", style: "background:var(--obsidian-1);border:1px solid var(--hairline)" },
      `Cycle ${fr(start)} → ${fr(end)}`),
    h("div", { class: "kpi-grid" },
      kpi(String(temps.length), "Interventions"),
      kpi(hours + " h", "Heures"),
      kpi(eur(prime), "Primes"),
      kpi(eur(sumFrais), "Frais TTC")),
    h("div", { class: "card" },
      h("h3", {}, "Détail GESTE CO (installées)"),
      ...GESTE_TYPES.filter((t) => byType[t] > 0).map((t) => stat(t, String(byType[t]))),
      byType && !GESTE_TYPES.some((t) => byType[t] > 0)
        ? h("div", { class: "muted-empty" }, "Aucune extension ce cycle") : null),
    h("button", { class: "btn", onclick: send }, "Envoyer le récap (PDF)"),
  ]);
}

function kpi(v, k) { return h("div", { class: "kpi" }, h("div", { class: "v" }, v), h("div", { class: "k" }, k)); }

import { h, icon, overlay, initials, avatarColor } from "../../ui.js";
import { screen } from "../_shell.js";
import { currentUser } from "../../auth.js";
import { navigate } from "../../router.js";
import { api } from "../../api.js";
import { token } from "../../auth.js";
import { CONFIG } from "../../config.js";
import { cyclePeriod, fr, inRange } from "../../business/dates.js";
import { totalHours } from "../../business/hours.js";
import { eur } from "../../business/frais.js";
import { DEFAULT_PRIMES, totalPrime } from "../../business/gesteco.js";

// Tableau de bord « au fil de l'eau » : agrège les données de tous les techs
// (admin) ou de l'équipe (responsable) sur le cycle courant.
export async function adminDashboardView() {
  const me = currentUser();
  const { users } = await api("tree", {}, token());
  const techs = users.filter((u) => u.role === "tech");

  const { start, end } = cyclePeriod(new Date(), CONFIG.DEFAULT_CYCLE_START_DAY);

  const rows = [];
  let gTemps = 0, gHours = 0, gPrime = 0, gFrais = 0;
  for (const t of techs) {
    let data = { temps: [], frais: [], gesteCo: [], compteur: [] };
    try { data = await api("getUserData", { userId: t.id }, token()); } catch {}
    const f = (a) => a.filter((e) => inRange(e.date, start, end));
    const temps = f(data.temps), frais = f(data.frais), geste = f(data.gesteCo);
    const hours = totalHours(temps);
    const prime = geste.reduce((s, g) => s + totalPrime(g.installed || {}, DEFAULT_PRIMES), 0);
    const sumFrais = frais.reduce((s, e) => s + (e.montantEur || 0), 0);
    gTemps += temps.length; gHours += hours; gPrime += prime; gFrais += sumFrais;
    rows.push({ t, n: temps.length, hours, prime, sumFrais });
  }
  rows.sort((a, b) => b.n - a.n);

  const kpi = (v, k) => h("div", { class: "kpi" }, h("div", { class: "v" }, v), h("div", { class: "k" }, k));

  const body = [
    h("div", { class: "banner", style: "background:var(--obsidian-1);border:1px solid var(--hairline)" },
      `Cycle ${fr(start)} → ${fr(end)} · ${techs.length} techniciens`),
    h("div", { class: "kpi-grid" },
      kpi(String(gTemps), "Interventions"),
      kpi(gHours + " h", "Heures"),
      kpi(eur(gPrime), "Primes"),
      kpi(eur(gFrais), "Frais")),
    h("div", { class: "section-title" }, "Par technicien"),
    ...rows.map(({ t, n, hours, prime, sumFrais }) =>
      h("div", { class: "node" },
        h("div", { class: "node-head", onclick: () => navigate("/admin/user/" + t.id) },
          h("div", { class: "avatar", style: `background:${avatarColor(t.name)}` }, initials(t.name)),
          h("div", { class: "meta" }, h("div", { class: "nm" }, t.name),
            h("div", { class: "sub" }, `${n} interv · ${hours} h · ${eur(prime)} primes · ${eur(sumFrais)} frais`)),
          h("span", { class: "chev" }, icon("chevron", 18))))),
    rows.length ? null : h("div", { class: "muted-empty" }, "Aucun technicien"),
  ];

  overlay(false);
  return screen("TABLEAU DE BORD", "var(--recap-start)", body, { back: "/admin" });
}

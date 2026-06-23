import { h, icon, overlay, initials, avatarColor } from "../../ui.js";
import { screen } from "../shell.js";
import { currentUser } from "../../auth.js";
import { navigate } from "../../router.js";
import { api } from "../../api.js";
import { token } from "../../auth.js";
import { fr } from "../../business/dates.js";
import { eur } from "../../business/frais.js";
import { getView, viewBanner } from "../../impersonate.js";
import { periodForOffset, computeRecap } from "../stats.js";

// Tableau de bord « au fil de l'eau » : agrège les stats des techs sur la
// période choisie (← › pour les mois précédents). Scope par rôle.
export async function adminDashboardView() {
  const me = currentUser();
  const view = getView();
  const { users } = await api("tree", {}, token());
  let techs = users.filter((u) => u.role === "tech" && u.status !== "inactive");
  if (view && view.role === "responsable") techs = techs.filter((t) => t.responsableId === view.id);

  // charge une fois les données brutes de chaque tech
  const raw = {};
  for (const t of techs) {
    try { raw[t.id] = await api("getUserData", { userId: t.id }, token()); }
    catch { raw[t.id] = { temps: [], frais: [], gesteCo: [], compteur: [] }; }
  }

  let offset = 0;
  const content = h("div", {});
  const kpi = (v, k) => h("div", { class: "kpi" }, h("div", { class: "v" }, v), h("div", { class: "k" }, k));

  function render() {
    const { start, end } = periodForOffset(offset);
    let gT = 0, gH = 0, gP = 0, gF = 0;
    const rows = techs.map((t) => {
      const r = computeRecap(raw[t.id], start, end);
      gT += r.temps.length; gH += r.hours; gP += r.prime; gF += r.ttc;
      return { t, n: r.temps.length, hours: r.hours, prime: r.prime, frais: r.ttc };
    }).sort((a, b) => b.n - a.n);

    content.innerHTML = "";
    content.append(
      h("div", { class: "banner", style: "background:var(--obsidian-1);border:1px solid var(--hairline)" },
        `${techs.length} techniciens · cycle ${fr(start)} → ${fr(end)}`),
      h("div", { class: "kpi-grid" },
        kpi(String(gT), "Interventions"), kpi(gH + " h", "Heures"),
        kpi(eur(gP), "Primes"), kpi(eur(gF), "Frais")),
      h("div", { class: "section-title" }, "Par technicien"),
      ...rows.map(({ t, n, hours, prime, frais }) =>
        h("div", { class: "node" },
          h("div", { class: "node-head", onclick: () => navigate("/admin/user/" + t.id) },
            h("div", { class: "avatar", style: `background:${avatarColor(t.name)}` }, initials(t.name)),
            h("div", { class: "meta" }, h("div", { class: "nm" }, t.name),
              h("div", { class: "sub" }, `${n} interv · ${hours} h · ${eur(prime)} primes · ${eur(frais)} frais`)),
            h("span", { class: "chev" }, icon("chevron", 18))))),
      rows.length ? null : h("div", { class: "muted-empty" }, "Aucun technicien"));
  }

  const label = h("span", { class: "t-label", style: "flex:1;text-align:center" });
  function refreshLabel() { const { start, end } = periodForOffset(offset); label.textContent = `${fr(start)} → ${fr(end)}`; }
  const nav = h("div", { class: "period-nav" },
    h("button", { class: "icon-btn", title: "Mois précédent", onclick: () => { offset--; refreshLabel(); render(); } }, "‹"),
    label,
    h("button", { class: "icon-btn", title: "Mois suivant", onclick: () => { if (offset < 0) { offset++; refreshLabel(); render(); } } }, "›"));

  refreshLabel(); render();
  overlay(false);
  return screen("TABLEAU DE BORD", "var(--recap-start)", [viewBanner(() => navigate("/admin")), nav, content], { back: "/admin" });
}

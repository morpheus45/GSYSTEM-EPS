import { h, icon, overlay, initials, avatarColor, toast } from "../../ui.js";
import { screen } from "../shell.js";
import { currentUser } from "../../auth.js";
import { navigate } from "../../router.js";
import { api } from "../../api.js";
import { token } from "../../auth.js";
import { fr, toIso } from "../../business/dates.js";
import { eur } from "../../business/frais.js";
import { getView, viewBanner } from "../../impersonate.js";
import { computeRecap, detailNodes } from "../stats.js";
import { RANGE_PRESETS, rangeFor, eachDay } from "../../business/dateRange.js";
import { pieChart, barChart, lineChart, PALETTE } from "../charts.js";

const MISSION_COLORS = { INST: "#7C3AED", SAV: "#06B6D4", REPA: "#F59E0B", RESI: "#10B981",
  PILE: "#3B82F6", DECL: "#EC4899", AJOU: "#8B5CF6", AUTRE: "#64748B" };

// KPIs d'un tech sur une période (fidèle au RÉCAP + indicateurs de pilotage).
function kpisFor(store, start, end) {
  const r = computeRecap(store, start, end);
  const temps = r.temps;
  const inst = temps.filter((e) => e.typeMission === "INST").length;
  const ok = temps.filter((e) => !(e.observationType || "")).length;
  const nr = temps.length - ok;
  const ventesSites = r.geste.length;                 // sites avec vente GESTE CO
  const ventesExt = Object.values(r.byType).reduce((s, n) => s + n, 0); // extensions vendues
  const byMission = {};
  temps.forEach((e) => { const m = e.typeMission || "AUTRE"; byMission[m] = (byMission[m] || 0) + 1; });
  return {
    interventions: temps.length, inst, ok, nr, hours: r.hours,
    ventesSites, ventesExt, prime: r.prime, frais: r.ttc, rentab: r.prime - r.ttc,
    tauxCloture: temps.length ? Math.round(ok / temps.length * 100) : 0,
    tauxTransfo: inst ? Math.round(ventesSites / inst * 100) : 0,
    byMission, temps,
  };
}

export async function adminDashboardView() {
  const me = currentUser();
  const view = getView();
  const { users } = await api("tree", {}, token());
  let techs = users.filter((u) => u.role === "tech" && u.status !== "inactive");
  if (view && view.role === "responsable") techs = techs.filter((t) => t.responsableId === view.id);
  const respById = {}; users.filter((u) => u.role === "responsable").forEach((r) => respById[r.id] = r.name);

  // données brutes (en PARALLÈLE pour la vitesse)
  const raw = {};
  await Promise.all(techs.map(async (t) => {
    try { raw[t.id] = await api("getUserData", { userId: t.id }, token()); }
    catch { raw[t.id] = { temps: [], frais: [], gesteCo: [], compteur: [] }; }
  }));

  let rangeKey = "thisMonth", cStart = "", cEnd = "";
  const content = h("div", {});
  const customWrap = h("div", { class: "range-custom", style: "display:none" });

  const kpi = (v, k, accent) => h("div", { class: "kpi" },
    h("div", { class: "v", style: accent ? `color:${accent}` : "" }, v), h("div", { class: "k" }, k));

  function aggregate(start, end) {
    const per = techs.map((t) => ({ t, k: kpisFor(raw[t.id], start, end) }));
    const g = { interventions: 0, inst: 0, ok: 0, nr: 0, hours: 0, ventesSites: 0, ventesExt: 0, prime: 0, frais: 0 };
    const byMission = {};
    per.forEach(({ k }) => {
      g.interventions += k.interventions; g.inst += k.inst; g.ok += k.ok; g.nr += k.nr;
      g.hours += k.hours; g.ventesSites += k.ventesSites; g.ventesExt += k.ventesExt;
      g.prime += k.prime; g.frais += k.frais;
      for (const m in k.byMission) byMission[m] = (byMission[m] || 0) + k.byMission[m];
    });
    g.rentab = g.prime - g.frais;
    g.tauxCloture = g.interventions ? Math.round(g.ok / g.interventions * 100) : 0;
    g.tauxTransfo = g.inst ? Math.round(g.ventesSites / g.inst * 100) : 0;
    return { per, g, byMission };
  }

  function lineSeries(start, end) {
    const days = eachDay(start, end);
    if (days.length <= 62) {
      return days.map((d) => {
        const iso = toIso(d);
        let n = 0; techs.forEach((t) => n += (raw[t.id].temps || []).filter((e) => e.date === iso).length);
        return { label: iso, value: n };
      });
    }
    // par mois
    const byMonth = {};
    techs.forEach((t) => (raw[t.id].temps || []).forEach((e) => {
      const dd = new Date(e.date); if (dd >= start && dd <= end) { const k = e.date.slice(0, 7); byMonth[k] = (byMonth[k] || 0) + 1; }
    }));
    return Object.keys(byMonth).sort().map((k) => ({ label: k, value: byMonth[k] }));
  }

  // store fusionné de tous les techs du périmètre (pour les stats agrégées)
  const mergedStore = { temps: [], frais: [], gesteCo: [], compteur: [] };
  techs.forEach((t) => {
    const d = raw[t.id] || {};
    ["temps", "frais", "gesteCo", "compteur"].forEach((k) => { (d[k] || []).forEach((e) => mergedStore[k].push(e)); });
  });

  function render() {
    const range = rangeFor(rangeKey, cStart, cEnd);
    const { per, g, byMission } = aggregate(range.start, range.end);
    const ranked = per.slice().sort((a, b) => b.k.interventions - a.k.interventions);

    // classement équipes (admin uniquement, hors aperçu)
    const teams = {};
    if (me.role === "admin" && !view) {
      per.forEach(({ t, k }) => { const rid = t.responsableId || "—"; teams[rid] = (teams[rid] || 0) + k.interventions; });
    }

    content.innerHTML = "";
    content.append(
      h("div", { class: "banner", style: "background:var(--obsidian-1);border:1px solid var(--hairline)" },
        `${range.label} · ${fr(range.start)} → ${fr(range.end)} · ${techs.length} techniciens`),

      // KPI cards
      h("div", { class: "kpi-grid" },
        kpi(String(g.interventions), "Interventions"),
        kpi(String(g.ok), "Terminées", "var(--success)"),
        kpi(String(g.nr), "Non réalisées", "var(--warning)"),
        kpi(g.hours + " h", "Heures"),
        kpi(String(g.ventesSites), "Ventes (sites)"),
        kpi(String(g.ventesExt), "Extensions"),
        kpi(eur(g.prime), "Primes €", "var(--temps-accent)"),
        kpi(eur(g.frais), "Frais €"),
        kpi(eur(g.rentab), "Net (primes-frais)", g.rentab >= 0 ? "var(--success)" : "var(--signal)"),
        kpi(g.tauxCloture + " %", "Taux clôture"),
        kpi(g.tauxTransfo + " %", "Taux transfo"),
        kpi(String(g.inst), "Installations")),

      // Graphiques
      pieChart(Object.keys(byMission).map((m) => ({ label: m, value: byMission[m], color: MISSION_COLORS[m] || null })),
        "Répartition des interventions"),
      lineChart(lineSeries(range.start, range.end), "Évolution des interventions", "#3B82F6"),
      barChart(ranked.slice(0, 12).map(({ t, k }) => ({ label: t.name, value: k.interventions })),
        "Classement techniciens (interventions)"),
      (me.role === "admin" && !view)
        ? barChart(Object.keys(teams).map((rid) => ({ label: respById[rid] || "Sans resp.", value: teams[rid] })),
            "Classement équipes")
        : null,
      barChart(ranked.slice(0, 12).map(({ t, k }) => ({ label: t.name, value: Math.round(k.prime) })),
        "Classement techniciens (primes €)", " €"),

      // détail résultats + qualité commerciale (agrégé sur le périmètre)
      h("div", { class: "section-title" }, "Résultats & qualité commerciale"),
      ...detailNodes(mergedStore, range.start, range.end),

      // tableau détaillé
      h("div", { class: "section-title" }, "Détail par technicien"),
      ...ranked.map(({ t, k }) =>
        h("div", { class: "node" },
          h("div", { class: "node-head", onclick: () => navigate("/admin/user/" + t.id) },
            h("div", { class: "avatar", style: `background:${avatarColor(t.name)}` }, initials(t.name)),
            h("div", { class: "meta" }, h("div", { class: "nm" }, t.name),
              h("div", { class: "sub" }, `${k.interventions} interv · ${k.ok} ok · ${k.ventesSites} ventes · ${eur(k.prime)} · ${k.tauxCloture}% clôt`)),
            h("span", { class: "chev" }, icon("chevron", 18))))),
      ranked.length ? null : h("div", { class: "muted-empty" }, "Aucun technicien"),

      // exports
      h("div", { class: "row", style: "margin-top:14px" },
        h("button", { class: "btn ghost", onclick: () => exportCsv(range, per) }, "⬇ Export Excel (CSV)"),
        h("button", { class: "btn ghost", onclick: () => window.print() }, "🖨 PDF / Imprimer")));
  }

  function exportCsv(range, per) {
    let csv = "Technicien;Interventions;Terminees;NonRealisees;Installations;Heures;VentesSites;Extensions;Primes;Frais;Net;TauxCloture;TauxTransfo\n";
    per.forEach(({ t, k }) => {
      csv += [t.name, k.interventions, k.ok, k.nr, k.inst, k.hours, k.ventesSites, k.ventesExt,
        k.prime.toFixed(2), k.frais.toFixed(2), k.rentab.toFixed(2), k.tauxCloture + "%", k.tauxTransfo + "%"]
        .join(";") + "\n";
    });
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stats_${range.key}_${toIso(range.start)}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
    toast("Export CSV téléchargé");
  }

  // chips de période
  const chips = h("div", { class: "range-chips" },
    ...RANGE_PRESETS.map(([key, label]) =>
      h("button", { class: "chip" + (key === rangeKey ? " active" : ""), "data-k": key,
        onclick: () => {
          rangeKey = key;
          chips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("active", c.getAttribute("data-k") === key));
          customWrap.style.display = key === "custom" ? "flex" : "none";
          render();
        } }, label)));

  const ciStart = h("input", { type: "date", onchange: (e) => { cStart = e.target.value; if (rangeKey === "custom") render(); } });
  const ciEnd = h("input", { type: "date", onchange: (e) => { cEnd = e.target.value; if (rangeKey === "custom") render(); } });
  customWrap.append(ciStart, ciEnd);

  render();
  overlay(false);
  return screen("TABLEAU DE BORD", "var(--recap-start)",
    [viewBanner(() => navigate("/admin")), chips, customWrap, content], { back: "/admin" });
}

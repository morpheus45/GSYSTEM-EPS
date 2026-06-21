import { h, icon, toast, overlay, initials, avatarColor } from "../../ui.js";
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

export async function userDetailView(userId) {
  const me = currentUser();
  const { users } = await api("tree", {}, token());
  const u = users.find((x) => x.id === userId);
  if (!u) { toast("Introuvable"); navigate("/admin"); return h("div"); }

  const isTech = u.role === "tech";
  let store = { temps: [], frais: [], gesteCo: [], compteur: [] };
  if (isTech) { try { store = await api("getUserData", { userId }, token()); } catch {} }

  const { start, end } = cyclePeriod(new Date(), CONFIG.DEFAULT_CYCLE_START_DAY);
  const f = (a) => a.filter((e) => inRange(e.date, start, end));
  const temps = f(store.temps), frais = f(store.frais), geste = f(store.gesteCo);
  const hours = totalHours(temps);
  const sumFrais = frais.reduce((s, e) => s + (e.montantEur || 0), 0);
  const prime = geste.reduce((s, g) => s + totalPrime(g.installed || {}, DEFAULT_PRIMES), 0);

  const stat = (k, v) => h("div", { class: "statrow" }, h("span", { class: "k" }, k), h("span", { class: "v" }, v));
  const kpi = (v, k) => h("div", { class: "kpi" }, h("div", { class: "v" }, v), h("div", { class: "k" }, k));

  const body = [
    h("div", { class: "card", style: "display:flex;align-items:center;gap:14px" },
      h("div", { class: "avatar", style: `width:52px;height:52px;font-size:20px;background:${avatarColor(u.name)}` }, initials(u.name)),
      h("div", {}, h("div", { style: "font-family:Tektur;font-weight:700;font-size:18px" }, u.name),
        h("div", { class: "sub mono", style: "color:var(--text-low)" }, u.email),
        h("span", { class: "badge role-" + u.role, style: "margin-top:6px;display:inline-block" }, u.role))),
  ];

  // dossier Drive
  if (u.driveUrl && u.driveUrl !== "#") {
    body.push(h("a", { class: "btn ghost", href: u.driveUrl, target: "_blank", style: "text-decoration:none" },
      icon("folder", 18), "Ouvrir le dossier Drive"));
  } else if (isTech) {
    body.push(h("div", { class: "banner amber" }, "Dossier Drive : créé côté serveur à l'activation du backend."));
  }

  if (isTech) {
    body.push(
      h("div", { class: "banner", style: "background:var(--obsidian-1);border:1px solid var(--hairline)" },
        `Cycle ${fr(start)} → ${fr(end)}`),
      h("div", { class: "kpi-grid" },
        kpi(String(temps.length), "Interventions"),
        kpi(hours + " h", "Heures"),
        kpi(eur(prime), "Primes"),
        kpi(eur(sumFrais), "Frais")),
      h("div", { class: "card" },
        h("h3", {}, "Dernières interventions"),
        temps.length ? temps.slice(-8).reverse().map((t) =>
          stat(`${t.typeMission} · ${t.nomClient || "—"} ${t.ville || ""}`, t.numeroIntervention || ""))
          : h("div", { class: "muted-empty" }, "Aucune intervention ce cycle")),
      h("div", { class: "card" },
        h("h3", {}, "Code tech"),
        stat("Code", u.codeTech || "—"))
    );
  }

  // actions admin
  let actions = null;
  const isInactive = u.status === "inactive";
  if (isInactive) {
    body.splice(1, 0, h("div", { class: "banner amber" }, "Compte inactif · accès coupé (« plus là »)."));
  }

  if (me.role === "admin") {
    actions = h("button", { class: "icon-btn", title: "Modifier", onclick: () => navigate("/admin/edit/" + u.id) }, icon("settings", 18));

    const setStatus = async (status, msg) => {
      try { overlay(true); await api("updateUser", { id: u.id, patch: { status } }, token()); overlay(false);
        toast(msg); navigate("/admin/user/" + u.id); }
      catch (e) { overlay(false); toast(e.message); }
    };

    if (isInactive) {
      body.push(h("button", { class: "btn", style: "margin-top:16px;background:var(--success)",
        onclick: () => setStatus("active", "Compte réactivé · accès rétabli") }, "Réactiver l'accès"));
    } else {
      body.push(h("button", { class: "btn", style: "margin-top:16px;background:var(--warning);color:#1a1a1a",
        onclick: () => {
          if (!confirm(`Désactiver ${u.name} ? Son accès est coupé immédiatement (il bascule dans « inactifs »). Ses données sont conservées.`)) return;
          setStatus("inactive", "Compte désactivé · accès coupé");
        } }, "Désactiver (couper l'accès)"));
    }

    body.push(
      h("button", { class: "btn danger", style: "margin-top:8px", onclick: async () => {
        if (!confirm(`SUPPRIMER DÉFINITIVEMENT ${u.name} ? Cette action efface le compte et ne peut pas être annulée. (Préférer « Désactiver ».)`)) return;
        try { overlay(true); await api("deleteUser", { id: u.id }, token()); overlay(false);
          toast("Compte supprimé définitivement"); navigate("/admin"); }
        catch (e) { overlay(false); toast(e.message); }
      } }, "Supprimer définitivement")
    );
  }

  overlay(false);
  return screen(u.name.toUpperCase(), isTech ? "var(--temps-start)" : "var(--resp-start)", body,
    { back: "/admin", actions });
}

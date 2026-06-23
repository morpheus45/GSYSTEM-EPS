// Aperçu « voir comme » — le super admin peut visualiser l'app comme un
// responsable (équipe + stats) ou comme un tech (son app), en lecture seule.
// Stocké localement ; n'affecte que l'affichage (les droits réels restent admin).
import { h } from "./ui.js";

const KEY = "gsystem_viewas";

export function getView() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
}
export function setView(v) {
  if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY);
}
export function clearView() { localStorage.removeItem(KEY); }

// Bannière d'aperçu (affichée en haut quand un aperçu est actif).
export function viewBanner(onExit) {
  const v = getView();
  if (!v) return null;
  const label = v.role === "tech" ? "Aperçu TECH" : "Aperçu RESPONSABLE";
  return h("div", { class: "view-banner" },
    h("span", {}, "👁 " + label + " : " + v.name + " · lecture seule"),
    h("button", { class: "btn sm", style: "width:auto;background:#fff;color:#111",
      onclick: () => { clearView(); (onExit || (() => location.reload()))(); } }, "Quitter"));
}

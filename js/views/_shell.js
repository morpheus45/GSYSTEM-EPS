import { h, icon } from "../ui.js";
import { navigate } from "../router.js";

// Écran secondaire : barre du haut (retour + titre) + barre d'accent couleur + corps.
export function screen(title, accent, bodyNodes, { back = "/home", actions = null } = {}) {
  return h("div", { class: "screen", style: `--accent-bar:${accent}` },
    h("div", { class: "topbar" },
      h("button", { class: "back", title: "Retour", onclick: () => navigate(back) }, icon("back", 22)),
      h("div", { class: "title", style: "flex:1" }, title),
      actions
    ),
    h("div", { class: "accent-bar" }),
    h("div", { class: "screen-body" }, ...[].concat(bodyNodes))
  );
}

export function field(lab, input, { req = false } = {}) {
  return h("label", { class: "field" },
    h("span", { class: "lab" }, lab, req ? h("span", { class: "req" }, " *") : null),
    input);
}

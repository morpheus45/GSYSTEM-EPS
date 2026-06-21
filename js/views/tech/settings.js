import { h, toast } from "../../ui.js";
import { screen, field } from "../_shell.js";
import { currentUser, logout } from "../../auth.js";
import { navigate } from "../../router.js";
import { CONFIG } from "../../config.js";

// Réglages perso du tech (champs propres au secteur). Persistés localement ;
// les destinataires fixes (GS/EPS) sont gérés côté admin/serveur (cf. HANDOFF §5).
const LS = "gsystem_profile";

export function settingsView() {
  const user = currentUser();
  const prof = load();

  const inp = (k, attrs = {}) => h("input", { value: prof[k] || "", ...attrs });
  const nom = inp("nom", { placeholder: user.name });
  const plaque = inp("plaque", { placeholder: "AA-123-AA" });
  const emailPerso = inp("emailPerso", { type: "email", placeholder: "perso@email.fr" });
  const respSecteur = inp("respSecteur", { type: "email", placeholder: "responsable@secteur.fr" });
  const codeTech = inp("codeTech", { placeholder: user.codeTech || "ISTGSxx" });

  const save = () => {
    Object.assign(prof, {
      nom: nom.value, plaque: plaque.value, emailPerso: emailPerso.value,
      respSecteur: respSecteur.value, codeTech: codeTech.value,
    });
    localStorage.setItem(LS, JSON.stringify(prof));
    toast("Réglages enregistrés");
  };

  return screen("RÉGLAGES", "var(--text-low)", [
    h("div", { class: "card" },
      h("h3", {}, "Identité"),
      h("div", { class: "statrow" }, h("span", { class: "k" }, "Compte"), h("span", { class: "v" }, user.email)),
      h("div", { class: "statrow" }, h("span", { class: "k" }, "Rôle"), h("span", { class: "v" }, user.role))),
    h("div", { class: "card accent" },
      h("h3", {}, "Mes informations"),
      field("Nom du tech", nom, { req: true }),
      field("Plaque (véhicule)", plaque),
      field("Email perso", emailPerso),
      field("Responsable secteur (email en copie EPS)", respSecteur, { req: true }),
      field("Code tech", codeTech, { req: true }),
      h("button", { class: "btn sm", style: "margin-top:6px", onclick: save }, "Enregistrer")),
    h("button", { class: "btn danger", onclick: () => { logout(); navigate("/login"); } }, "Se déconnecter"),
    h("p", { class: "text-low", style: "text-align:center;font-size:11px;margin-top:14px" },
      `G-Systems v${CONFIG.APP_VERSION}`),
  ]);
}

function load() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch { return {}; } }

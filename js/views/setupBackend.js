import { h, overlay, toast } from "../ui.js";
import { navigate } from "../router.js";
import { getBackendUrl, setBackendUrl, isDemo } from "../config.js";

// Écran « Configurer le serveur » : l'admin colle l'URL /exec du backend Apps
// Script directement dans l'app (stockée sur l'appareil), sans toucher au code.
export function setupBackendView() {
  overlay(false);

  const url = h("input", { type: "url", value: getBackendUrl(),
    placeholder: "https://script.google.com/macros/s/.../exec", autocomplete: "off" });
  const status = h("div", { class: "banner", style: "margin-top:10px;display:none" });

  function show(kind, msg) {
    status.style.display = "";
    status.className = "banner " + kind;
    status.textContent = msg;
  }

  const testBtn = h("button", { class: "btn ghost", type: "button" }, "Tester la connexion");
  testBtn.addEventListener("click", async () => {
    const u = url.value.trim();
    if (!u) return show("red", "Colle d'abord l'URL du backend.");
    if (!/\/exec\/?$/.test(u)) return show("amber", "L'URL doit se terminer par « /exec ».");
    try {
      overlay(true);
      const res = await fetch(u, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: "me", token: null, params: {} }),
      });
      const data = await res.json(); // backend renvoie {result:...} ou {error:...}
      overlay(false);
      if (data && (("result" in data) || ("error" in data))) {
        show("green", "✓ Connexion au backend réussie.");
      } else {
        show("amber", "Réponse inattendue — vérifie l'URL (déploiement « Application Web »).");
      }
    } catch (e) {
      overlay(false);
      show("red", "Échec : backend injoignable. Vérifie l'URL et que le déploiement est en « accès : Tout le monde ».");
    }
  });

  const saveBtn = h("button", { class: "btn", type: "button" }, "Enregistrer & connecter");
  saveBtn.addEventListener("click", () => {
    const u = url.value.trim();
    if (!u) return show("red", "URL vide.");
    setBackendUrl(u);
    toast("Backend connecté. Rechargement…");
    setTimeout(() => { location.hash = "#/login"; location.reload(); }, 600);
  });

  const demoBtn = h("button", { class: "btn ghost", type: "button" }, "Revenir au mode démo");
  demoBtn.addEventListener("click", () => {
    setBackendUrl("");
    toast("Mode démo rétabli. Rechargement…");
    setTimeout(() => { location.hash = "#/login"; location.reload(); }, 600);
  });

  return h("div", { class: "screen", style: "--accent-bar:var(--admin-start)" },
    h("div", { class: "topbar" },
      h("button", { class: "back", onclick: () => navigate("/login") }, "←"),
      h("div", { class: "title", style: "flex:1" }, "CONFIGURER LE SERVEUR")),
    h("div", { class: "accent-bar" }),
    h("div", { class: "screen-body" },
      h("div", { class: "banner " + (isDemo() ? "amber" : "green") },
        isDemo() ? "État actuel : MODE DÉMO (aucun backend connecté)."
                 : "État actuel : connecté au backend."),
      h("div", { class: "card accent" },
        h("h3", {}, "URL du backend (Apps Script)"),
        h("p", { class: "text-mid", style: "font-size:13px" },
          "Colle ici l'adresse obtenue après « Déployer → Application Web » dans "
          + "script.google.com. Elle se termine par /exec."),
        h("label", { class: "field" }, h("span", { class: "lab" }, "URL /exec"), url),
        testBtn,
        h("div", { style: "height:8px" }),
        saveBtn,
        status),
      h("div", { class: "card" },
        h("h3", {}, "Repasser en démo"),
        h("p", { class: "text-mid", style: "font-size:13px" },
          "Déconnecte le backend et réutilise des données factices (test)."),
        demoBtn),
      h("p", { class: "text-low", style: "font-size:11px;text-align:center;margin-top:10px" },
        "Astuce : ce réglage est propre à cet appareil. Pour que tous les "
        + "utilisateurs soient connectés automatiquement, l'URL peut aussi être "
        + "mise dans le code (js/config.js)."))
  );
}

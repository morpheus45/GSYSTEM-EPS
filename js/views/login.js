import { h, mount, overlay, toast } from "../ui.js";
import { login } from "../auth.js";
import { navigate, defaultRouteFor } from "../router.js";
import { isDemo } from "../config.js";
import { animatedLogo } from "./logo.js";

export function loginView() {
  overlay(false);

  const email = h("input", { type: "email", name: "email", placeholder: "email@gsystem.fr",
    autocomplete: "username", required: true, inputmode: "email" });
  const pass = h("input", { type: "password", name: "password", placeholder: "Mot de passe",
    autocomplete: "current-password", required: true });
  const btn = h("button", { class: "btn", type: "submit" }, "Se connecter");

  const form = h("form", {
    onsubmit: async (ev) => {
      ev.preventDefault();
      btn.disabled = true;
      try {
        overlay(true);
        const user = await login(email.value.trim(), pass.value);
        toast("Bienvenue " + user.name);
        navigate(defaultRouteFor(user));
      } catch (e) {
        overlay(false);
        toast(e.message || "Échec de connexion");
        pass.value = "";
      } finally {
        btn.disabled = false;
      }
    },
  },
    h("label", { class: "field" }, h("span", { class: "lab" }, "Identifiant"), email),
    h("label", { class: "field" }, h("span", { class: "lab" }, "Mot de passe"), pass),
    btn,
    h("p", { class: "tag", style: "text-align:center;margin-top:18px" },
      "Accès créés par votre administrateur"),
    h("a", { href: "#/privacy", class: "tag",
      style: "display:block;text-align:center;margin-top:10px;color:var(--text-low);text-decoration:underline" },
      "Confidentialité & RGPD"),
    h("a", { href: "#/setup-backend", class: "tag",
      style: "display:block;text-align:center;margin-top:8px;color:var(--text-low);text-decoration:underline" },
      "⚙ Configurer le serveur")
  );

  return h("div", { class: "screen" },
    h("div", { class: "login" },
      animatedLogo(),
      h("div", { class: "tag", style: "margin-top:6px" }, "Sécurité électronique"),
      isDemo() ? h("div", { class: "banner amber", style: "max-width:360px;text-align:center" },
        "Mode démo — backend non connecté. ⚙ « Configurer le serveur » ci-dessous.") : null,
      form
    )
  );
}

import { h, overlay, toast } from "../ui.js";
import { currentUser, logout, markPasswordChanged } from "../auth.js";
import { token } from "../auth.js";
import { api } from "../api.js";
import { navigate, defaultRouteFor } from "../router.js";
import { checkPassword, strengthScore, STRENGTH_LABEL, STRENGTH_COLOR, PW_MIN } from "../business/password.js";

export function changePasswordView() {
  overlay(false);
  const user = currentUser();
  const forced = user && user.mustChangePassword;

  const cur = h("input", { type: "password", placeholder: "Mot de passe actuel", autocomplete: "current-password" });
  const pw = h("input", { type: "password", placeholder: "Nouveau mot de passe", autocomplete: "new-password" });
  const pw2 = h("input", { type: "password", placeholder: "Confirmer le nouveau", autocomplete: "new-password" });

  const bar = h("div", { style: "height:6px;border-radius:4px;background:var(--obsidian-3);overflow:hidden;margin:6px 0 2px" },
    h("div", { class: "meter", style: "height:100%;width:0;transition:width .2s,background .2s" }));
  const hint = h("div", { class: "text-low", style: "font-size:12px;min-height:16px" });

  pw.addEventListener("input", () => {
    const s = strengthScore(pw.value);
    const m = bar.querySelector(".meter");
    m.style.width = (s / 4 * 100) + "%";
    m.style.background = STRENGTH_COLOR[s];
    const c = checkPassword(pw.value, { email: user.email });
    hint.textContent = c.ok ? "Robustesse : " + STRENGTH_LABEL[s]
      : "Il manque : " + c.errors.join(", ");
    hint.style.color = c.ok ? "var(--success)" : "var(--text-low)";
  });

  const btn = h("button", { class: "btn", type: "submit" }, "Définir mon mot de passe");

  const form = h("form", { onsubmit: async (ev) => {
    ev.preventDefault();
    const c = checkPassword(pw.value, { email: user.email });
    if (!c.ok) return toast("Mot de passe trop faible : " + c.errors.join(", "));
    if (pw.value !== pw2.value) return toast("Les deux mots de passe ne correspondent pas.");
    btn.disabled = true;
    try {
      overlay(true);
      await api("changePassword", { currentPassword: cur.value, newPassword: pw.value }, token());
      markPasswordChanged();
      overlay(false);
      toast("Mot de passe mis à jour.");
      navigate(defaultRouteFor(currentUser()));
    } catch (e) {
      overlay(false); toast(e.message); btn.disabled = false;
    }
  } },
    h("label", { class: "field" }, h("span", { class: "lab" }, "Mot de passe actuel"), cur),
    h("label", { class: "field" }, h("span", { class: "lab" }, "Nouveau mot de passe"), pw),
    bar, hint,
    h("label", { class: "field", style: "margin-top:8px" }, h("span", { class: "lab" }, "Confirmer"), pw2),
    btn,
    h("button", { class: "btn ghost", type: "button", style: "margin-top:8px",
      onclick: () => { logout(); navigate("/login"); } }, "Se déconnecter")
  );

  return h("div", { class: "screen" },
    h("div", { class: "login", style: "justify-content:flex-start;padding-top:40px" },
      h("img", { class: "logo", src: "icons/icon-512.png", alt: "G-Systems" }),
      h("h1", { style: "font-size:24px" }, forced ? "PREMIÈRE CONNEXION" : "MOT DE PASSE"),
      h("div", { class: "tag" }, "Sécurisez votre compte"),
      forced ? h("div", { class: "banner amber", style: "max-width:360px" },
        `Pour votre sécurité, choisissez un nouveau mot de passe personnel (au moins ${PW_MIN} caractères). Personne d'autre ne le connaît.`) : null,
      form
    )
  );
}

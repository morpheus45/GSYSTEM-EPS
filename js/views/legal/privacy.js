import { h, overlay } from "../../ui.js";
import { navigate } from "../../router.js";
import { currentUser } from "../../auth.js";
import { CONFIG } from "../../config.js";

// Politique de confidentialité / mentions RGPD. Accessible avant connexion
// (depuis le login) et depuis les réglages.
export function privacyView() {
  overlay(false);
  const L = CONFIG.LEGAL;
  const user = currentUser();
  const back = user ? (user.role === "tech" ? "/settings" : "/admin") : "/login";

  const p = (t) => h("p", { class: "text-mid", style: "font-size:13px" }, t);
  const li = (t) => h("li", {}, t);

  return h("div", { class: "screen", style: "--accent-bar:var(--text-low)" },
    h("div", { class: "topbar" },
      h("button", { class: "back", onclick: () => navigate(back) }, "←"),
      h("div", { class: "title", style: "flex:1" }, "CONFIDENTIALITÉ")),
    h("div", { class: "accent-bar" }),
    h("div", { class: "screen-body" },
      h("div", { class: "card" },
        h("h3", {}, "Protection de vos données (RGPD)"),
        p("Cette application traite des données professionnelles dans le cadre de l'activité de "
          + L.CONTROLLER + ". Voici l'essentiel, en clair.")),
      h("div", { class: "card" },
        h("h3", {}, "Responsable de traitement"),
        p(L.CONTROLLER + " — contact : " + L.CONTACT_EMAIL)),
      h("div", { class: "card" },
        h("h3", {}, "Données collectées"),
        h("ul", { class: "text-mid", style: "font-size:13px" },
          li("Identité : nom, email, code technicien, plaque (facultatif)."),
          li("Activité : interventions, heures, frais (montants, photos de tickets), relevés compteur."),
          li("Connexion : mot de passe (stocké haché, jamais en clair), jeton de session."))),
      h("div", { class: "card" },
        h("h3", {}, "Finalités & base légale"),
        p("Suivi d'activité, primes, frais et reporting interne. Base légale : exécution du contrat "
          + "de travail et intérêt légitime de l'employeur. Les destinataires sont l'entreprise et "
          + "le partenaire EPS pour les envois concernés.")),
      h("div", { class: "card" },
        h("h3", {}, "Hébergement"),
        p(L.HOSTING)),
      h("div", { class: "card" },
        h("h3", {}, "Durée de conservation"),
        p(L.RETENTION + ".")),
      h("div", { class: "card" },
        h("h3", {}, "Vos droits"),
        p("Vous disposez d'un droit d'accès, de rectification et d'effacement de vos données, "
          + "ainsi que du droit de limitation et d'opposition. Pour les exercer, contactez "
          + L.CONTACT_EMAIL + ". L'effacement supprime votre compte, vos données et votre dossier Drive.")),
      h("div", { class: "card" },
        h("h3", {}, "Sécurité"),
        h("ul", { class: "text-mid", style: "font-size:13px" },
          li("Connexion chiffrée (HTTPS)."),
          li("Mots de passe hachés (SHA-256 + sel unique par compte), jamais stockés en clair."),
          li("Changement de mot de passe imposé à la première connexion."),
          li("Accès cloisonné par rôle ; sessions expirant après 30 jours ; désactivation immédiate possible."))),
      h("p", { class: "text-low", style: "text-align:center;font-size:11px;margin:14px 0" },
        "G-Systems v" + CONFIG.APP_VERSION)
    )
  );
}

// Router — hash-based, avec gardes par rôle.
import { currentUser } from "./auth.js";
import { mount, overlay, toast } from "./ui.js";

// vues
import { loginView } from "./views/login.js";
import { changePasswordView } from "./views/changePassword.js";
import { privacyView } from "./views/legal/privacy.js";
import { setupBackendView } from "./views/setupBackend.js";
import { homeView } from "./views/tech/home.js";
import { clotureView } from "./views/tech/cloture.js";
import { attenteView } from "./views/tech/attente.js";
import { courrierView } from "./views/tech/courrier.js";
import { recapView } from "./views/tech/recap.js";
import { fraisView } from "./views/tech/frais.js";
import { envoiView } from "./views/tech/envoi.js";
import { settingsView } from "./views/tech/settings.js";
import { adminTreeView } from "./views/admin/tree.js";
import { userFormView } from "./views/admin/userForm.js";
import { userDetailView } from "./views/admin/userDetail.js";
import { adminDashboardView } from "./views/admin/dashboard.js";

// table : pattern (regex sur le path) → { roles, view }
const ROUTES = [
  { re: /^\/login$/, roles: "*", view: () => loginView() },
  { re: /^\/privacy$/, roles: "*", view: () => privacyView() },
  { re: /^\/setup-backend$/, roles: "*", view: () => setupBackendView() },
  { re: /^\/change-password$/, roles: ["tech", "responsable", "admin", "direction"], view: () => changePasswordView() },

  // TECH
  { re: /^\/home$/, roles: ["tech", "admin", "direction", "responsable"], view: () => homeView() },
  { re: /^\/cloture$/, roles: ["tech", "admin", "direction", "responsable"], view: () => clotureView() },
  { re: /^\/attente$/, roles: ["tech", "admin", "direction", "responsable"], view: () => attenteView() },
  { re: /^\/courrier$/, roles: ["tech", "admin", "direction", "responsable"], view: () => courrierView() },
  { re: /^\/recap$/, roles: ["tech", "admin", "direction", "responsable"], view: () => recapView() },
  { re: /^\/frais$/, roles: ["tech", "admin", "direction", "responsable"], view: () => fraisView() },
  { re: /^\/envoi$/, roles: ["tech", "admin", "direction", "responsable"], view: () => envoiView() },
  { re: /^\/settings$/, roles: ["tech", "admin", "direction", "responsable"], view: () => settingsView() },

  // ADMIN / RESPONSABLE (arbre + détail)
  { re: /^\/admin$/, roles: ["admin", "direction", "responsable"], view: () => adminTreeView() },
  { re: /^\/admin\/dashboard$/, roles: ["admin", "direction", "responsable"], view: () => adminDashboardView() },
  { re: /^\/admin\/new$/, roles: ["admin", "direction"], view: () => userFormView(null) },
  { re: /^\/admin\/user\/([^/]+)$/, roles: ["admin", "direction", "responsable"], view: (m) => userDetailView(m[1]) },
  { re: /^\/admin\/edit\/([^/]+)$/, roles: ["admin", "direction"], view: (m) => userFormView(m[1]) },
];

export function navigate(path) {
  if (location.hash !== "#" + path) location.hash = path;
  else render();
}

export function defaultRouteFor(user) {
  if (!user) return "/login";
  return user.role === "tech" ? "/home" : "/admin";
}

export async function render() {
  const user = currentUser();
  let path = location.hash.replace(/^#/, "") || "/login";

  // pas connecté → seuls les écrans publics sont accessibles
  const PUBLIC = ["/login", "/privacy", "/setup-backend"];
  if (!user && PUBLIC.indexOf(path) < 0) return navigate("/login");
  // connecté mais sur /login → route par défaut du rôle
  if (user && path === "/login") return navigate(defaultRouteFor(user));

  // 1re connexion : changement de mot de passe obligatoire (RGPD/sécurité)
  if (user && user.mustChangePassword && path !== "/change-password" && path !== "/privacy")
    return navigate("/change-password");

  const match = ROUTES.map((r) => ({ r, m: path.match(r.re) })).find((x) => x.m);
  if (!match) return navigate(defaultRouteFor(user));

  const { r, m } = match;
  if (r.roles !== "*" && (!user || !r.roles.includes(user.role))) {
    toast("Accès non autorisé.");
    return navigate(defaultRouteFor(user));
  }

  try {
    overlay(true);
    const node = await r.view(m);
    mount(node);
  } catch (e) {
    console.error(e);
    toast(e.message || "Erreur");
    overlay(false);
  }
}

window.addEventListener("hashchange", render);

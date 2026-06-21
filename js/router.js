// Router — hash-based, avec gardes par rôle.
import { currentUser } from "./auth.js";
import { mount, overlay, toast } from "./ui.js";

// vues
import { loginView } from "./views/login.js";
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

  // TECH
  { re: /^\/home$/, roles: ["tech"], view: () => homeView() },
  { re: /^\/cloture$/, roles: ["tech"], view: () => clotureView() },
  { re: /^\/attente$/, roles: ["tech"], view: () => attenteView() },
  { re: /^\/courrier$/, roles: ["tech"], view: () => courrierView() },
  { re: /^\/recap$/, roles: ["tech"], view: () => recapView() },
  { re: /^\/frais$/, roles: ["tech"], view: () => fraisView() },
  { re: /^\/envoi$/, roles: ["tech"], view: () => envoiView() },
  { re: /^\/settings$/, roles: ["tech"], view: () => settingsView() },

  // ADMIN / RESPONSABLE (arbre + détail)
  { re: /^\/admin$/, roles: ["admin", "responsable"], view: () => adminTreeView() },
  { re: /^\/admin\/dashboard$/, roles: ["admin", "responsable"], view: () => adminDashboardView() },
  { re: /^\/admin\/new$/, roles: ["admin"], view: () => userFormView(null) },
  { re: /^\/admin\/user\/([^/]+)$/, roles: ["admin", "responsable"], view: (m) => userDetailView(m[1]) },
  { re: /^\/admin\/edit\/([^/]+)$/, roles: ["admin"], view: (m) => userFormView(m[1]) },
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

  // pas connecté → login forcé
  if (!user && path !== "/login") return navigate("/login");
  // connecté mais sur /login → route par défaut du rôle
  if (user && path === "/login") return navigate(defaultRouteFor(user));

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

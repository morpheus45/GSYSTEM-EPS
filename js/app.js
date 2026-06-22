// Bootstrap G-Systems.
import { isDemo } from "./config.js";
import { restore } from "./auth.js";
import { render, navigate, defaultRouteFor } from "./router.js";
import { flushQueue } from "./store.js";
import { toast } from "./ui.js";

// Service worker (PWA installable + hors-ligne)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("SW:", e));
  });
}

(async function start() {
  const user = await restore();
  if (user) flushQueue();

  if (isDemo()) {
    setTimeout(() => toast("Mode démo — comptes : admin@gsystem.fr / resp@gsystem.fr / tech@gsystem.fr (mot de passe = avant le @)", 6000), 600);
  }

  if (!location.hash) navigate(defaultRouteFor(user));
  else render();
})();

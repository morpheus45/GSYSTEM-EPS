/* G-Systems — Service Worker (offline shell + cache des assets)
   Stratégie :
   - app shell (HTML/CSS/JS/fonts/icons) : cache-first, mis à jour en arrière-plan
   - appels backend (Apps Script) : toujours réseau (jamais cachés)
*/
const VERSION = "gsystem-v1.0.8";
const SHELL = [
  "./",
  "./index.html",
  "./css/theme.css",
  "./css/app.css",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./assets/fonts/tektur_regular.ttf",
  "./assets/fonts/tektur_medium.ttf",
  "./assets/fonts/geist_mono_regular.ttf",
  "./assets/fonts/geist_mono_bold.ttf"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // Ne jamais cacher les appels au backend (script.google.com) ni le POST.
  if (e.request.method !== "GET" || url.hostname.includes("script.google")) {
    return; // laisse passer au réseau
  }
  // Modules JS/vues : network-first (toujours la dernière version, repli cache hors-ligne)
  if (url.pathname.endsWith(".js")) {
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Reste de l'app shell : cache-first
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match("./index.html")))
  );
});

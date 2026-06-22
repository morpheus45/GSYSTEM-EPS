// =============================================================
// G-Systems — Configuration
// =============================================================

export const CONFIG = {
  // URL du backend Google Apps Script (déploiement « Application Web »).
  // Tant que c'est vide, l'app tourne en MODE DÉMO (données locales factices),
  // ce qui permet de tout voir/tester sans avoir déployé le backend.
  // → Après déploiement, colle l'URL « https://script.google.com/macros/s/XXXX/exec » ici.
  BACKEND_URL: "https://script.google.com/macros/s/AKfycbxJDvoGwgrtlZH5AVrBlHLJy8sYGW7laIKU_AH880C1BRi79_JthDYp2nHgplCP_w9t/exec",

  // Identité affichée (barre de statut / footer). Réglable plus tard côté admin.
  ORG: "G-S · FR / 054",
  SERIAL: "SER. 054",

  APP_VERSION: "1.0.0",

  // --- Informations légales / RGPD (À VALIDER par le responsable de traitement) ---
  LEGAL: {
    CONTROLLER: "G-Systems FR",            // responsable de traitement
    CONTACT_EMAIL: "cedric.lago@gmail.com", // contact pour exercer ses droits (accès/effacement)
    RETENTION: "5 ans (obligations comptables et sociales), puis suppression",
    HOSTING: "Google (Drive, Gmail, Apps Script) — données dans l'UE selon la configuration du compte",
  },

  // Cycle de paie par défaut : du 21 au 20 (cf. HANDOFF.md §5).
  DEFAULT_CYCLE_START_DAY: 21,
};

// URL backend « effective » : priorité à celle configurée dans l'app (écran
// « Configurer le serveur », stockée sur l'appareil), sinon celle du code.
// → permet de brancher le backend sans toucher au code (pratique pour tester).
const LS_BACKEND = "gsystem_backend_url";

export function getBackendUrl() {
  try { return (localStorage.getItem(LS_BACKEND) || CONFIG.BACKEND_URL || "").trim(); }
  catch { return CONFIG.BACKEND_URL || ""; }
}
export function setBackendUrl(url) {
  if (url && url.trim()) localStorage.setItem(LS_BACKEND, url.trim());
  else localStorage.removeItem(LS_BACKEND);
}
// MODE DÉMO actif tant qu'aucun backend n'est configuré (ni code, ni appareil).
export function isDemo() { return !getBackendUrl(); }

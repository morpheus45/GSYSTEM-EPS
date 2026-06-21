// Frais & TVA — port de util/FraisTva.kt.

const DEFAULT_RATE = 0.20;
const RATES = { PARKING: 0.20, DIVERS: 0.20, AUTRE: 0.20 };

export const FRAIS_CATEGORIES = ["CARBURANT", "PEAGE", "REPAS", "PARKING", "AUTRE"];

export function rateFor(categorie) {
  return RATES[(categorie || "").trim().toUpperCase()] ?? DEFAULT_RATE;
}
export function htFromTtc(ttc, categorie) {
  return ttc / (1 + rateFor(categorie));
}
export function tvaFromTtc(ttc, categorie) {
  return ttc - htFromTtc(ttc, categorie);
}
export function eur(n) {
  return (Math.round(n * 100) / 100).toFixed(2).replace(".", ",") + " €";
}

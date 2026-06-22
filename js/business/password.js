// Robustesse des mots de passe (vérif côté client ; le backend revérifie).
// Politique alignée sur les recommandations CNIL/ANSSI pour un secret « court »
// protégé par limitation des tentatives : ≥ 12 caractères, plusieurs classes.

export const PW_MIN = 12;

export function checkPassword(pw, opts = {}) {
  const errors = [];
  pw = pw || "";
  if (pw.length < PW_MIN) errors.push(`au moins ${PW_MIN} caractères`);
  if (!/[a-z]/.test(pw)) errors.push("une minuscule");
  if (!/[A-Z]/.test(pw)) errors.push("une majuscule");
  if (!/[0-9]/.test(pw)) errors.push("un chiffre");
  if (!/[^A-Za-z0-9]/.test(pw)) errors.push("un caractère spécial");
  if (opts.email && pw.toLowerCase().includes(String(opts.email).split("@")[0].toLowerCase()))
    errors.push("ne pas contenir votre identifiant");
  return { ok: errors.length === 0, errors };
}

// score indicatif 0..4 pour la jauge
export function strengthScore(pw) {
  pw = pw || "";
  let s = 0;
  if (pw.length >= PW_MIN) s++;
  if (pw.length >= 16) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}
export const STRENGTH_LABEL = ["Très faible", "Faible", "Moyen", "Bon", "Fort"];
export const STRENGTH_COLOR = ["#FF3D5A", "#FF3D5A", "#FFB347", "#4ADE80", "#22C55E"];

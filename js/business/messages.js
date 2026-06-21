// Messages — port de viber/ViberSender.kt.
// Format des messages du groupe « LAGO GOMEZ GSYSTEMS ». Le texte est désormais
// transmis au backend qui l'envoie / le journalise (au lieu d'ouvrir Viber).

export const MISSION_TYPES = [
  "INST", "REPA", "RESI", "PILE", "SAV", "DECL", "AJOU",
  "VACANCES", "FORMATION", "FERIE", "AUTRE",
];

export const OBSERVATION_LABELS = [
  ["", "Aucune (= ok)"],
  ["NR_CLIENT", "NR client"],
  ["NR_TECHNIQUE", "NR technique"],
  ["NR_CLIENT_ABS", "NR client absent"],
  ["ANNULE", "Annulé"],
];

const SUFFIX = {
  NR_CLIENT: "NR CLIENT",
  NR_TECHNIQUE: "NR TECHNIQUE",
  NR_CLIENT_ABS: "NR CLIENT ABS",
  ANNULE: "ANNULE",
};

/** Ex. « 34 inst richard gignac 43001714 ok ». */
export function buildViberMessage(e) {
  const tokens = [
    (e.departement || "").trim(),
    (e.typeMission || "").trim().toLowerCase(),
    (e.nomClient || "").trim().toLowerCase(),
    (e.ville || "").trim().toLowerCase(),
    (e.numeroIntervention || "").trim(),
  ].filter(Boolean);
  const suffix = SUFFIX[e.observationType] || "ok";
  return `${tokens.join(" ")} ${suffix}`;
}

export const ATTENTE_RAPPEL_TECH =
  "Rappel : appels toutes les 15 minutes jusqu'au départ validé par la " +
  "techline 03.88.39.88.94 (CHOIX 2 PUIS 3).";

export function attenteClientMessage(date = new Date()) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `PROCÉDURE ATTENTE CLIENT · Début : ${hh}h${mm}`;
}

export const COURRIER_MESSAGE = "courrier ok";

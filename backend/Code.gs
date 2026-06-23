/****************************************************************************
 * G-SYSTEMS — Backend Google Apps Script
 * --------------------------------------------------------------------------
 * Rôle : « serveur » 100 % Google de la PWA. Tourne sous TON compte Google,
 * donc accès à TON Drive (créer les dossiers techs) et à Gmail (envois auto).
 *
 * Stockage : un Google Sheet sert de base de données (onglets Users / Temps /
 * Frais / GesteCo / Compteur / Sessions / Log).
 *
 * DÉPLOIEMENT (voir SETUP.md pour le détail illustré) :
 *   1. script.google.com → Nouveau projet → coller ce fichier.
 *   2. Renseigner CONFIG ci-dessous (DRIVE_ROOT_FOLDER_ID + admin de départ).
 *   3. Exécuter la fonction `setup` une fois (autoriser Drive + Gmail + Sheets).
 *   4. Déployer → « Application Web » → exécuter en tant que MOI, accès « Tout
 *      le monde » → copier l'URL .../exec → la coller dans js/config.js (BACKEND_URL).
 ****************************************************************************/

const CONFIG = {
  // Dossier Drive racine où seront créés les sous-dossiers des techs.
  // (Crée un dossier "G-SYSTEMS" dans ton Drive, ouvre-le, copie l'id dans l'URL.)
  DRIVE_ROOT_FOLDER_ID: "METTRE_ICI_L_ID_DU_DOSSIER_DRIVE",

  // Admin de départ (créé par setup()). Tu pourras en créer d'autres ensuite.
  // ⚠ Repo PUBLIC : ne PAS committer le mot de passe ici. Remplace
  //   "A_COLLER_DANS_APPS_SCRIPT" par ton mot de passe UNIQUEMENT dans l'éditeur
  //   Apps Script (privé), avant de lancer setup(). Il sera à changer à la 1re
  //   connexion pour ≥ 12 caractères.
  BOOTSTRAP_ADMIN: { name: "Cedric Lago Gomez", email: "cedric.lago@gmail.com", password: "REMPLACER_MDP_ADMIN" },

  // Destinataires fixes (cf. HANDOFF.md §5). Les mails partent automatiquement ici.
  MAIL: {
    GS_TO:   "fdt@fggestion.fr",
    EPS_TO:  "epsinfotechline@eps.e-i.com",
    EPS_CC1: "johanna@fggestion.fr",
  },

  // ⚠ Repo PUBLIC : ne PAS committer le SALT. Colle une valeur secrète dans
  //   l'éditeur Apps Script (privé) avant le 1er setup(), puis ne plus la changer.
  SALT: "REMPLACER_SALT_SECRET",
};

const DB_NAME = "GSYSTEM-DB";

/* ====================== POINT D'ENTRÉE HTTP ====================== */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const result = dispatch(body.action, body.params || {}, body.token || null);
    return json({ result: result });
  } catch (err) {
    return json({ error: String(err && err.message ? err.message : err) });
  }
}
function doGet() { return json({ result: { ok: true, service: "gsystem", version: "1.0.0" } }); }

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ====================== ROUTAGE DES ACTIONS ====================== */
function dispatch(action, params, token) {
  const me = token ? sessionUser(token) : null;

  switch (action) {
    case "login":      return login(params.email, params.password);
    case "me":         return requireUser(me);
    case "tree":       return tree(requireRole(me, ["admin", "direction", "responsable", "comptable"]));
    case "createUser": return createUser(requireRole(me, ["admin", "direction"]), params);
    case "updateUser": return updateUser(requireRole(me, ["admin", "direction"]), params);
    case "deleteUser": return deleteUser(requireRole(me, ["admin"]), params); // suppression = Super admin uniquement
    case "getUserData":return getUserData(requireUser(me), params.userId);
    case "updateProfile": return updateProfile(requireUser(me), params); // tech : ses infos (plaque, code, email perso)
    case "pushEntries":return pushEntries(requireUser(me), params.kind, params.entries);
    case "deleteEntry":return deleteEntry(requireUser(me), params.kind, params.id);
    case "changePassword": return changePassword(requireUser(me), params);
    case "uploadFile": return uploadFile(requireUser(me), params);
    case "listFiles":  return listFiles(requireUser(me), params.userId);
    case "send":       return send(requireUser(me), params);
    default: throw new Error("Action inconnue: " + action);
  }
}

/* ====================== AUTH / SESSIONS ====================== */
const SESSION_TTL_DAYS = 30; // une session expire après 30 jours

// Hachage SHA-256 avec sel PAR UTILISATEUR + poivre global (CONFIG.SALT).
// Le sel par compte évite qu'un même mot de passe donne le même hash.
function hashWithSalt(pw, salt) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pw + "|" + salt + "|" + CONFIG.SALT);
  return raw.map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); }).join("");
}
// Ancien schéma (sel global) — pour les comptes créés avant le sel par utilisateur.
function legacyHash(pw) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pw + CONFIG.SALT);
  return raw.map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); }).join("");
}
function newSalt() { return Utilities.getUuid().replace(/-/g, ""); }

// Vérifie un mot de passe en gérant les 2 schémas (rétrocompatible) :
// - compte récent (avec sel) → hashWithSalt ; - compte ancien (sans sel) → legacyHash.
function verifyPassword(user, pw) {
  if (user.salt) return user.passwordHash === hashWithSalt(pw, user.salt);
  return user.passwordHash === legacyHash(pw);
}

function login(email, password) {
  const u = findUserByEmail(email);
  if (!u || !verifyPassword(u, password)) throw new Error("Email ou mot de passe incorrect.");
  if (u.status === "inactive") throw new Error("Accès désactivé. Contactez votre administrateur.");
  const token = Utilities.getUuid();
  appendRow("Sessions", [token, u.id, new Date().toISOString()]);
  return { token: token, user: publicUser(u) };
}

function sessionUser(token) {
  const rows = sheet("Sessions").getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === token) {
      // expiration de session
      const age = (Date.now() - new Date(rows[i][2]).getTime()) / 86400000;
      if (age > SESSION_TTL_DAYS) return null;
      const u = findUserById(rows[i][1]);
      // accès coupé immédiatement si le compte a été désactivé entre-temps
      if (u && u.status === "inactive") return null;
      return u;
    }
  }
  return null;
}

// Changement de mot de passe (obligatoire à la 1re connexion). Vérifie l'ancien,
// applique la politique de robustesse, régénère le sel, lève le flag.
function changePassword(me, p) {
  const u = findUserById(me.id);
  if (!u || !verifyPassword(u, p.currentPassword || ""))
    throw new Error("Mot de passe actuel incorrect.");
  const errs = passwordPolicyErrors(p.newPassword, u.email);
  if (errs.length) throw new Error("Mot de passe trop faible : il faut " + errs.join(", ") + ".");
  const salt = newSalt();
  setUserFields(u.id, { salt: salt, passwordHash: hashWithSalt(p.newPassword, salt), mustChangePassword: "" });
  log("changePassword", me.email, "");
  return { ok: true };
}

// Politique serveur (miroir de js/business/password.js).
function passwordPolicyErrors(pw, email) {
  pw = pw || ""; const e = [];
  if (pw.length < 12) e.push("au moins 12 caractères");
  if (!/[a-z]/.test(pw)) e.push("une minuscule");
  if (!/[A-Z]/.test(pw)) e.push("une majuscule");
  if (!/[0-9]/.test(pw)) e.push("un chiffre");
  if (!/[^A-Za-z0-9]/.test(pw)) e.push("un caractère spécial");
  if (email && pw.toLowerCase().indexOf(String(email).split("@")[0].toLowerCase()) >= 0)
    e.push("ne pas contenir l'identifiant");
  return e;
}
function requireUser(me) { if (!me) throw new Error("Session expirée."); return publicUser(me); }
function requireRole(me, roles) {
  if (!me || roles.indexOf(me.role) < 0) throw new Error("Accès non autorisé.");
  return me;
}

/* ====================== UTILISATEURS / ARBRE ====================== */
function tree(me) {
  let users = readAll("Users").map(publicUser);
  if (me.role === "responsable") {
    users = users.filter(function (u) { return u.id === me.id || u.responsableId === me.id; });
  }
  // Le super admin est invisible pour tous les autres rôles.
  if (me.role !== "admin") {
    users = users.filter(function (u) { return u.role !== "admin"; });
  }
  return { users: users };
}

function createUser(me, p) {
  if (findUserByEmail(p.email)) throw new Error("Cet email existe déjà.");
  const id = "u_" + Utilities.getUuid().slice(0, 8);
  // Dossier Drive pour CHAQUE compte créé (tech, responsable, admin).
  const folder = DriveApp.getFolderById(CONFIG.DRIVE_ROOT_FOLDER_ID).createFolder(p.name);
  const driveId = folder.getId();
  const driveUrl = folder.getUrl();
  const errs = passwordPolicyErrors(p.password, p.email);
  if (errs.length) throw new Error("Mot de passe initial trop faible : il faut " + errs.join(", ") + ".");
  const salt = newSalt();
  appendRow("Users", [
    id, p.name, p.email, hashWithSalt(p.password, salt), p.role,
    p.responsableId || "", p.codeTech || "", driveId, driveUrl, new Date().toISOString(),
    "active", salt, "true", p.plaque || "",
  ]);
  log("createUser", me.email, p.email + " (" + p.role + ")");
  return publicUser(findUserById(id));
}

function updateUser(me, p) {
  const u = findUserById(p.id);
  if (!u) throw new Error("Utilisateur introuvable.");
  const patch = p.patch || {};
  const fields = {};
  if (patch.name != null) fields.name = patch.name;
  if (patch.email != null) fields.email = patch.email;
  if (patch.role != null) fields.role = patch.role;
  if (patch.responsableId !== undefined) fields.responsableId = patch.responsableId || "";
  if (patch.codeTech != null) fields.codeTech = patch.codeTech;
  if (patch.status != null) fields.status = patch.status;
  if (patch.password) {
    const errs = passwordPolicyErrors(patch.password, patch.email || u.email);
    if (errs.length) throw new Error("Mot de passe trop faible : il faut " + errs.join(", ") + ".");
    const salt = newSalt();
    fields.salt = salt;
    fields.passwordHash = hashWithSalt(patch.password, salt);
    fields.mustChangePassword = "true"; // réinitialisation admin → l'utilisateur devra le changer
  }
  setUserFields(p.id, fields);
  return publicUser(findUserById(p.id));
}

// Mise à jour par l'utilisateur de SES propres infos (tech/responsable) :
// plaque (nom photo compteur), code tech, email perso. Pas de changement de rôle.
function updateProfile(me, p) {
  const fields = {};
  if (p.plaque != null) fields.plaque = p.plaque;
  if (p.codeTech != null) fields.codeTech = p.codeTech;
  setUserFields(me.id, fields);
  return publicUser(findUserById(me.id));
}

// Effacement RGPD (droit à l'effacement) : supprime le compte, ses données dans
// toutes les feuilles, ses sessions, et MET À LA CORBEILLE son dossier Drive.
function deleteUser(me, p) {
  const u = findUserById(p.id);
  if (!u) return { ok: true };

  // 1. dossier Drive du tech
  if (u.driveFolderId) { try { DriveApp.getFolderById(u.driveFolderId).setTrashed(true); } catch (e) {} }

  // 2. lignes de données + sessions + fichiers + utilisateur
  ["Temps", "Frais", "GesteCo", "Compteur", "Files"].forEach(function (name) {
    deleteRowsWhere(name, 0, p.id); // colonne 0 = userId
  });
  deleteRowsWhere("Sessions", 1, p.id); // colonne 1 = userId
  deleteRowsWhere("Users", 0, p.id);

  log("deleteUser(RGPD)", me.email, p.id);
  return { ok: true };
}
function deleteRowsWhere(name, col, value) {
  const sh = sheet(name);
  const rows = sh.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][col] === value) sh.deleteRow(i + 1);
  }
}

/* ====================== DONNÉES TECH (au fil de l'eau) ====================== */
function dataSheetName(kind) {
  const map = { temps: "Temps", frais: "Frais", gesteCo: "GesteCo", compteur: "Compteur" };
  const n = map[kind];
  if (!n) throw new Error("Type de données inconnu: " + kind);
  return n;
}

function getUserData(me, userId) {
  const target = userId || me.id;
  // garde-fous : tech → soi ; responsable → équipe ; admin → tout
  if (me.role === "tech" && target !== me.id) throw new Error("Accès refusé.");
  // super admin invisible : un non-admin ne peut pas lire les données d'un admin
  if (me.role !== "admin" && target !== me.id) {
    const ta = findUserById(target);
    if (ta && ta.role === "admin") throw new Error("Accès refusé.");
  }
  if (me.role === "responsable") {
    const t = findUserById(target);
    if (!t || (t.id !== me.id && t.responsableId !== me.id)) throw new Error("Accès refusé.");
  }
  const out = {};
  ["temps", "frais", "gesteCo", "compteur"].forEach(function (kind) {
    out[kind] = readData(dataSheetName(kind), target);
  });
  return out;
}

function pushEntries(me, kind, entries) {
  const sh = sheet(dataSheetName(kind));
  const rows = sh.getDataRange().getValues();
  (entries || []).forEach(function (entry) {
    const idx = findRowIndex(rows, me.id, entry.id);
    const row = [me.id, entry.id, entry.date || "", JSON.stringify(entry), new Date().toISOString()];
    if (idx >= 0) sh.getRange(idx + 1, 1, 1, row.length).setValues([row]);
    else sh.appendRow(row);
  });
  return { ok: true };
}

function deleteEntry(me, kind, id) {
  const sh = sheet(dataSheetName(kind));
  const rows = sh.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === me.id && rows[i][1] === id) sh.deleteRow(i + 1);
  }
  return { ok: true };
}

/* ====================== FICHIERS (Excel annuel / pièces) ====================== */
// Garantit un dossier Drive pour l'utilisateur (le crée si absent). Permet à un
// admin/responsable qui utilise AUSSI l'app tech d'avoir son propre dossier.
function ensureUserFolder(userId) {
  const u = findUserById(userId);
  if (u && u.driveFolderId) {
    try { DriveApp.getFolderById(u.driveFolderId); return u.driveFolderId; } catch (e) {}
  }
  const folder = DriveApp.getFolderById(CONFIG.DRIVE_ROOT_FOLDER_ID).createFolder(u.name);
  setUserFields(userId, { driveFolderId: folder.getId(), driveUrl: folder.getUrl() });
  return folder.getId();
}

// Le tech dépose son .xlsm 1×/an : on le stocke dans SON dossier Drive et on
// le référence dans l'onglet Files. Remplace l'ancien modèle de même `kind`.
function uploadFile(me, p) {
  const folder = DriveApp.getFolderById(ensureUserFolder(me.id));
  const bytes = Utilities.base64Decode(p.base64);
  const mime = p.mimeType || "application/vnd.ms-excel.sheet.macroEnabled.12";
  const blob = Utilities.newBlob(bytes, mime, p.filename || "modele.xlsm");

  // supprime l'ancien fichier du même type
  const sh = sheet("Files");
  const rows = sh.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === me.id && rows[i][1] === p.kind) {
      try { DriveApp.getFileById(rows[i][2]).setTrashed(true); } catch (e) {}
      sh.deleteRow(i + 1);
    }
  }
  const file = folder.createFile(blob);
  appendRow("Files", [me.id, p.kind, file.getId(), file.getName(), file.getUrl(), new Date().toISOString()]);
  log("uploadFile/" + p.kind, me.email, file.getName());
  return { fileId: file.getId(), filename: file.getName(), url: file.getUrl() };
}

function listFiles(me, userId) {
  const target = userId || me.id;
  if (me.role === "tech" && target !== me.id) throw new Error("Accès refusé.");
  return readAll("Files")
    .filter(function (f) { return f.userId === target; })
    .map(function (f) { return { kind: f.kind, fileId: f.fileId, filename: f.filename, url: f.url, ts: f.ts }; });
}

/* ====================== ENVOIS (mail / viber-log) ====================== */
function send(me, p) {
  // Viber : pas d'API publique → on journalise le message (à relayer manuellement
  // ou via une intégration tierce). Les mails GS/EPS partent réellement par Gmail.
  if (p.type === "viber") {
    log("viber/" + p.channel, me.email, p.message || "");
    return { ok: true, channel: p.channel };
  }

  if (p.type === "email") {
    const subject = mailSubject(me, p.channel, p.payload);
    const to = mailRecipients(p.channel);
    let bodyText = mailBody(me, p.channel, p.payload);
    const attachments = [];

    // ENVOI MENSUEL : on archive une copie de vérification dans le Drive du tech
    // (sous-dossier daté, créé si besoin) + on la joint au mail.
    if (p.channel === "mensuel") {
      const folderId = ensureUserFolder(me.id);
      const arch = archiveMensuel(me, folderId, p.payload || {});
      (arch.files || []).forEach(function (b) { attachments.push(b); }); // Excel + récap PDF + frais + compteur
      bodyText += "\n" + arch.note;
    }

    GmailApp.sendEmail(to.to, subject, bodyText, { cc: to.cc, attachments: attachments });
    log("email/" + p.channel, me.email, subject);
    return { ok: true, to: to.to };
  }
  return { ok: true };
}

// Crée/retrouve "Archives mensuelles/<période>" dans le dossier du tech, y dépose
// un export CSV des données du cycle (vérification) + une copie de son Excel modèle.
// Reconstitue, dans Drive/<tech>/Archives mensuelles/<période>/, EXACTEMENT le
// contenu envoyé à fdt par l'app d'origine : Excel feuille de temps, tickets de
// frais (FRAIS-<CAT>[-n].ext), photo compteur (<PLAQUE>-MM-AAAA.jpg), récap PDF,
// + une sauvegarde ZIP automatique du mois. Accessible à la comptable (rôle dédié).
function archiveMensuel(me, folderId, payload) {
  const root = DriveApp.getFolderById(folderId);
  const archives = getOrCreateChild(root, "Archives mensuelles");
  const startIso = frToIso(payload.start), endIso = frToIso(payload.end);
  const label = (payload.start || new Date().toISOString().slice(0, 10)).replace(/\//g, "-");
  const sub = getOrCreateChild(archives, label);
  const u = findUserById(me.id);
  const plaque = String(u.plaque || u.codeTech || "PLAQUE").toUpperCase();
  const year = (startIso || "").slice(0, 4) || String(new Date().getFullYear());
  const inP = function (d) { return (!startIso || d >= startIso) && (!endIso || d <= endIso); };
  const files = [];                       // blobs joints au mail (= contenu fdt)
  const blobFromFile = function (id) { try { return DriveApp.getFileById(id).getBlob(); } catch (e) { return null; } };
  const blobFromData = function (dataUrl, mime) {
    try { return Utilities.newBlob(Utilities.base64Decode(dataUrl.split(",")[1]), mime); } catch (e) { return null; }
  };

  // 1. Excel feuille de temps rempli
  let xlsmBlob = null;
  const tpl = readAll("Files").filter(function (f) { return f.userId === me.id && f.kind === "excel_template"; })[0];
  if (tpl) {
    try {
      const fill = fillTemplateForUser(me.id, startIso, endIso);
      xlsmBlob = (fill.ok ? fill.blob : blobFromFile(tpl.fileId));
      if (xlsmBlob) xlsmBlob.setName("TEMPS_" + year + "_" + (startIso || label) + ".xlsm");
    } catch (e) { log("fillExcel/err", me.email, String(e)); }
    if (xlsmBlob) { sub.createFile(xlsmBlob); files.push(xlsmBlob); }
  }

  // 2. Récap PDF (l'ancien HTML)
  let pdfBlob = null;
  try {
    pdfBlob = monthlyStatsPdf(me, label, startIso, endIso).setName("Recap-mensuel_" + (startIso || label) + ".pdf");
    sub.createFile(pdfBlob); files.push(pdfBlob);
  } catch (e) { log("recapPdf/err", me.email, String(e)); }

  // 3. Tickets de frais → FRAIS-<CATÉGORIE>[-n].<ext>
  const catCount = {};
  readData("Frais", me.id).filter(function (e) { return inP(e.date); }).forEach(function (e) {
    const cat = String(e.categorie || "DIVERS").toUpperCase();
    catCount[cat] = (catCount[cat] || 0) + 1;
    const suffix = catCount[cat] > 1 ? "-" + catCount[cat] : "";
    let blob = null, ext = "jpg";
    if (e.fileId) { blob = blobFromFile(e.fileId); if (blob) ext = (blob.getName().split(".").pop() || "jpg"); }
    else if (e.photo && /^data:/.test(e.photo)) { const m = e.photo.substring(5, e.photo.indexOf(";")); ext = (m.split("/")[1] || "jpg"); blob = blobFromData(e.photo, m); }
    if (blob) { blob.setName("FRAIS-" + cat + suffix + "." + ext); sub.createFile(blob); files.push(blob); }
  });

  // 4. Photo compteur → <PLAQUE>-MM-AAAA.jpg
  readData("Compteur", me.id).filter(function (e) { return inP(e.date); }).forEach(function (c) {
    const mm = (c.date || "").slice(5, 7), yyyy = (c.date || "").slice(0, 4);
    let blob = null;
    if (c.fileId) blob = blobFromFile(c.fileId);
    else if (c.photo && /^data:/.test(c.photo)) blob = blobFromData(c.photo, "image/jpeg");
    if (blob) { blob.setName(plaque + "-" + mm + "-" + yyyy + ".jpg"); sub.createFile(blob); files.push(blob); }
  });

  // 5. Sauvegarde ZIP automatique du mois (données + fichiers)
  let zipBlob = null;
  try {
    const data = {};
    ["Temps", "Frais", "GesteCo", "Compteur"].forEach(function (n) {
      data[n.toLowerCase()] = readData(n, me.id).filter(function (e) { return inP(e.date); });
    });
    const entriesBlob = Utilities.newBlob(JSON.stringify(data, null, 1), "application/json", "entries.json");
    zipBlob = Utilities.zip([entriesBlob].concat(files), "sauvegarde_" + label + ".zip");
    sub.createFile(zipBlob);
  } catch (e) { log("backupZip/err", me.email, String(e)); }

  return { folderUrl: sub.getUrl(), xlsmBlob: xlsmBlob, pdfBlob: pdfBlob, zipBlob: zipBlob, files: files, note: "Archive : " + sub.getUrl() };
}

// Recap serveur (mêmes règles que js/views/stats.js).
function monthlyRecap(userId, startIso, endIso) {
  function inP(iso) { return (!startIso || iso >= startIso) && (!endIso || iso <= endIso); }
  const temps = readData("Temps", userId).filter(function (e) { return inP(e.date); });
  const frais = readData("Frais", userId).filter(function (e) { return inP(e.date); });
  const geste = readData("GesteCo", userId).filter(function (e) { return inP(e.date); });
  const byDay = {}; temps.forEach(function (e) { (byDay[e.date] = byDay[e.date] || []).push(e); });
  let hours = 0; for (const d in byDay) hours += xlComputeHours(byDay[d]);
  const PRIME = { GSM: 3, CO: 2, DMP: 2, SE: 4, TC: 1.5, SI: 3, CAM: 4, DACCO: 3, BA: 1, CL: 3, DF: 1.5, "SONDE IN": 1.5 };
  const byType = {}; Object.keys(PRIME).forEach(function (k) { byType[k] = 0; });
  let prime = 0;
  geste.forEach(function (g) {
    const inst = g.installed || {};
    Object.keys(PRIME).forEach(function (k) { const n = inst[k] || 0; byType[k] += n; prime += n * PRIME[k]; });
  });
  const ttc = frais.reduce(function (s, e) { return s + (e.montantEur || 0); }, 0);
  return { nTemps: temps.length, hours: hours, prime: prime, ttc: ttc, byType: byType };
}

function monthlyStatsPdf(me, label, startIso, endIso) {
  const r = monthlyRecap(me.id, startIso, endIso);
  const code = (findUserById(me.id).codeTech) || "";
  const rows = Object.keys(r.byType).filter(function (k) { return r.byType[k] > 0; })
    .map(function (k) { return "<tr><td>" + k + "</td><td style='text-align:right'>" + r.byType[k] + "</td></tr>"; }).join("");
  const html = "<html><head><meta charset='utf-8'><style>"
    + "body{font-family:Arial,sans-serif;color:#1a1a1a;padding:24px}"
    + "h1{color:#ee2322;margin:0 0 4px} table{border-collapse:collapse;width:100%;margin:8px 0}"
    + "td,th{border:1px solid #ccc;padding:7px;font-size:13px} th{background:#f3f3f3;text-align:left}"
    + "</style></head><body>"
    + "<h1>G-SYSTEMS · RÉCAP</h1>"
    + "<p><b>" + me.name + "</b> &nbsp;·&nbsp; code " + code + "<br>Période : " + label + "</p>"
    + "<table><tr><th>Indicateur</th><th style='text-align:right'>Valeur</th></tr>"
    + "<tr><td>Interventions</td><td style='text-align:right'>" + r.nTemps + "</td></tr>"
    + "<tr><td>Heures</td><td style='text-align:right'>" + r.hours + " h</td></tr>"
    + "<tr><td>Primes GESTE CO</td><td style='text-align:right'>" + r.prime.toFixed(2) + " €</td></tr>"
    + "<tr><td>Frais TTC</td><td style='text-align:right'>" + r.ttc.toFixed(2) + " €</td></tr></table>"
    + "<h3>GESTE CO installés</h3><table><tr><th>Type</th><th style='text-align:right'>Qté</th></tr>"
    + (rows || "<tr><td colspan='2'>Aucune extension</td></tr>") + "</table>"
    + "<p style='color:#888;font-size:11px'>Généré automatiquement par G-SYSTEMS.</p></body></html>";
  return Utilities.newBlob(html, "text/html", "stats-" + label + ".html")
    .getAs("application/pdf").setName("stats-" + label + ".pdf");
}

function getOrCreateChild(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
// "dd/mm/yyyy" → "yyyy-mm-dd" (null si absent/illisible)
function frToIso(fr) {
  if (!fr) return null;
  const m = String(fr).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? (m[3] + "-" + m[2] + "-" + m[1]) : null;
}

function mailRecipients(channel) {
  // EPS pour clients (geste co, gsm) ; GS pour interne (temps, frais, recap, mensuel)
  if (channel === "eps_gesteco" || channel === "eps_gsm")
    return { to: CONFIG.MAIL.EPS_TO, cc: CONFIG.MAIL.EPS_CC1 };
  return { to: CONFIG.MAIL.GS_TO, cc: "" };
}
function mailSubject(me, channel, payload) {
  const code = (findUserById(me.id).codeTech) || "";
  switch (channel) {
    case "eps_gesteco": return "GESTE CO - " + code + " - site " + (payload && payload.numeroSite || "");
    case "eps_gsm":     return "GSM SEUL - " + code + " - site " + (payload && payload.numeroSite || "");
    case "recap":       return "RÉCAP - " + me.name + " - " + (payload && payload.start) + "→" + (payload && payload.end);
    case "mensuel":     return "ENVOI MENSUEL - " + me.name + " - " + (payload && payload.start);
    case "frais":       return "FRAIS - " + me.name;
    default:            return "G-SYSTEMS - " + channel;
  }
}
function mailBody(me, channel, payload) {
  // Corps texte court (cf. mémoire « format mails texte brut »).
  let lines = ["Technicien : " + me.name];
  if (payload && payload.start) lines.push("Période : " + payload.start + (payload.end ? " → " + payload.end : ""));
  if (payload && payload.numeroSite) lines.push("Site : " + payload.numeroSite);
  lines.push("", "Envoi automatique G-SYSTEMS.");
  return lines.join("\n");
}

/* ====================== HELPERS SHEET ====================== */
function db() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty("DB_ID");
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  const ss = SpreadsheetApp.create(DB_NAME);
  props.setProperty("DB_ID", ss.getId());
  return ss;
}
function sheet(name) {
  const ss = db();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); }
  return sh;
}
function appendRow(name, row) { sheet(name).appendRow(row); }
function readAll(name) {
  const rows = sheet(name).getDataRange().getValues();
  const head = rows[0] || [];
  return rows.slice(1).map(function (r) {
    const o = {}; head.forEach(function (h, i) { o[h] = r[i]; }); return o;
  });
}
function readData(name, userId) {
  const rows = sheet(name).getDataRange().getValues();
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === userId) { try { out.push(JSON.parse(rows[i][3])); } catch (e) {} }
  }
  return out;
}
function findRowIndex(rows, userId, entryId) {
  for (let i = 1; i < rows.length; i++) if (rows[i][0] === userId && rows[i][1] === entryId) return i;
  return -1;
}
function findUserByEmail(email) {
  return readAll("Users").filter(function (u) {
    return String(u.email).toLowerCase() === String(email).toLowerCase();
  })[0] || null;
}
function findUserById(id) {
  return readAll("Users").filter(function (u) { return u.id === id; })[0] || null;
}
// Écrit des champs d'un utilisateur par NOM de colonne (robuste à l'ordre).
function setUserFields(id, fields) {
  const sh = sheet("Users");
  const data = sh.getDataRange().getValues();
  const head = data[0];
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === id) {
      Object.keys(fields).forEach(function (k) {
        const c = head.indexOf(k);
        if (c >= 0) data[i][c] = fields[k];
      });
      sh.getRange(i + 1, 1, 1, data[i].length).setValues([data[i]]);
      return true;
    }
  }
  return false;
}
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, name: u.name, email: u.email, role: u.role,
    responsableId: u.responsableId || null, codeTech: u.codeTech || "",
    driveUrl: u.driveUrl || "", createdAt: u.createdAt,
    status: u.status || "active",
    plaque: u.plaque || "",
    mustChangePassword: String(u.mustChangePassword) === "true",
  };
}
function log(action, who, detail) {
  appendRow("Log", [new Date().toISOString(), action, who, detail]);
}

/* ====================== SETUP (à exécuter UNE fois) ====================== */
function setup() {
  const ss = db();
  const headers = {
    Users: ["id", "name", "email", "passwordHash", "role", "responsableId", "codeTech", "driveFolderId", "driveUrl", "createdAt", "status", "salt", "mustChangePassword", "plaque"],
    Temps: ["userId", "id", "date", "json", "ts"],
    Frais: ["userId", "id", "date", "json", "ts"],
    GesteCo: ["userId", "id", "date", "json", "ts"],
    Compteur: ["userId", "id", "date", "json", "ts"],
    Files: ["userId", "kind", "fileId", "filename", "url", "ts"],
    Sessions: ["token", "userId", "createdAt"],
    Log: ["ts", "action", "who", "detail"],
  };
  Object.keys(headers).forEach(function (name) {
    const sh = sheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(headers[name]);
  });
  // supprime la feuille par défaut "Feuille 1"/"Sheet1" si vide
  ["Feuille 1", "Sheet1"].forEach(function (n) {
    const s = ss.getSheetByName(n); if (s && ss.getSheets().length > 1) ss.deleteSheet(s);
  });

  // Admin de départ (devra changer son mot de passe à la 1re connexion)
  if (!findUserByEmail(CONFIG.BOOTSTRAP_ADMIN.email)) {
    const salt = newSalt();
    appendRow("Users", [
      "u_admin", CONFIG.BOOTSTRAP_ADMIN.name, CONFIG.BOOTSTRAP_ADMIN.email,
      hashWithSalt(CONFIG.BOOTSTRAP_ADMIN.password, salt), "admin", "", "", "", "", new Date().toISOString(),
      "active", salt, "true", "",
    ]);
  }
  Logger.log("Setup OK. Base : " + ss.getUrl());
  Logger.log("Admin : " + CONFIG.BOOTSTRAP_ADMIN.email);
}

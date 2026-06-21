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
  BOOTSTRAP_ADMIN: { name: "Cedric Lago Gomez", email: "admin@gsystem.fr", password: "change-moi" },

  // Destinataires fixes (cf. HANDOFF.md §5). Les mails partent automatiquement ici.
  MAIL: {
    GS_TO:   "fdt@fggestion.fr",
    EPS_TO:  "epsinfotechline@eps.e-i.com",
    EPS_CC1: "johanna@fggestion.fr",
  },

  SALT: "gsystem-sel-a-changer", // change cette chaîne avant le 1er setup()
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
    case "tree":       return tree(requireRole(me, ["admin", "responsable"]));
    case "createUser": return createUser(requireRole(me, ["admin"]), params);
    case "updateUser": return updateUser(requireRole(me, ["admin"]), params);
    case "deleteUser": return deleteUser(requireRole(me, ["admin"]), params);
    case "getUserData":return getUserData(requireUser(me), params.userId);
    case "pushEntries":return pushEntries(requireUser(me), params.kind, params.entries);
    case "deleteEntry":return deleteEntry(requireUser(me), params.kind, params.id);
    case "uploadFile": return uploadFile(requireUser(me), params);
    case "listFiles":  return listFiles(requireUser(me), params.userId);
    case "send":       return send(requireUser(me), params);
    default: throw new Error("Action inconnue: " + action);
  }
}

/* ====================== AUTH / SESSIONS ====================== */
function hash(pw) {
  const raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pw + CONFIG.SALT);
  return raw.map(function (b) { return ("0" + (b & 0xff).toString(16)).slice(-2); }).join("");
}

function login(email, password) {
  const u = findUserByEmail(email);
  if (!u || u.passwordHash !== hash(password)) throw new Error("Email ou mot de passe incorrect.");
  const token = Utilities.getUuid();
  appendRow("Sessions", [token, u.id, new Date().toISOString()]);
  return { token: token, user: publicUser(u) };
}

function sessionUser(token) {
  const rows = sheet("Sessions").getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === token) return findUserById(rows[i][1]);
  }
  return null;
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
  return { users: users };
}

function createUser(me, p) {
  if (findUserByEmail(p.email)) throw new Error("Cet email existe déjà.");
  const id = "u_" + Utilities.getUuid().slice(0, 8);
  let driveUrl = "", driveId = "";
  if (p.role === "tech") {
    const folder = DriveApp.getFolderById(CONFIG.DRIVE_ROOT_FOLDER_ID).createFolder(p.name);
    driveId = folder.getId();
    driveUrl = folder.getUrl();
  }
  appendRow("Users", [
    id, p.name, p.email, hash(p.password), p.role,
    p.responsableId || "", p.codeTech || "", driveId, driveUrl, new Date().toISOString(),
  ]);
  log("createUser", me.email, p.email + " (" + p.role + ")");
  return publicUser(findUserById(id));
}

function updateUser(me, p) {
  const sh = sheet("Users");
  const rows = sh.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === p.id) {
      const patch = p.patch || {};
      if (patch.name != null) rows[i][1] = patch.name;
      if (patch.email != null) rows[i][2] = patch.email;
      if (patch.password) rows[i][3] = hash(patch.password);
      if (patch.role != null) rows[i][4] = patch.role;
      if (patch.responsableId !== undefined) rows[i][5] = patch.responsableId || "";
      if (patch.codeTech != null) rows[i][6] = patch.codeTech;
      sh.getRange(i + 1, 1, 1, rows[i].length).setValues([rows[i]]);
      return publicUser(findUserById(p.id));
    }
  }
  throw new Error("Utilisateur introuvable.");
}

function deleteUser(me, p) {
  const sh = sheet("Users");
  const rows = sh.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === p.id) sh.deleteRow(i + 1);
  }
  log("deleteUser", me.email, p.id);
  return { ok: true };
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
// Le tech dépose son .xlsm 1×/an : on le stocke dans SON dossier Drive et on
// le référence dans l'onglet Files. Remplace l'ancien modèle de même `kind`.
function uploadFile(me, p) {
  const u = findUserById(me.id);
  if (!u.driveFolderId) throw new Error("Aucun dossier Drive (compte non-tech ?).");
  const folder = DriveApp.getFolderById(u.driveFolderId);
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
  const folderId = findUserById(me.id).driveFolderId;

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
    // (sous-dossier daté) + on la joint au mail.
    if (p.channel === "mensuel" && folderId) {
      const arch = archiveMensuel(me, folderId, p.payload || {});
      attachments.push(arch.csvBlob);
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
function archiveMensuel(me, folderId, payload) {
  const root = DriveApp.getFolderById(folderId);
  const archives = getOrCreateChild(root, "Archives mensuelles");
  const label = (payload.start || new Date().toISOString().slice(0, 10)).replace(/\//g, "-");
  const sub = getOrCreateChild(archives, label);

  // export CSV des interventions du tech (toutes ; le mail précise la période)
  const temps = readData("Temps", me.id);
  let csv = "date;type;client;ville;dept;num;observation\n";
  temps.forEach(function (e) {
    csv += [e.date, e.typeMission, e.nomClient, e.ville, e.departement, e.numeroIntervention, e.observationType]
      .map(function (x) { return (x || "").toString().replace(/;/g, ","); }).join(";") + "\n";
  });
  const csvBlob = Utilities.newBlob(csv, "text/csv", "verification-" + label + ".csv");
  sub.createFile(csvBlob);

  // copie du modèle Excel du tech (si fourni) pour la trace mensuelle
  const tpl = readAll("Files").filter(function (f) { return f.userId === me.id && f.kind === "excel_template"; })[0];
  if (tpl) { try { DriveApp.getFileById(tpl.fileId).makeCopy("mensuel-" + label + ".xlsm", sub); } catch (e) {} }

  return { folderUrl: sub.getUrl(), csvBlob: csvBlob, note: "Archive : " + sub.getUrl() };
}
function getOrCreateChild(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
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
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, name: u.name, email: u.email, role: u.role,
    responsableId: u.responsableId || null, codeTech: u.codeTech || "",
    driveUrl: u.driveUrl || "", createdAt: u.createdAt,
  };
}
function log(action, who, detail) {
  appendRow("Log", [new Date().toISOString(), action, who, detail]);
}

/* ====================== SETUP (à exécuter UNE fois) ====================== */
function setup() {
  const ss = db();
  const headers = {
    Users: ["id", "name", "email", "passwordHash", "role", "responsableId", "codeTech", "driveFolderId", "driveUrl", "createdAt"],
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

  // Admin de départ
  if (!findUserByEmail(CONFIG.BOOTSTRAP_ADMIN.email)) {
    appendRow("Users", [
      "u_admin", CONFIG.BOOTSTRAP_ADMIN.name, CONFIG.BOOTSTRAP_ADMIN.email,
      hash(CONFIG.BOOTSTRAP_ADMIN.password), "admin", "", "", "", "", new Date().toISOString(),
    ]);
  }
  Logger.log("Setup OK. Base : " + ss.getUrl());
  Logger.log("Admin : " + CONFIG.BOOTSTRAP_ADMIN.email);
}

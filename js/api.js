// API — couche d'accès au backend Google Apps Script.
// Tant que CONFIG.BACKEND_URL est vide → MODE DÉMO (données locales factices).
import { getBackendUrl, isDemo } from "./config.js";
import { todayIso } from "./business/dates.js";
import { checkPassword } from "./business/password.js";

const LS_KEY = "gsystem_demo_db_v1";

// ----------------------------------------------------------------
//  MODE LIVE — appels au backend Apps Script (POST JSON, action+params)
// ----------------------------------------------------------------
async function callBackend(action, params = {}, token = null) {
  const res = await fetch(getBackendUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" }, // évite le preflight CORS
    body: JSON.stringify({ action, token, params }),
  });
  if (!res.ok) throw new Error("Erreur réseau (" + res.status + ")");
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

// ----------------------------------------------------------------
//  MODE DÉMO — base factice en localStorage
// ----------------------------------------------------------------
function seedDb() {
  const techData = (n) => ({
    temps: [
      { id: "t1", date: todayIso(), typeMission: "INST", nomClient: "richard", ville: "gignac",
        departement: "34", numeroIntervention: "43001714", observationType: "", slotMidi: "MATIN" },
      { id: "t2", date: todayIso(), typeMission: "SAV", nomClient: "durand", ville: "sete",
        departement: "34", numeroIntervention: "12345678", observationType: "NR_CLIENT_ABS", slotMidi: "APREM" },
    ],
    frais: [
      { id: "f1", date: todayIso(), categorie: "PEAGE", montantEur: 12.4 },
      { id: "f2", date: todayIso(), categorie: "REPAS", montantEur: 15.9 },
    ],
    gesteCo: [
      { id: "g1", date: todayIso(), numeroSite: "S-204", installed: { GSM: 2, CO: 1 }, offered: { GSM: 1 } },
    ],
    compteur: [],
  });
  return {
    users: [
      { id: "u_admin", name: "Cedric Lago Gomez", email: "admin@gsystem.fr", password: "admin",
        role: "admin", responsableId: null, codeTech: "ISTGS54", driveUrl: "#", createdAt: todayIso(), status: "active" },
      { id: "u_resp", name: "Johanna Martin", email: "resp@gsystem.fr", password: "resp",
        role: "responsable", responsableId: null, codeTech: "", driveUrl: "#", createdAt: todayIso(), status: "active" },
      { id: "u_tech", name: "Tech Démo", email: "tech@gsystem.fr", password: "tech",
        role: "tech", responsableId: "u_resp", codeTech: "ISTGS54", driveUrl: "#", createdAt: todayIso(), status: "active" },
      { id: "u_tech2", name: "Paul Bernard", email: "paul@gsystem.fr", password: "paul",
        role: "tech", responsableId: "u_resp", codeTech: "ISTGS61", driveUrl: "#", createdAt: todayIso(),
        status: "active", mustChangePassword: true },
    ],
    data: { u_tech: techData("Tech Démo"), u_tech2: techData("Paul Bernard") },
  };
}
function loadDb() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const db = seedDb();
  saveDb(db);
  return db;
}
function saveDb(db) { localStorage.setItem(LS_KEY, JSON.stringify(db)); }
function uid() { return "u_" + Math.random().toString(36).slice(2, 9); }
function publicUser(u) { const { password, ...rest } = u; return rest; }

function demo(action, params, token) {
  const db = loadDb();
  const sessUserId = token ? token.replace("demo:", "") : null;
  const me = db.users.find((u) => u.id === sessUserId);

  switch (action) {
    case "login": {
      const u = db.users.find(
        (x) => x.email.toLowerCase() === (params.email || "").toLowerCase() && x.password === params.password
      );
      if (!u) throw new Error("Email ou mot de passe incorrect.");
      if (u.status === "inactive") throw new Error("Accès désactivé. Contactez votre administrateur.");
      return { token: "demo:" + u.id, user: publicUser(u) };
    }
    case "me": {
      if (!me) throw new Error("Session expirée.");
      if (me.status === "inactive") throw new Error("Accès désactivé.");
      return publicUser(me);
    }
    case "tree": {
      if (!me || me.role === "tech") throw new Error("Accès refusé.");
      // responsable → uniquement son équipe ; admin → tout
      let users = db.users.map(publicUser);
      if (me.role === "responsable") {
        users = users.filter((u) => u.id === me.id || u.responsableId === me.id);
      }
      if (me.role !== "admin") users = users.filter((u) => u.role !== "admin"); // super admin invisible
      return { users };
    }
    case "createUser": {
      if (!me || (me.role !== "admin" && me.role !== "direction")) throw new Error("Accès refusé.");
      if (db.users.some((u) => u.email.toLowerCase() === params.email.toLowerCase()))
        throw new Error("Cet email existe déjà.");
      const pc = checkPassword(params.password, { email: params.email });
      if (!pc.ok) throw new Error("Mot de passe initial trop faible : il faut " + pc.errors.join(", ") + ".");
      const u = {
        id: uid(), name: params.name, email: params.email, password: params.password,
        role: params.role, responsableId: params.responsableId || null,
        codeTech: params.codeTech || "", createdAt: todayIso(), status: "active",
        mustChangePassword: true,
        driveUrl: "#dossier-drive-" + encodeURIComponent(params.name),
      };
      db.users.push(u);
      if (u.role === "tech") db.data[u.id] = { temps: [], frais: [], gesteCo: [], compteur: [] };
      saveDb(db);
      return publicUser(u);
    }
    case "updateUser": {
      if (!me || (me.role !== "admin" && me.role !== "direction")) throw new Error("Accès refusé.");
      const u = db.users.find((x) => x.id === params.id);
      if (!u) throw new Error("Utilisateur introuvable.");
      Object.assign(u, params.patch || {});
      saveDb(db);
      return publicUser(u);
    }
    case "deleteUser": {
      if (!me || me.role !== "admin") throw new Error("Accès refusé.");
      db.users = db.users.filter((x) => x.id !== params.id);
      delete db.data[params.id];
      saveDb(db);
      return { ok: true };
    }
    case "getUserData": {
      if (!me) throw new Error("Session expirée.");
      const target = params.userId || me.id;
      // garde-fou : tech → ses données ; responsable → son équipe ; admin → tout
      if (me.role === "tech" && target !== me.id) throw new Error("Accès refusé.");
      if (me.role === "responsable") {
        const t = db.users.find((u) => u.id === target);
        if (!t || (t.id !== me.id && t.responsableId !== me.id)) throw new Error("Accès refusé.");
      }
      return db.data[target] || { temps: [], frais: [], gesteCo: [], compteur: [] };
    }
    case "pushEntries": {
      if (!me) throw new Error("Session expirée.");
      const bucket = (db.data[me.id] ||= { temps: [], frais: [], gesteCo: [], compteur: [] });
      const arr = (bucket[params.kind] ||= []);
      for (const e of params.entries || []) {
        const i = arr.findIndex((x) => x.id === e.id);
        if (i >= 0) arr[i] = e; else arr.push(e);
      }
      saveDb(db);
      return { count: arr.length };
    }
    case "deleteEntry": {
      if (!me) throw new Error("Session expirée.");
      const bucket = db.data[me.id]; if (bucket && bucket[params.kind])
        bucket[params.kind] = bucket[params.kind].filter((x) => x.id !== params.id);
      saveDb(db);
      return { ok: true };
    }
    case "updateProfile": {
      if (!me) throw new Error("Session expirée.");
      const full = db.users.find((x) => x.id === me.id);
      if (full) { if (params.plaque != null) full.plaque = params.plaque; if (params.codeTech != null) full.codeTech = params.codeTech; saveDb(db); }
      return publicUser(full);
    }
    case "changePassword": {
      if (!me) throw new Error("Session expirée.");
      const full = db.users.find((x) => x.id === me.id);
      if (!full || full.password !== params.currentPassword) throw new Error("Mot de passe actuel incorrect.");
      const pc = checkPassword(params.newPassword, { email: full.email });
      if (!pc.ok) throw new Error("Mot de passe trop faible : il faut " + pc.errors.join(", ") + ".");
      full.password = params.newPassword;
      full.mustChangePassword = false;
      saveDb(db);
      return { ok: true };
    }
    case "uploadFile": {
      if (!me) throw new Error("Session expirée.");
      db.files ||= {};
      const arr = (db.files[me.id] ||= []);
      const f = { kind: params.kind, filename: params.filename, url: "#demo",
        size: params.size || 0, ts: todayIso() };
      const i = arr.findIndex((x) => x.kind === params.kind);
      if (i >= 0) arr[i] = f; else arr.push(f);
      saveDb(db);
      return { fileId: "demo", filename: f.filename, url: f.url };
    }
    case "listFiles": {
      if (!me) throw new Error("Session expirée.");
      db.files ||= {};
      const target = params.userId || me.id;
      if (me.role === "tech" && target !== me.id) throw new Error("Accès refusé.");
      return db.files[target] || [];
    }
    case "send": {
      // simulation d'envoi serveur (mail/excel). En vrai → GmailApp + Drive.
      const extra = params.channel === "mensuel" ? " · archive de vérification créée dans le Drive" : "";
      return { ok: true, simulated: true, message: (params.message || "") + extra };
    }
    default:
      throw new Error("Action inconnue: " + action);
  }
}

// ----------------------------------------------------------------
//  Façade unique
// ----------------------------------------------------------------
export async function api(action, params = {}, token = null) {
  if (isDemo()) {
    // micro-latence pour réalisme
    await new Promise((r) => setTimeout(r, 120));
    return demo(action, params, token);
  }
  return callBackend(action, params, token);
}

export function resetDemo() { localStorage.removeItem(LS_KEY); }

// Store — données du tech courant + file d'attente hors-ligne ("au fil de l'eau").
import { api } from "./api.js";
import { token } from "./auth.js";

const QUEUE_KEY = "gsystem_queue";
let cache = null; // { temps:[], frais:[], gesteCo:[], compteur:[] }

export async function loadMine(force = false) {
  if (cache && !force) return cache;
  cache = await api("getUserData", {}, token());
  return cache;
}
export function data() { return cache || { temps: [], frais: [], gesteCo: [], compteur: [] }; }

function queue() { try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch { return []; } }
function setQueue(q) { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); }

/** Ajoute/maj une entrée : maj optimiste du cache + push backend (file si hors-ligne). */
export async function upsert(kind, entry) {
  cache ||= { temps: [], frais: [], gesteCo: [], compteur: [] };
  const arr = (cache[kind] ||= []);
  const i = arr.findIndex((x) => x.id === entry.id);
  if (i >= 0) arr[i] = entry; else arr.push(entry);
  try {
    await api("pushEntries", { kind, entries: [entry] }, token());
  } catch {
    const q = queue(); q.push({ kind, entry }); setQueue(q);
  }
  return entry;
}

export async function remove(kind, id) {
  if (cache && cache[kind]) cache[kind] = cache[kind].filter((x) => x.id !== id);
  try { await api("deleteEntry", { kind, id }, token()); } catch {}
}

/** Rejoue la file d'attente (appelé au retour en ligne / démarrage). */
export async function flushQueue() {
  let q = queue();
  if (!q.length) return;
  const remaining = [];
  for (const item of q) {
    try { await api("pushEntries", { kind: item.kind, entries: [item.entry] }, token()); }
    catch { remaining.push(item); }
  }
  setQueue(remaining);
}

export function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

window.addEventListener("online", () => flushQueue());

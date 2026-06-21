// Auth — session (token + utilisateur courant), persistée localement.
import { api } from "./api.js";

const TOKEN_KEY = "gsystem_token";
let _user = null;

export function token() { return localStorage.getItem(TOKEN_KEY); }
export function currentUser() { return _user; }

export async function login(email, password) {
  const { token: tk, user } = await api("login", { email, password });
  localStorage.setItem(TOKEN_KEY, tk);
  _user = user;
  return user;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  _user = null;
}

/** Restaure la session au démarrage (valide le token auprès du backend). */
export async function restore() {
  const tk = token();
  if (!tk) return null;
  try {
    _user = await api("me", {}, tk);
    return _user;
  } catch {
    logout();
    return null;
  }
}

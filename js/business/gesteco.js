// GESTE CO — port de data/Models.kt (types, primes internes, cadeaux client).
// Règle cadeau : total client ≤ 4,50 € ; offertes ≤ moitié des installées (sauf dérogation EPS).

export const MAX_GIFT_EUR = 4.50;

// 12 types (ordre = celui du RÉCAP / CSV — cf. GesteCoPrices.TYPES).
export const GESTE_TYPES = ["GSM", "CO", "DMP", "SE", "TC", "SI", "CAM", "DACCO", "BA", "CL", "DF", "SONDE IN"];

// Primes internes par défaut (€) — GesteCoPrices.
export const DEFAULT_PRIMES = {
  GSM: 3.0, CO: 2.0, DMP: 2.0, SE: 4.0, TC: 1.5, SI: 3.0,
  CAM: 4.0, DACCO: 3.0, BA: 1.0, CL: 3.0, DF: 1.5, "SONDE IN": 1.5,
};

// Cadeaux client par défaut (€) — GesteCoClientGifts.
export const DEFAULT_GIFTS = {
  GSM: 3.0, CO: 1.5, DMP: 3.0, SE: 4.5, TC: 0, SI: 0,
  CAM: 0, DACCO: 0, BA: 0, CL: 0, DF: 0, "SONDE IN": 0,
};

export function primeFor(type, prices = DEFAULT_PRIMES) {
  return prices[type.toUpperCase()] ?? 0;
}
export function giftFor(type, gifts = DEFAULT_GIFTS) {
  return gifts[type.toUpperCase()] ?? 0;
}

/** Total prime interne d'une clôture (installed[type] × prime). */
export function totalPrime(installed, prices = DEFAULT_PRIMES) {
  return GESTE_TYPES.reduce((s, t) => s + (installed[t] || 0) * primeFor(t, prices), 0);
}
/** Total cadeau client (offered[type] × gift). */
export function totalClientGift(offered, gifts = DEFAULT_GIFTS) {
  return GESTE_TYPES.reduce((s, t) => s + (offered[t] || 0) * giftFor(t, gifts), 0);
}

/** Valide la règle cadeau : plafond 4,50 € + offertes ≤ moitié installées. eps=dérogation. */
export function validateGift(installed, offered, gifts = DEFAULT_GIFTS, eps = false) {
  const total = totalClientGift(offered, gifts);
  const capOk = eps || total <= MAX_GIFT_EUR + 0.001;
  let halfOk = true;
  for (const t of GESTE_TYPES) {
    const inst = installed[t] || 0, off = offered[t] || 0;
    if (off > Math.floor(inst / 2)) halfOk = false;
  }
  return { total, capOk, halfOk: eps || halfOk, ok: capOk && (eps || halfOk) };
}

import { h, icon } from "../../ui.js";
import { CONFIG } from "../../config.js";
import { currentUser, logout } from "../../auth.js";
import { navigate } from "../../router.js";
import { loadMine } from "../../store.js";
import { cyclePeriod, fr, inRange, currentQuarter } from "../../business/dates.js";
import { eur } from "../../business/frais.js";

// Tuile catégorie — reproduit components/IndicatorCalm.kt (CategoryTile).
export function tile({ number, label, sub, ic, start, end, accent, liveValue, liveLabel, pulse, onClick }) {
  const style = [
    `background:linear-gradient(135deg, ${start}, ${end})`,
    `border-color:${hexA(accent, 0.25)}`,
    `--tile-accent:${accent}`,
    `--halo:${hexA(accent, 0.18)}`,
  ].join(";");

  const right = liveValue != null
    ? h("div", { class: "live" }, h("div", { class: "v" }, liveValue),
        liveLabel && h("div", { class: "l" }, liveLabel))
    : pulse ? h("div", { class: "pulse" }) : null;

  return h("div", { class: "tile", style, onclick: onClick },
    h("div", { class: "ic" }, icon(ic, 20)),
    h("div", { class: "body" },
      h("div", { class: "titleline" },
        h("span", { class: "num t-label-s" }, number),
        h("span", { class: "label" }, label)),
      h("div", { class: "sub" }, sub)),
    right
  );
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export async function homeView() {
  const user = currentUser();
  const store = await loadMine();

  const { start, end } = cyclePeriod(new Date(), CONFIG.DEFAULT_CYCLE_START_DAY);
  const isCycle = (iso) => inRange(iso, start, end);

  const countTemps = store.temps.filter((e) => isCycle(e.date)).length;
  const fraisCycle = store.frais.filter((e) => isCycle(e.date));
  const countFrais = fraisCycle.length;
  const sumFrais = fraisCycle.reduce((s, e) => s + (e.montantEur || 0), 0);

  const daysToEnd = Math.ceil((end - new Date()) / 86400000);
  const endApproaching = daysToEnd >= 0 && daysToEnd <= 3;

  const screen = h("div", { class: "screen" });

  // STATUS BAR
  screen.append(
    h("div", { class: "statusbar" },
      h("div", { class: "live-ref" },
        h("span", { class: "live-dot" }),
        h("span", { class: "ref t-label-m" }, CONFIG.ORG),
        h("span", { class: "status t-label-m" }, "· OPÉRATIONNEL")),
      h("div", { style: "display:flex;gap:8px" },
        user.role !== "tech"
          ? h("button", { class: "icon-btn", title: "Retour gestion", onclick: () => navigate("/admin") },
              icon("group", 18))
          : null,
        h("button", { class: "icon-btn", title: "Réglages", onclick: () => navigate("/settings") },
          icon("settings", 18)))
    ),
    h("hr", { class: "hairline" })
  );

  // HEADER WORDMARK
  screen.append(
    h("div", { class: "home-header" },
      h("div", { class: "wordmark t-display" }, "G-SYSTEMS"),
      h("div", { class: "identity" },
        h("span", { class: "pip" }),
        h("span", { class: "who t-label-m" },
          `${(user.name || "TECH").toUpperCase()}  ·  CYCLE ${fr(start)} → ${fr(end)}`))
    )
  );

  // TUILES
  const tiles = h("div", { class: "tiles" });
  tiles.append(
    tile({ number: "01", label: "CLÔTURE", sub: "Clôture d'intervention", ic: "assignment",
      start: "#7C3AED", end: "#1A0B36", accent: "#A78BFA",
      liveValue: countTemps > 0 ? String(countTemps) : null, liveLabel: countTemps > 0 ? "ce cycle" : null,
      onClick: () => navigate("/cloture") }),
    tile({ number: "02", label: "ATTENTE CLIENT", sub: "Viber heure début · rappel /15 min", ic: "timer",
      start: "#8A5CF6", end: "#6366F1", accent: "#DDD6FE", onClick: () => navigate("/attente") }),
    tile({ number: "03", label: "COURRIER", sub: "Viber « courrier ok »", ic: "email",
      start: "#6366F1", end: "#3B82F6", accent: "#C7D2FE", onClick: () => navigate("/courrier") }),
    tile({ number: "04", label: "RÉCAP", sub: "Cumul du cycle · total euros", ic: "barchart",
      start: "#3B82F6", end: "#06B6D4", accent: "#BFDBFE", onClick: () => navigate("/recap") }),
    tile({ number: "05", label: "FRAIS",
      sub: sumFrais > 0 ? `Tickets · ${eur(sumFrais)} ce cycle` : "Tickets · photos · envoi groupe",
      ic: "receipt", start: "#06B6D4", end: "#14B8A6", accent: "#A5F3FC",
      liveValue: countFrais > 0 ? String(countFrais) : null, liveLabel: countFrais > 0 ? "tickets" : null,
      onClick: () => navigate("/frais") }),
    tile({ number: "06", label: "ENVOI MENSUEL", sub: "Excel + tickets + compteur", ic: "outbox",
      start: "#22C55E", end: "#15803D", accent: "#BBF7D0", pulse: endApproaching,
      onClick: () => navigate("/envoi") })
  );

  const body = h("div", { class: "screen-body", style: "padding:0" }, tiles);
  screen.append(body);

  // FOOTER
  screen.append(
    h("hr", { class: "hairline" }),
    h("div", { class: "footer-spec" },
      h("span", {}, `G-SYS · ${currentQuarter()}`),
      h("span", {}, `v${CONFIG.APP_VERSION}`),
      h("span", {}, CONFIG.SERIAL))
  );

  return screen;
}

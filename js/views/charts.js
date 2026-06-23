// Graphiques SVG natifs (aucune dépendance) : camembert, barres, courbe.
import { h } from "../ui.js";

export const PALETTE = ["#7C3AED", "#06B6D4", "#10B981", "#3B82F6", "#F59E0B",
  "#EC4899", "#8B5CF6", "#14B8A6", "#EF4444", "#22C55E", "#6366F1", "#A78BFA"];

function svgWrap(inner, vb) {
  const w = document.createElement("div");
  w.innerHTML = `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">${inner}</svg>`;
  return w.firstChild;
}

// data: [{label, value, color?}]
export function pieChart(data, title) {
  const items = data.filter((d) => d.value > 0);
  const total = items.reduce((s, d) => s + d.value, 0) || 1;
  const r = 80, cx = 90, cy = 90; let a = -Math.PI / 2; let paths = "";
  items.forEach((d, i) => {
    const frac = d.value / total, a2 = a + frac * 2 * Math.PI;
    const col = d.color || PALETTE[i % PALETTE.length];
    if (frac >= 0.9999) { paths += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}"/>`; }
    else {
      const x1 = cx + r * Math.cos(a), y1 = cy + r * Math.sin(a);
      const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      paths += `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${frac > 0.5 ? 1 : 0} 1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${col}"/>`;
    }
    a = a2;
  });
  paths += `<circle cx="${cx}" cy="${cy}" r="42" fill="#12141B"/>`;
  const svg = svgWrap(paths, "0 0 180 180");
  const legend = h("div", { class: "chart-legend" },
    ...items.map((d, i) => h("span", { class: "lg" },
      h("i", { style: `background:${d.color || PALETTE[i % PALETTE.length]}` }),
      `${d.label} (${d.value})`)));
  return chartCard(title, svg, legend);
}

// data: [{label, value, color?}] — barres horizontales (classements)
export function barChart(data, title, unit) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const rows = h("div", { class: "barlist" },
    ...data.map((d, i) => h("div", { class: "barrow" },
      h("span", { class: "bl" }, d.label),
      h("span", { class: "bt" },
        h("i", { style: `width:${(d.value / max * 100).toFixed(0)}%;background:${d.color || PALETTE[i % PALETTE.length]}` })),
      h("span", { class: "bv" }, unit ? `${d.value}${unit}` : String(d.value)))));
  return chartCard(title, rows);
}

// series: [{label, value}] — courbe d'évolution
export function lineChart(series, title, color) {
  const W = 320, H = 120, pad = 8;
  const max = Math.max(1, ...series.map((s) => s.value));
  const n = series.length || 1;
  const xf = (i) => pad + (i * (W - 2 * pad)) / Math.max(1, n - 1);
  const yf = (v) => H - pad - (v / max) * (H - 2 * pad);
  const pts = series.map((s, i) => `${xf(i).toFixed(1)},${yf(s.value).toFixed(1)}`).join(" ");
  const c = color || "#3B82F6";
  let inner = `<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"/>`;
  inner += series.map((s, i) => `<circle cx="${xf(i).toFixed(1)}" cy="${yf(s.value).toFixed(1)}" r="2.5" fill="${c}"/>`).join("");
  return chartCard(title, svgWrap(inner, `0 0 ${W} ${H}`));
}

function chartCard(title, ...nodes) {
  return h("div", { class: "card" }, title ? h("h3", {}, title) : null, ...nodes);
}

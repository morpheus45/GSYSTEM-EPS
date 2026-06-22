import { h, toast, overlay, icon } from "../../ui.js";
import { screen, field } from "../shell.js";
import { token } from "../../auth.js";
import { api } from "../../api.js";
import { loadMine, upsert, remove, newId } from "../../store.js";
import { CONFIG } from "../../config.js";
import { todayIso, cyclePeriod, inRange } from "../../business/dates.js";
import { FRAIS_CATEGORIES, htFromTtc, tvaFromTtc, eur } from "../../business/frais.js";

export async function fraisView() {
  const store = await loadMine();
  const { start, end } = cyclePeriod(new Date(), CONFIG.DEFAULT_CYCLE_START_DAY);

  const list = h("div", {});
  function renderList() {
    list.innerHTML = "";
    const items = store.frais.filter((e) => inRange(e.date, start, end));
    if (!items.length) { list.append(h("div", { class: "muted-empty" }, "Aucun ticket ce cycle")); return; }
    let ttc = 0, tva = 0;
    for (const t of items) {
      ttc += t.montantEur; tva += tvaFromTtc(t.montantEur, t.categorie);
      list.append(h("div", { class: "statrow" },
        h("span", { class: "k" }, `${t.categorie} · ${t.date}`),
        h("span", { style: "display:flex;gap:10px;align-items:center" },
          h("span", { class: "v" }, eur(t.montantEur)),
          h("button", { class: "icon-btn", style: "width:30px;height:30px",
            onclick: async () => { await remove("frais", t.id); renderList(); } }, "✕"))));
    }
    list.append(
      h("div", { class: "statrow" }, h("span", { class: "k" }, "TVA"), h("span", { class: "v" }, eur(tva))),
      h("div", { class: "statrow" }, h("span", { class: "k" }, "HT"), h("span", { class: "v" }, eur(ttc - tva))),
      h("div", { class: "statrow" }, h("span", { class: "k", style: "color:var(--frais-accent)" }, "TOTAL TTC"),
        h("span", { class: "v", style: "color:var(--frais-accent)" }, eur(ttc))));
  }

  const cat = h("select", {}, ...FRAIS_CATEGORIES.map((c) => h("option", { value: c }, c)));
  const montant = h("input", { type: "number", step: "0.01", min: "0", inputmode: "decimal", placeholder: "TTC €" });
  const dateI = h("input", { type: "date", value: todayIso() });
  const calc = h("p", { class: "text-low", style: "font-size:12px;margin:4px 0 0" });
  montant.addEventListener("input", () => {
    const v = +montant.value || 0;
    calc.textContent = v ? `HT ${eur(htFromTtc(v, cat.value))} · TVA ${eur(tvaFromTtc(v, cat.value))}` : "";
  });

  const add = async () => {
    const v = +montant.value || 0;
    if (!v) return toast("Montant TTC requis.");
    const t = { id: newId(), date: dateI.value, categorie: cat.value, montantEur: v };
    await upsert("frais", t);
    montant.value = ""; calc.textContent = ""; renderList();
    toast("Ticket ajouté");
  };

  const sendGroup = async () => {
    try { overlay(true);
      await api("send", { type: "email", channel: "frais", payload: {} }, token());
      overlay(false); toast("Frais envoyés (groupe)");
    } catch (e) { overlay(false); toast(e.message); }
  };

  renderList();

  return screen("FRAIS", "var(--frais-start)", [
    h("div", { class: "card accent" },
      h("h3", {}, "Nouveau ticket"),
      h("div", { class: "row" }, field("Catégorie", cat), field("Date", dateI)),
      field("Montant TTC", montant), calc,
      h("button", { class: "btn sm", style: "margin-top:10px", onclick: add }, "+ Ajouter le ticket")),
    h("div", { class: "card" }, h("h3", {}, "Tickets du cycle"), list),
    h("button", { class: "btn", onclick: sendGroup }, "Envoyer les frais (groupe)"),
  ]);
}

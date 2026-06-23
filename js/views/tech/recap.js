import { h, toast, overlay } from "../../ui.js";
import { screen } from "../shell.js";
import { token } from "../../auth.js";
import { api } from "../../api.js";
import { loadMine } from "../../store.js";
import { CONFIG } from "../../config.js";
import { periodForOffset } from "../stats.js";
import { recapPanel } from "../stats.js";
import { fr } from "../../business/dates.js";

export async function recapView() {
  const store = await loadMine();

  const send = async () => {
    try {
      overlay(true);
      const { start, end } = periodForOffset(0);
      await api("send", { type: "email", channel: "recap", payload: { start: fr(start), end: fr(end) } }, token());
      overlay(false); toast("Récap PDF envoyé");
    } catch (e) { overlay(false); toast(e.message); }
  };

  return screen("RÉCAP", "var(--recap-start)", [
    h("p", { class: "text-low", style: "font-size:12px;margin:0 0 4px" },
      "Utilise ‹ › pour consulter les mois précédents."),
    recapPanel(store),
    h("button", { class: "btn", onclick: send }, "Envoyer le récap du cycle (PDF)"),
  ]);
}

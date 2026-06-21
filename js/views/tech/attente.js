import { h, toast, overlay } from "../../ui.js";
import { screen } from "../_shell.js";
import { navigate } from "../../router.js";
import { api } from "../../api.js";
import { token } from "../../auth.js";
import { attenteClientMessage, ATTENTE_RAPPEL_TECH } from "../../business/messages.js";

export function attenteView() {
  overlay(false);
  const msg = attenteClientMessage();

  const send = async () => {
    try {
      overlay(true);
      await api("send", { type: "viber", channel: "attente", message: msg }, token());
      overlay(false);
      toast("Attente client envoyée · " + msg);
      navigate("/home");
    } catch (e) { overlay(false); toast(e.message); }
  };

  return screen("ATTENTE CLIENT", "var(--attente-start)", [
    h("div", { class: "banner amber" }, ATTENTE_RAPPEL_TECH),
    h("div", { class: "card accent" },
      h("h3", {}, "Message Viber"),
      h("p", { class: "mono", style: "color:var(--text-mid)" }, msg),
      h("p", { class: "text-low", style: "font-size:12px" },
        "L'heure de début est figée à l'instant. Le message part automatiquement côté serveur.")),
    h("button", { class: "btn", onclick: send }, "Envoyer l'attente client"),
  ]);
}

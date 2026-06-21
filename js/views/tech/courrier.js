import { h, toast, overlay } from "../../ui.js";
import { screen } from "../_shell.js";
import { navigate } from "../../router.js";
import { api } from "../../api.js";
import { token } from "../../auth.js";
import { COURRIER_MESSAGE } from "../../business/messages.js";

export function courrierView() {
  overlay(false);
  const send = async () => {
    try {
      overlay(true);
      await api("send", { type: "viber", channel: "courrier", message: COURRIER_MESSAGE }, token());
      overlay(false);
      toast("Courrier OK envoyé");
      navigate("/home");
    } catch (e) { overlay(false); toast(e.message); }
  };

  return screen("COURRIER", "var(--courrier-start)", [
    h("div", { class: "card accent" },
      h("h3", {}, "Viber « courrier ok »"),
      h("p", { class: "text-mid" }, "Un appui envoie le message « courrier ok » au groupe.")),
    h("button", { class: "btn", onclick: send }, "Envoyer « courrier ok »"),
  ]);
}

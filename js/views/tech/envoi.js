import { h, toast, overlay } from "../../ui.js";
import { screen } from "../_shell.js";
import { token } from "../../auth.js";
import { api } from "../../api.js";
import { loadMine, upsert, newId } from "../../store.js";
import { CONFIG } from "../../config.js";
import { todayIso, cyclePeriod, fr, inRange } from "../../business/dates.js";

export async function envoiView() {
  const store = await loadMine();
  const { start, end } = cyclePeriod(new Date(), CONFIG.DEFAULT_CYCLE_START_DAY);
  let hasPhoto = store.compteur.some((c) => inRange(c.date, start, end));

  const banner = h("div", {});
  const sendBtn = h("button", { class: "btn" }, "Remplir Excel + envoyer le mensuel");
  const preview = h("div", { class: "card", style: "display:none" });

  function refresh() {
    banner.innerHTML = "";
    if (!hasPhoto) {
      banner.append(h("div", { class: "banner red" },
        "⛔ Envoi bloqué : aucune photo compteur sur la période. Capture-la d'abord."));
      sendBtn.disabled = true;
    } else {
      banner.append(h("div", { class: "banner green" }, "✓ Photo compteur présente — envoi possible."));
      sendBtn.disabled = false;
    }
  }

  // capture inline (caméra). En PWA, <input capture> ouvre l'appareil photo.
  const photoInput = h("input", { type: "file", accept: "image/*", capture: "environment", style: "display:none" });
  photoInput.addEventListener("change", async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    const c = { id: newId(), date: todayIso(), photo: dataUrl, name: file.name };
    await upsert("compteur", c);
    hasPhoto = true;
    preview.style.display = "";
    preview.innerHTML = "";
    preview.append(h("h3", {}, "Photo compteur"),
      h("img", { src: dataUrl, style: "width:100%;border-radius:10px" }));
    refresh();
    toast("Photo compteur enregistrée");
  });

  const send = async () => {
    try { overlay(true);
      await api("send", { type: "email", channel: "mensuel", payload: { start: fr(start), end: fr(end) } }, token());
      overlay(false); toast("Mensuel envoyé (Excel + tickets + compteur + récap)");
    } catch (e) { overlay(false); toast(e.message); }
  };
  sendBtn.addEventListener("click", send);

  refresh();

  return screen("ENVOI MENSUEL", "var(--envoi-start)", [
    h("div", { class: "banner", style: "background:var(--obsidian-1);border:1px solid var(--hairline)" },
      `Cycle ${fr(start)} → ${fr(end)}`),
    banner,
    h("div", { class: "card accent" },
      h("h3", {}, "Photo compteur (obligatoire)"),
      h("p", { class: "text-mid", style: "font-size:13px" },
        "Renommée automatiquement à l'envoi : <PLAQUE>-MM-AAAA.jpg"),
      h("button", { class: "btn sm", onclick: () => photoInput.click() }, "📷 Prendre la photo compteur"),
      photoInput),
    preview,
    sendBtn,
  ]);
}

function fileToDataUrl(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file);
  });
}

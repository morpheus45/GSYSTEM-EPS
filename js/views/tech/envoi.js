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

  // fichiers déjà déposés (Excel annuel)
  let files = [];
  try { files = await api("listFiles", {}, token()); } catch {}
  let excel = files.find((f) => f.kind === "excel_template");

  const banner = h("div", {});
  const sendBtn = h("button", { class: "btn" }, "Envoyer le mensuel (+ archive)");
  const preview = h("div", { class: "card", style: "display:none" });
  const excelStatus = h("div", {});

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
    excelStatus.innerHTML = "";
    if (excel) {
      excelStatus.append(h("div", { class: "banner green" },
        "✓ Excel de l'année déposé : " + excel.filename));
    } else {
      excelStatus.append(h("div", { class: "banner amber" },
        "À faire 1×/an : dépose ton fichier Excel. Le serveur le garde et l'archive chaque mois."));
    }
  }

  // --- dépôt Excel annuel ---
  const excelInput = h("input", { type: "file",
    accept: ".xlsm,.xlsx,application/vnd.ms-excel.sheet.macroEnabled.12", style: "display:none" });
  excelInput.addEventListener("change", async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      overlay(true);
      const base64 = await fileToBase64(file);
      const r = await api("uploadFile", { kind: "excel_template", filename: file.name,
        base64, mimeType: file.type, size: file.size }, token());
      excel = { kind: "excel_template", filename: r.filename, url: r.url };
      overlay(false); refresh();
      toast("Excel déposé sur le serveur (" + file.name + ")");
    } catch (err) { overlay(false); toast(err.message); }
  });

  // --- photo compteur ---
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
      const r = await api("send", { type: "email", channel: "mensuel",
        payload: { start: fr(start), end: fr(end) } }, token());
      overlay(false);
      toast("Mensuel envoyé" + (r && r.message ? r.message : ""));
    } catch (e) { overlay(false); toast(e.message); }
  };
  sendBtn.addEventListener("click", send);

  refresh();

  return screen("ENVOI MENSUEL", "var(--envoi-start)", [
    h("div", { class: "banner", style: "background:var(--obsidian-1);border:1px solid var(--hairline)" },
      `Cycle ${fr(start)} → ${fr(end)}`),
    h("div", { class: "card accent" },
      h("h3", {}, "Mon Excel (1×/an)"),
      h("p", { class: "text-mid", style: "font-size:13px" },
        "Ton fichier Excel personnel : déposé une fois, gardé sur le serveur, " +
        "rempli au fil de l'eau et archivé chaque mois pour vérification."),
      excelStatus,
      h("button", { class: "btn sm", onclick: () => excelInput.click() },
        excel ? "Remplacer mon Excel" : "📄 Déposer mon Excel"),
      excelInput),
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
function fileToBase64(file) {
  return fileToDataUrl(file).then((d) => d.split(",")[1]);
}

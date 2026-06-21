import { h, toast, overlay } from "../../ui.js";
import { screen, field } from "../_shell.js";
import { navigate } from "../../router.js";
import { token } from "../../auth.js";
import { api } from "../../api.js";
import { upsert, newId } from "../../store.js";
import { todayIso } from "../../business/dates.js";
import { MISSION_TYPES, OBSERVATION_LABELS, buildViberMessage } from "../../business/messages.js";
import { GESTE_TYPES, DEFAULT_PRIMES, DEFAULT_GIFTS, totalPrime, validateGift } from "../../business/gesteco.js";

export function clotureView() {
  overlay(false);

  // --- état ---
  const st = {
    date: todayIso(), typeMission: "INST", departement: "", nomClient: "", ville: "",
    numeroSite: "", numeroIntervention: "", slotMidi: "MATIN", observationType: "",
    installed: {}, offered: {}, epsDerogation: false,
    gsm: false, cplDejaPresent: false, gsmInstalle: false,
  };
  for (const t of GESTE_TYPES) { st.installed[t] = 0; st.offered[t] = 0; }

  // --- champs intervention ---
  const inp = (key, attrs = {}) => h("input", {
    value: st[key], ...attrs, oninput: (e) => { st[key] = e.target.value; refresh(); },
  });

  const typeSel = h("select", { onchange: (e) => { st.typeMission = e.target.value; refresh(); } },
    ...MISSION_TYPES.map((t) => h("option", { value: t, selected: t === st.typeMission }, t)));
  const obsSel = h("select", { onchange: (e) => { st.observationType = e.target.value; refresh(); } },
    ...OBSERVATION_LABELS.map(([v, l]) => h("option", { value: v }, l)));

  const slotSel = h("select", { onchange: (e) => { st.slotMidi = e.target.value; } },
    h("option", { value: "MATIN" }, "Matin"), h("option", { value: "APREM" }, "Après-midi"));

  // --- GESTE CO (table 12 types) — visible pour INST ---
  const gesteWrap = h("div", { class: "card accent" });
  // --- GSM seul (toggles) ---
  const gsmWrap = h("div", { class: "card accent" });

  const giftInfo = h("div", { class: "banner", style: "margin-top:8px" });
  const primeInfo = h("div", { class: "statrow" }, h("span", { class: "k" }, "Prime interne"), h("span", { class: "v" }));

  function buildGeste() {
    gesteWrap.innerHTML = "";
    gesteWrap.append(h("h3", {}, "GESTE CO — extensions installées / offertes"));
    const grid = h("div", {});
    for (const t of GESTE_TYPES) {
      const instI = h("input", { type: "number", min: "0", value: st.installed[t], inputmode: "numeric",
        oninput: (e) => { st.installed[t] = +e.target.value || 0; refresh(); } });
      const offI = h("input", { type: "number", min: "0", value: st.offered[t], inputmode: "numeric",
        oninput: (e) => { st.offered[t] = +e.target.value || 0; refresh(); } });
      grid.append(h("div", { class: "row", style: "align-items:center;margin-bottom:8px" },
        h("div", { class: "t-label", style: "flex:0 0 78px;color:var(--geste-accent)" }, t),
        h("label", { class: "field", style: "margin:0;flex:1" }, h("span", { class: "lab" }, "Inst."), instI),
        h("label", { class: "field", style: "margin:0;flex:1" }, h("span", { class: "lab" }, "Offert"), offI)));
    }
    gesteWrap.append(grid);
    gesteWrap.append(
      h("label", { class: "toggle" }, h("span", {}, "Dérogation EPS (plafond cadeau)"),
        switchEl(st.epsDerogation, (v) => { st.epsDerogation = v; refresh(); })),
      primeInfo, giftInfo);
  }

  function buildGsm() {
    gsmWrap.innerHTML = "";
    gsmWrap.append(h("h3", {}, "GSM seul"),
      h("label", { class: "toggle" }, h("span", {}, "GSM installé"), switchEl(st.gsmInstalle, (v) => st.gsmInstalle = v)),
      h("label", { class: "toggle" }, h("span", {}, "CPL déjà présent"), switchEl(st.cplDejaPresent, (v) => st.cplDejaPresent = v)),
      h("label", { class: "toggle" }, h("span", {}, "Inclure un envoi GSM SEUL"), switchEl(st.gsm, (v) => st.gsm = v)));
  }

  function refresh() {
    const isInst = st.typeMission === "INST";
    gesteWrap.style.display = isInst ? "" : "none";
    gsmWrap.style.display = isInst ? "" : "none";
    siteField.style.display = isInst ? "" : "none";

    const prime = totalPrime(st.installed, DEFAULT_PRIMES);
    primeInfo.querySelector(".v").textContent = prime.toFixed(2).replace(".", ",") + " €";
    const g = validateGift(st.installed, st.offered, DEFAULT_GIFTS, st.epsDerogation);
    giftInfo.className = "banner " + (g.ok ? "green" : "red");
    giftInfo.textContent = g.ok
      ? `Cadeau client : ${g.total.toFixed(2).replace(".", ",")} € — OK`
      : `Cadeau client : ${g.total.toFixed(2).replace(".", ",")} € — ${!g.capOk ? "dépasse 4,50 €" : "offertes > moitié des installées"}`;
  }

  const siteField = field("N° de site", inp("numeroSite", { placeholder: "ex. S-204" }), { req: true });

  // --- enregistrement ---
  const save = async () => {
    if (!st.numeroIntervention.trim()) return toast("N° d'intervention obligatoire.");
    if (st.typeMission === "INST" && !st.numeroSite.trim()) return toast("N° de site obligatoire pour une INST.");
    if (st.typeMission === "INST") {
      const g = validateGift(st.installed, st.offered, DEFAULT_GIFTS, st.epsDerogation);
      if (!g.ok) return toast("Règle cadeau non respectée (voir bandeau).");
    }
    const entry = {
      id: newId(), date: st.date, typeMission: st.typeMission, departement: st.departement,
      nomClient: st.nomClient, ville: st.ville, numeroSite: st.numeroSite,
      numeroIntervention: st.numeroIntervention, slotMidi: st.slotMidi, observationType: st.observationType,
    };
    try {
      overlay(true);
      await upsert("temps", entry);
      // Viber (auto serveur)
      await api("send", { type: "viber", channel: "temps", message: buildViberMessage(entry) }, token());
      // GESTE CO / GSM → entrées + envois EPS
      if (st.typeMission === "INST") {
        const installedAny = GESTE_TYPES.some((t) => st.installed[t] > 0);
        if (installedAny) {
          const ge = { id: newId(), date: st.date, numeroSite: st.numeroSite, tempsId: entry.id,
            installed: { ...st.installed }, offered: { ...st.offered }, epsDerogation: st.epsDerogation };
          await upsert("gesteCo", ge);
          await api("send", { type: "email", channel: "eps_gesteco", payload: ge }, token());
        }
        if (st.gsm) {
          await api("send", { type: "email", channel: "eps_gsm",
            payload: { numeroSite: st.numeroSite, gsmInstalle: st.gsmInstalle, cplDejaPresent: st.cplDejaPresent } }, token());
        }
      }
      overlay(false);
      toast("Clôture enregistrée · envois EPS déclenchés");
      navigate("/home");
    } catch (e) { overlay(false); toast(e.message); }
  };

  buildGeste(); buildGsm(); refresh();

  return screen("CLÔTURE", "var(--temps-start)", [
    h("div", { class: "card accent" },
      h("div", { class: "row" },
        field("Date", inp("date", { type: "date" })),
        field("Créneau", slotSel)),
      field("Type d'intervention", typeSel, { req: true }),
      h("div", { class: "row" },
        field("Département", inp("departement", { placeholder: "34" })),
        field("Observation", obsSel)),
      field("Client", inp("nomClient", { placeholder: "nom client" })),
      field("Ville", inp("ville", { placeholder: "ville" })),
      siteField,
      field("N° d'intervention", inp("numeroIntervention", { placeholder: "ex. 43001714" }), { req: true })),
    gesteWrap,
    gsmWrap,
    h("button", { class: "btn", onclick: save }, "Clôturer & envoyer (EPS)"),
    h("button", { class: "btn ghost", style: "margin-top:8px", onclick: () => navigate("/home") }, "Annuler"),
  ]);
}

function switchEl(checked, onChange) {
  const input = h("input", { type: "checkbox", onchange: (e) => onChange(e.target.checked) });
  if (checked) input.checked = true;
  return h("span", { class: "switch" }, input, h("span", { class: "slider" }));
}

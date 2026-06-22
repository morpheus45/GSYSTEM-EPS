import { h, toast, overlay } from "../../ui.js";
import { screen, field } from "../_shell.js";
import { navigate } from "../../router.js";
import { api } from "../../api.js";
import { token } from "../../auth.js";

// Création / édition d'un accès (admin). À la création d'un tech, le backend
// crée un VRAI dossier Drive à son nom.
export async function userFormView(userId) {
  const editing = !!userId;
  const { users } = await api("tree", {}, token());
  const u = editing ? users.find((x) => x.id === userId) : null;
  const resps = users.filter((x) => x.role === "responsable");

  const name = h("input", { value: u?.name || "", placeholder: "Prénom Nom", required: true });
  const email = h("input", { type: "email", value: u?.email || "", placeholder: "email@gsystem.fr", required: true });
  const pass = h("input", { type: "text", placeholder: editing ? "(laisser vide = inchangé)" : "mot de passe" });
  const codeTech = h("input", { value: u?.codeTech || "", placeholder: "ISTGSxx" });

  const role = h("select", {},
    h("option", { value: "tech", selected: !u || u.role === "tech" }, "Technicien"),
    h("option", { value: "responsable", selected: u?.role === "responsable" }, "Responsable"),
    h("option", { value: "admin", selected: u?.role === "admin" }, "Admin"));

  const respSel = h("select", {},
    h("option", { value: "" }, "— aucun —"),
    ...resps.map((r) => h("option", { value: r.id, selected: u?.responsableId === r.id }, r.name)));

  const respField = field("Responsable", respSel);
  const codeField = field("Code tech", codeTech);
  const toggleRoleFields = () => {
    const isTech = role.value === "tech";
    respField.style.display = isTech ? "" : "none";
    codeField.style.display = isTech ? "" : "none";
  };
  role.addEventListener("change", toggleRoleFields);

  const submit = async () => {
    if (!name.value.trim() || !email.value.trim()) return toast("Nom et email obligatoires.");
    if (!editing && !pass.value) return toast("Mot de passe obligatoire à la création.");
    try {
      overlay(true);
      if (editing) {
        const patch = { name: name.value.trim(), email: email.value.trim(), role: role.value,
          responsableId: respSel.value || null, codeTech: codeTech.value.trim() };
        if (pass.value) patch.password = pass.value;
        await api("updateUser", { id: userId, patch }, token());
        toast("Compte mis à jour");
      } else {
        const created = await api("createUser", {
          name: name.value.trim(), email: email.value.trim(), password: pass.value,
          role: role.value, responsableId: respSel.value || null, codeTech: codeTech.value.trim(),
        }, token());
        toast("Accès créé · dossier Drive : " + (created.driveUrl || "créé"));
      }
      overlay(false);
      navigate("/admin");
    } catch (e) { overlay(false); toast(e.message); }
  };

  const node = screen(editing ? "MODIFIER L'ACCÈS" : "CRÉER UN ACCÈS", "var(--admin-start)", [
    h("div", { class: "card accent" },
      field("Nom complet", name, { req: true }),
      field("Email (identifiant)", email, { req: true }),
      field("Mot de passe", pass, { req: !editing }),
      field("Rôle", role, { req: true }),
      respField, codeField),
    h("div", { class: "banner amber" },
      "Mot de passe initial : au moins 12 caractères (majuscule, minuscule, chiffre, spécial). "
      + "L'utilisateur devra le changer à sa première connexion. À la création d'un technicien, "
      + "un dossier Drive à son nom est créé automatiquement."),
    h("button", { class: "btn", onclick: submit }, editing ? "Enregistrer" : "Créer l'accès + dossier Drive"),
  ], { back: "/admin" });

  toggleRoleFields();
  return node;
}

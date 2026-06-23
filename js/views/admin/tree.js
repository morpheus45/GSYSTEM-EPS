import { h, icon, initials, avatarColor, overlay } from "../../ui.js";
import { currentUser, logout } from "../../auth.js";
import { navigate } from "../../router.js";
import { api } from "../../api.js";
import { token } from "../../auth.js";
import { getView, setView, viewBanner } from "../../impersonate.js";

const ROLE_LABEL = { admin: "Super admin", direction: "Direction", responsable: "Responsable", tech: "Technicien" };

export async function adminTreeView() {
  const me = currentUser();
  const view = getView();                         // aperçu actif ?
  const eff = view ? { role: view.role, id: view.id, name: view.name } : me; // viewer effectif
  const isSuper = me.role === "admin" && !view;   // vrai super admin (hors aperçu)
  const canManage = (me.role === "admin" || me.role === "direction") && !view;

  const { users } = await api("tree", {}, token());

  const admins = users.filter((u) => u.role === "admin" || u.role === "direction");
  let resps = users.filter((u) => u.role === "responsable");
  const techs = users.filter((u) => u.role === "tech");
  const activeTechs = techs.filter((t) => t.status !== "inactive");
  const inactiveTechs = techs.filter((t) => t.status === "inactive");
  const techsOf = (rid) => activeTechs.filter((t) => t.responsableId === rid);
  const orphanTechs = activeTechs.filter((t) => !t.responsableId || !resps.some((r) => r.id === t.responsableId));

  // En aperçu RESPONSABLE : on ne montre que son équipe
  if (eff.role === "responsable") resps = resps.filter((r) => r.id === eff.id);

  const screen = h("div", { class: "screen" });

  const banner = viewBanner(() => navigate("/admin"));
  if (banner) screen.append(banner);

  // top bar
  screen.append(
    h("div", { class: "statusbar" },
      h("div", { class: "live-ref" }, h("span", { class: "live-dot" }),
        h("span", { class: "ref t-label-m" }, (ROLE_LABEL[eff.role] || eff.role).toUpperCase() + " · " + (view ? eff.name : me.name))),
      h("div", { style: "display:flex;gap:8px" },
        h("button", { class: "icon-btn", title: "Mon app tech", onclick: () => navigate("/home") }, icon("assignment", 18)),
        h("button", { class: "icon-btn", title: "Tableau de bord", onclick: () => navigate("/admin/dashboard") }, icon("speed", 18)),
        h("button", { class: "icon-btn", title: "Déconnexion", onclick: () => { logout(); navigate("/login"); } }, icon("logout", 18)))),
    h("hr", { class: "hairline" }),
    h("div", { class: "home-header", style: "padding-bottom:8px" },
      h("div", { class: "wordmark t-display-m" }, "ORGANISATION"),
      h("div", { class: "identity" }, h("span", { class: "pip" }),
        h("span", { class: "who t-label-m" },
          eff.role === "responsable"
            ? `${techsOf(eff.id).length} techs dans l'équipe`
            : `${admins.length} admin · ${resps.length} responsables · ${activeTechs.length} techs`
              + (inactiveTechs.length ? ` · ${inactiveTechs.length} inactifs` : ""))))
  );

  const body = h("div", { class: "screen-body" });

  if (eff.role === "admin") {
    body.append(section("Direction", admins.map((u) => leaf(u))));
  }

  body.append(h("div", { class: "section-title" }, "Équipes"));
  for (const r of resps) body.append(branch(r, techsOf(r.id)));
  if (orphanTechs.length && eff.role === "admin") {
    body.append(section("Techniciens sans responsable", orphanTechs.map((u) => leaf(u))));
  }
  if (inactiveTechs.length && eff.role === "admin") {
    body.append(section("Techniciens inactifs · plus là", inactiveTechs.map((u) => leaf(u, true))));
  }
  body.append(h("a", { href: "#/privacy", class: "tag",
    style: "display:block;text-align:center;margin:18px 0 8px;color:var(--text-low);text-decoration:underline" },
    "Confidentialité & RGPD"));

  screen.append(body);

  if (canManage) {
    screen.append(h("div", { class: "fab" },
      h("button", { class: "btn", onclick: () => navigate("/admin/new") }, icon("add", 18), "Créer un accès")));
  }

  // --- bouton « voir comme » (super admin seulement, hors aperçu) ---
  function previewBtn(u, role) {
    return h("button", { class: "icon-btn", style: "width:30px;height:30px", title: "Voir comme " + u.name,
      onclick: (e) => {
        e.stopPropagation();
        setView({ id: u.id, role, name: u.name });
        if (role === "tech") navigate("/home"); else location.reload();
      } }, "👁");
  }

  function section(title, nodes) {
    return h("div", {}, h("div", { class: "section-title" }, title), ...nodes);
  }

  function leaf(u, inactive) {
    const kids = [
      avatar(u),
      h("div", { class: "meta" }, h("div", { class: "nm" }, u.name), h("div", { class: "sub" }, u.email)),
      inactive ? h("span", { class: "badge", style: "color:var(--text-low)" }, "Inactif")
               : h("span", { class: "badge role-" + u.role }, ROLE_LABEL[u.role]),
    ];
    if (isSuper && u.role === "tech" && !inactive) kids.push(previewBtn(u, "tech"));
    kids.push(h("span", { class: "chev" }, icon("chevron", 18)));
    return h("div", { class: "node", style: inactive ? "opacity:.55" : "" },
      h("div", { class: "node-head", onclick: () => navigate("/admin/user/" + u.id) }, ...kids));
  }

  function branch(r, children) {
    const node = h("div", { class: "node" });
    const headKids = [
      avatar(r),
      h("div", { class: "meta", onclick: () => navigate("/admin/user/" + r.id) },
        h("div", { class: "nm" }, r.name),
        h("div", { class: "sub" }, `${children.length} tech${children.length > 1 ? "s" : ""}`)),
      h("span", { class: "badge role-responsable" }, "Responsable"),
    ];
    if (isSuper) headKids.push(previewBtn(r, "responsable"));
    headKids.push(h("span", { class: "chev" }, icon("chevron", 18)));
    const head = h("div", { class: "node-head" }, ...headKids);
    head.addEventListener("click", (e) => {
      if (e.target.closest(".meta") || e.target.closest("button")) return;
      node.classList.toggle("open");
    });
    const kidsBox = h("div", { class: "node-children" },
      children.length ? children.map((t) => leaf(t)) : h("div", { class: "muted-empty" }, "Aucun tech"));
    node.append(head, kidsBox);
    node.classList.add("open");
    return node;
  }

  function avatar(u) {
    return h("div", { class: "avatar", style: `background:${avatarColor(u.name)}` }, initials(u.name));
  }

  overlay(false);
  return screen;
}

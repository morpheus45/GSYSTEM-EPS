import { h, icon, initials, avatarColor, toast, overlay } from "../../ui.js";
import { currentUser, logout } from "../../auth.js";
import { navigate } from "../../router.js";
import { api } from "../../api.js";
import { token } from "../../auth.js";

const ROLE_LABEL = { admin: "Super admin", direction: "Direction", responsable: "Responsable", tech: "Technicien" };

export async function adminTreeView() {
  const me = currentUser();
  const { users } = await api("tree", {}, token());

  const admins = users.filter((u) => u.role === "admin" || u.role === "direction");
  const resps = users.filter((u) => u.role === "responsable");
  const techs = users.filter((u) => u.role === "tech");
  const activeTechs = techs.filter((t) => t.status !== "inactive");
  const inactiveTechs = techs.filter((t) => t.status === "inactive");
  const techsOf = (rid) => activeTechs.filter((t) => t.responsableId === rid);
  const orphanTechs = activeTechs.filter((t) => !t.responsableId || !resps.some((r) => r.id === t.responsableId));

  const screen = h("div", { class: "screen" });

  // top bar
  screen.append(
    h("div", { class: "statusbar" },
      h("div", { class: "live-ref" }, h("span", { class: "live-dot" }),
        h("span", { class: "ref t-label-m" }, (ROLE_LABEL[me.role] || me.role).toUpperCase() + " · " + me.name)),
      h("div", { style: "display:flex;gap:8px" },
        h("button", { class: "icon-btn", title: "Mon app tech", onclick: () => navigate("/home") }, icon("assignment", 18)),
        h("button", { class: "icon-btn", title: "Tableau de bord", onclick: () => navigate("/admin/dashboard") }, icon("speed", 18)),
        h("button", { class: "icon-btn", title: "Déconnexion", onclick: () => { logout(); navigate("/login"); } }, icon("logout", 18)))),
    h("hr", { class: "hairline" }),
    h("div", { class: "home-header", style: "padding-bottom:8px" },
      h("div", { class: "wordmark t-display-m" }, "ORGANISATION"),
      h("div", { class: "identity" }, h("span", { class: "pip" }),
        h("span", { class: "who t-label-m" },
          `${admins.length} admin · ${resps.length} responsables · ${activeTechs.length} techs`
          + (inactiveTechs.length ? ` · ${inactiveTechs.length} inactifs` : ""))))
  );

  const body = h("div", { class: "screen-body" });

  if (me.role === "admin") {
    body.append(section("Direction", admins.map((u) => leaf(u))));
  }

  body.append(h("div", { class: "section-title" }, "Équipes"));
  for (const r of resps) {
    body.append(branch(r, techsOf(r.id)));
  }
  if (!resps.length && me.role === "responsable") {
    // un responsable voit directement son équipe
    body.append(...techsOf(me.id).map((t) => leaf(t)));
  }
  if (orphanTechs.length && me.role === "admin") {
    body.append(section("Techniciens sans responsable", orphanTechs.map((u) => leaf(u))));
  }
  if (inactiveTechs.length) {
    body.append(section("Techniciens inactifs · plus là", inactiveTechs.map((u) => leaf(u, true))));
  }
  body.append(h("a", { href: "#/privacy", class: "tag",
    style: "display:block;text-align:center;margin:18px 0 8px;color:var(--text-low);text-decoration:underline" },
    "Confidentialité & RGPD"));

  screen.append(body);

  // bouton créer (Super admin + Direction)
  if (me.role === "admin" || me.role === "direction") {
    screen.append(h("div", { class: "fab" },
      h("button", { class: "btn", onclick: () => navigate("/admin/new") },
        icon("add", 18), "Créer un accès")));
  }

  function section(title, nodes) {
    return h("div", {}, h("div", { class: "section-title" }, title), ...nodes);
  }

  function leaf(u, inactive) {
    return h("div", { class: "node", style: inactive ? "opacity:.55" : "" },
      h("div", { class: "node-head", onclick: () => navigate("/admin/user/" + u.id) },
        avatar(u),
        h("div", { class: "meta" }, h("div", { class: "nm" }, u.name),
          h("div", { class: "sub" }, u.email)),
        inactive
          ? h("span", { class: "badge", style: "color:var(--text-low)" }, "Inactif")
          : h("span", { class: "badge role-" + u.role }, ROLE_LABEL[u.role]),
        h("span", { class: "chev" }, icon("chevron", 18))));
  }

  function branch(r, children) {
    const node = h("div", { class: "node" });
    const head = h("div", { class: "node-head" },
      avatar(r),
      h("div", { class: "meta", onclick: () => navigate("/admin/user/" + r.id) },
        h("div", { class: "nm" }, r.name),
        h("div", { class: "sub" }, `${children.length} tech${children.length > 1 ? "s" : ""}`)),
      h("span", { class: "badge role-responsable" }, "Responsable"),
      h("span", { class: "chev" }, icon("chevron", 18)));
    head.addEventListener("click", (e) => {
      if (e.target.closest(".meta")) return; // clic sur le nom → détail
      node.classList.toggle("open");
    });
    const kids = h("div", { class: "node-children" },
      children.length ? children.map((t) => leaf(t)) : h("div", { class: "muted-empty" }, "Aucun tech"));
    node.append(head, kids);
    node.classList.add("open");
    return node;
  }

  function avatar(u) {
    return h("div", { class: "avatar", style: `background:${avatarColor(u.name)}` }, initials(u.name));
  }

  overlay(false);
  return screen;
}

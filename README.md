# G-SYSTEMS — PWA (tech + responsable + admin)

Application **PWA installable sur Android et iPhone** pour G-Systems (sécurité
électronique), avec **panneau d'administration** et **gestion des accès par
arbre hiérarchique** (admin → responsable → technicien).

- Côté **technicien** : reprise **visuellement identique** de l'app Android native
  (thème « Mission Control », 6 tuiles, police Tektur). Voir l'app d'origine :
  <https://github.com/morpheus45/gsystem>.
- Côté **admin** : création des comptes (chaque tech = email + mot de passe +
  **dossier Drive créé automatiquement**), arbre de l'organisation, et
  **tableau de bord « au fil de l'eau »** qui agrège toutes les remontées.
- 100 % Google : pas de serveur à louer. Le backend est un
  **Google Apps Script** ([`backend/Code.gs`](backend/Code.gs)) qui tourne sous
  ton compte (accès Drive + Gmail).

## Démarrage

➡ **Suis [`SETUP.md`](SETUP.md)** (≈ 15 min, zéro code à écrire).

En attendant le déploiement, l'app fonctionne en **mode démo** (données factices) :
ouvre `index.html` via un serveur statique et connecte-toi avec
`admin@gsystem.fr` / `admin` (ou `resp@`, `tech@` — mdp = avant le `@`).

## Architecture

```
PWA statique (GitHub Pages)            Backend (Google Apps Script)
  index.html / sw.js / manifest          Code.gs
  css/  theme.css (Mission Control)        ├─ comptes + rôles + arbre
  js/                                      ├─ dossiers Drive par tech
   ├─ business/  (heures, TVA, geste co)   ├─ stockage (Google Sheet)
   ├─ views/tech (6 écrans, identiques)    ├─ envois mail GS/EPS (Gmail)
   ├─ views/admin (arbre, dashboard)       └─ journal Viber
   └─ api.js  ←──── HTTPS JSON ────────►  doPost(action, params, token)
```

## Rôles

| Rôle | Accès |
|------|-------|
| **Technicien** | son app uniquement (clôtures, frais, envois), ses données |
| **Responsable** | son équipe : ses techs, leurs remontées, le tableau de bord équipe |
| **Admin** | tout : arbre complet, création/édition/suppression des accès, dashboard global |

## Mode démo vs live

`js/config.js` → `BACKEND_URL` vide = **démo** ; rempli = **live** (backend Google).

## Crédits

Reprise de l'app G-Systems native (Kotlin/Compose) de morpheus45. Le visuel
technicien reproduit fidèlement le thème d'origine (cf. `HANDOFF.md` du repo source).

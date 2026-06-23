# G-SYSTEMS — Document de transmission (HANDOFF)

> Snapshot pour reprendre le projet rapidement. PWA de gestion d'équipe terrain
> (sécurité électronique) : technicien + responsable + direction + super admin.

## 1. Vue d'ensemble

- **App en ligne** : <https://morpheus45.github.io/GSYSTEM-EPS/> (GitHub Pages, statique)
- **Backend** : Google Apps Script (Web App `/exec`) — 100 % Google, gratuit, sans serveur à louer.
- **Repo** : <https://github.com/morpheus45/GSYSTEM-EPS>
- **Origine** : reprise web de l'app Android native `morpheus45/gsystem` (même métier,
  thème « Mission Control » identique : rouge `#ee2322`, fond sombre, police Tektur).

```
PWA statique (GitHub Pages)            Backend (Google Apps Script, compte Google de l'admin)
 index.html / sw.js / manifest          Code.gs + ExcelFiller.gs
 css/ theme.css (Mission Control)         ├─ comptes + rôles + arbre hiérarchique
 js/                                      ├─ dossiers Drive par utilisateur
  ├─ business/ (dates, heures, TVA,       ├─ stockage = Google Sheet « GSYSTEM-DB »
  │   geste co, password, dateRange)      ├─ envois mail GS/EPS via Gmail
  ├─ views/ (login, tech/*, admin/*,      ├─ Excel mensuel rempli (OOXML, macros gardées)
  │   stats, charts, logo, shell)         └─ PDF stats + sous-dossiers mensuels Drive
  └─ api.js ←──── HTTPS JSON POST ────►  doPost({action, token, params})
```

## 2. Rôles (4 niveaux)

| Rôle | Accès |
|------|-------|
| **Super admin** (`admin`) | Tout. **Invisible** des autres. Peut « voir comme » (aperçu) un tech/responsable. Fait pas d'interventions (mais a accès à l'app tech). Seul à pouvoir **supprimer définitivement**. |
| **Direction** (`direction`) | Tout en consultation + créer/modifier/activer/désactiver les comptes. **Pas** de suppression définitive, **pas** de promotion super admin. |
| **Responsable** (`responsable`) | Son équipe (supervision + stats + dossiers Drive de ses techs) **ET** son propre espace tech (il fait des interventions). |
| **Technicien** (`tech`) | Son app uniquement, ses données. Inchangé vs l'APK. |

Le filtrage par périmètre est appliqué **côté serveur** (`tree`, `getUserData`) et côté UI.

## 3. App technicien (fidèle à l'APK)

Accueil = 6 tuiles (palette violet→vert) : **CLÔTURE** (intervention + GESTE CO/GSM inline),
**ATTENTE CLIENT**, **COURRIER**, **RÉCAP**, **FRAIS** (photo ticket → Drive), **ENVOI MENSUEL**
(Excel + photo compteur + récap). Règles métier portées en JS : heures 0/4/6/8h (7h vacances/
formation/férié), TVA par catégorie, GESTE CO 12 types (primes + cadeau client ≤ 4,50 €).
Viber : pas d'API → message **journalisé** côté serveur (onglet Log) ; les mails partent par Gmail.

## 4. Supervision (admin / responsable)

- **Arbre** de l'organisation (Direction / Équipes / inactifs), bouton **📁 dossier Drive** par tech.
- **Tableau de bord** : filtres période (jour/semaine/mois/année/perso), KPIs (interventions,
  terminées, NR, primes €, frais, net, taux clôture/transfo…), graphiques SVG (camembert,
  courbe, classements), **stats détaillées** (résultats OK/NR/annulé + qualité commerciale
  des installations), export CSV + impression PDF.
- **RÉCAP** réutilisable (fidèle APK) avec sélecteur de mois.

## 5. Backend — données & déploiement

- **Stockage** : Google Sheet `GSYSTEM-DB`, onglets `Users / Temps / Frais / GesteCo /
  Compteur / Files / Sessions / Log`.
- **Sécurité** : mot de passe haché (sel par compte + poivre `CONFIG.SALT`), **rétrocompatible**
  (anciens hash sel global), changement obligatoire à la 1re connexion, sessions TTL 30 j,
  désactivation = accès coupé immédiat.
- **Secrets** (`DRIVE_ROOT_FOLDER_ID`, `SALT`, mdp admin) : **jamais commités** (repo public).
  Version locale remplie servie sur `localhost:8099/backend/Code-rempli.gs.txt` (gitignorée).

### Déployer une mise à jour
- **Frontend** : `git push` → GitHub Pages se met à jour seul. **Bumper `sw.js` VERSION**
  à chaque fois (sinon cache PWA). Penser à recharger l'app (cache).
- **Backend** : recoller `Code.gs` (depuis la version remplie locale) dans script.google.com →
  **Déployer → Gérer les déploiements → ✏️ → Nouvelle version → Déployer** (garde l'URL `/exec`).

## 6. Mode démo

`js/config.js` → `BACKEND_URL` vide = mode démo (données factices localStorage). Rempli = live.
Réglable aussi dans l'app (login → « ⚙ Configurer le serveur »).

## 7. Décisions & limites connues

- **Mono-entreprise** pour l'instant (pas multi-tenant) ; possible plus tard.
- **Photos** : compteur encore en data URL dans la Sheet (limite cellule 50 000 car. → grosses
  photos risquées) ; les tickets FRAIS vont déjà sur le Drive (`uploadFile`). À harmoniser.
- **Pas de vrai CA** (revenu client) dans les données : la métrique € = primes. Pour un vrai CA,
  ajouter un champ « montant vente » à la saisie.
- **GitHub Pages / Jekyll** : ne jamais nommer un fichier avec `_` au début (404). Un `.nojekyll`
  est présent ; en cas de doute, renommer sans underscore.

## 8. Pièges

1. Bumper `sw.js` VERSION à chaque déploiement frontend.
2. Le `SALT` déployé ne doit jamais changer (sinon tous les mots de passe invalidés — la
   rétrocompat couvre l'ancien schéma mais pas un SALT différent).
3. Tester en local ne détecte PAS le piège Jekyll (le serveur statique sert les `_*`).

# Changelog — G-SYSTEMS

Format : versions du service worker (`sw.js`), des plus récentes aux plus anciennes.
Dates indicatives (juin 2026).

## v1.0.8
- Bouton **📁 dossier Drive** par tech/responsable (arbre + fiche) → accès direct aux
  dossiers mois/année, Excel du mois, frais, photos (le contenu envoyé à `fdt`).
- Responsables : accès confirmé à l'app tech (ils font des interventions).

## v1.0.7
- **Stats détaillées** : résultats des interventions (OK / NR client / NR technique /
  NR client absent / Annulé) + bloc **qualité commerciale des installations**
  (taux de transformation, extensions/installation, ventes, extensions par type).
- Intégrées au RÉCAP (tech + détail) et au tableau de bord. Dashboard parallélisé (perf).

## v1.0.6
- **Tableau de bord avancé** (admin = tout, responsable = son équipe) : filtres de
  période (jour/hier/semaine/mois/année/perso), KPIs, graphiques SVG (camembert,
  courbe, classements), tableau détaillé, export CSV + impression PDF.
- **FRAIS** : prise de **photo du ticket** → stockée sur le Drive du tech.

## v1.0.5
- **Sélecteur de période** (mois précédents) + RÉCAP fidèle à l'APK, consultable selon
  le rôle (tech = lui ; responsable/admin = leurs techs).
- Backend : **PDF de stats** + photo compteur ajoutés au sous-dossier mensuel Drive.

## v1.0.3 – v1.0.4
- **Logo animé** « gsystems » de l'APK sur l'écran de connexion.
- **Super admin invisible** des autres rôles + **aperçu « voir comme »** (tech/responsable).

## v1.0.2
- Modèle **4 rôles** : Super admin / Direction / Responsable / Technicien.
- Admin & responsable peuvent aussi utiliser l'app tech.
- Dossier Drive créé pour **tous** les comptes. Correctif auth **anti-lockout**
  (vérification de mot de passe rétrocompatible).

## v1.0.1
- Correctifs GitHub Pages : `.nojekyll` puis renommage `_shell.js → shell.js`
  (Jekyll ignorait les fichiers préfixés `_` → app bloquée).
- Écran « Configurer le serveur » (brancher le backend depuis l'app).

## v1.0.0
- Version initiale : PWA installable (Android/iPhone), app technicien fidèle à l'APK
  (thème Mission Control, 6 tuiles, logique métier), panneau admin (arbre, création de
  comptes, tableau de bord), backend Google Apps Script (comptes/rôles, dossiers Drive,
  Google Sheet, envois Gmail, Excel macro-préservé), **sécurité/RGPD** (mot de passe
  haché + changement obligatoire 1re connexion, écran confidentialité, effacement réel).

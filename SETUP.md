# G-SYSTEMS — Guide de mise en route (≈ 15 min)

Tu n'as **aucun code à écrire**. Tu copies-colles, tu cliques, c'est tout.
À la fin : une app installable sur Android **et** iPhone, un panneau admin, et
un dossier Drive créé automatiquement pour chaque technicien.

> Tant que l'étape B n'est pas faite, l'app tourne en **MODE DÉMO** (données
> factices). Comptes de test : `admin@gsystem.fr`, `resp@gsystem.fr`,
> `tech@gsystem.fr` — le mot de passe est la partie avant le `@`.

---

## A. Le dossier Drive racine (1 min)

1. Va sur [drive.google.com](https://drive.google.com).
2. **Nouveau → Dossier** → nomme-le `G-SYSTEMS`.
3. Ouvre ce dossier. Regarde l'adresse dans le navigateur :
   `https://drive.google.com/drive/folders/`**`1AbCdEf...`** ← la partie en gras
   est **l'ID du dossier**. Copie-la.

---

## B. Le backend (le « serveur » Google) (8 min)

1. Va sur [script.google.com](https://script.google.com) → **Nouveau projet**.
2. Efface le contenu du fichier, et **colle tout le fichier** [`backend/Code.gs`](backend/Code.gs).
   Puis **ajoute un 2ᵉ fichier** (➕ à côté de « Fichiers » → Script → nomme-le `ExcelFiller`)
   et **colle** [`backend/ExcelFiller.gs`](backend/ExcelFiller.gs) (remplissage du `.xlsm`).
3. Tout en haut, dans `CONFIG`, remplis :
   - `DRIVE_ROOT_FOLDER_ID` → l'ID copié à l'étape A.
   - `BOOTSTRAP_ADMIN` → ton nom, ton email de connexion, **ton mot de passe admin**.
   - `SALT` → change la phrase (n'importe quoi de secret, une seule fois).
   - (optionnel) `MAIL` → vérifie les adresses GS / EPS.
4. En haut, choisis la fonction **`setup`** dans le menu déroulant, puis clique **Exécuter** ▶.
   - Google demande une autorisation → **Autoriser** (Drive + Gmail + Sheets).
     (« Application non vérifiée » → *Avancé → Accéder au projet → Autoriser*.)
   - Ça crée la base `GSYSTEM-DB` (un Google Sheet) + ton compte admin.
5. **Déploiement → Nouveau déploiement** → roue dentée → **Application Web** :
   - *Exécuter en tant que* : **moi**.
   - *Qui a accès* : **Tout le monde**.
   - **Déployer** → copie l'**URL de l'application Web** (finit par `/exec`).

---

## C. Brancher l'app sur le backend (1 min)

1. Ouvre [`js/config.js`](js/config.js).
2. Colle l'URL `/exec` dans `BACKEND_URL` :
   ```js
   BACKEND_URL: "https://script.google.com/macros/s/AKfy.../exec",
   ```
3. Enregistre. Le mode démo se désactive tout seul ; l'app parle maintenant au backend.

---

## D. Mettre l'app en ligne (GitHub Pages, gratuit) (3 min)

1. Pousse ce dossier sur le repo `GSYSTEM-EPS` (déjà créé).
2. Sur GitHub : **Settings → Pages** → *Source* : branche `main`, dossier `/ (root)` → **Save**.
3. Au bout d'1-2 min, l'app est en ligne :
   `https://morpheus45.github.io/GSYSTEM-EPS/`

---

## E. Installer l'app sur le téléphone

- **Android (Chrome)** : ouvre le lien → menu ⋮ → *Installer l'application*.
- **iPhone (Safari)** : ouvre le lien → bouton *Partager* → *Sur l'écran d'accueil*.

L'icône G rouge apparaît comme une vraie app, plein écran, et marche hors-ligne.

---

## F. Utilisation

1. Connecte-toi en **admin** (l'email/mot de passe de `BOOTSTRAP_ADMIN`).
2. **Créer un accès** → choisis le rôle :
   - **Technicien** → un dossier Drive à son nom est créé automatiquement ;
     il aura l'app (visuel identique à l'APK).
   - **Responsable** → ne voit que **son** équipe.
   - **Admin** → voit tout, l'arbre complet, le tableau de bord « au fil de l'eau ».
3. Donne à chaque personne son email + mot de passe. Terminé.

---

### Notes
- **Viber** : il n'existe pas d'API officielle pour poster dans un groupe. Les
  messages Viber sont **journalisés** côté serveur (onglet `Log`). Les **mails**
  (GS / EPS) partent, eux, **automatiquement** par Gmail. Si tu veux un relais
  Viber 100 % auto, il faudra une passerelle dédiée (à voir plus tard).
- **Excel mensuel** : le tech dépose son `.xlsm` 1×/an (écran ENVOI MENSUEL).
  À chaque envoi mensuel, le serveur en remplit une **copie** (dépt/mission/heures/
  observations dans les bons jours, **macros conservées**) rangée dans son Drive
  (`Archives mensuelles/<période>`) et jointe au mail. **Le modèle d'origine n'est
  jamais modifié.** Pour valider/ajuster sur ton vrai fichier : exécute la fonction
  `testFillExcel` (éditer l'email du tech en haut) et regarde les Logs.
- **Mise à jour de l'app** : elle se met à jour toute seule (PWA), pas de
  réinstallation. Pour pousser une nouvelle version, tu mets à jour le repo.
- **Changer un destinataire mail** : édite `CONFIG.MAIL` dans le script puis
  **redéploie** (Déploiement → Gérer → crayon → Nouvelle version).

# Publier G-Systems sur le Google Play Store — guide conforme

> Objectif : publier l'app Android **existante** (`morpheus45/gsystem`, v1.9.9)
> sur le Play Store **dans les règles**, sans modifier ses fonctionnalités.
>
> **Ce kit fournit** : politique de confidentialité (hébergée), textes de fiche,
> icône 512, feature graphic 1024×500, réponses « Data safety » et « Content rating »,
> et ce guide. **Ce que toi seul peux faire** (identifiants Google + carte) : le compte
> développeur, la génération de l'AAB signé, l'upload et le remplissage de la console.

---

## 0. Pré-requis / points de vigilance

- **Compte Google Play Console** : 25 $ une seule fois, + **vérification d'identité**
  (pièce d'identité, adresse). Compte perso ou société.
- **Test fermé obligatoire (comptes particuliers)** : tout compte **« développeur particulier »
  créé après le 13 novembre 2023** doit réussir un **test fermé** avec **au moins 12 testeurs
  inscrits en continu pendant 14 jours** avant de pouvoir demander l'accès à la production.
  12 comptes Google **distincts**, inscrits via ton lien d'opt-in, l'app installée sur un **vrai
  téléphone** (émulateurs et doublons ne comptent pas). Le compte à rebours de 14 jours ne
  démarre qu'une fois la version approuvée **et** les 12 testeurs inscrits. **À anticiper : c'est
  le poste le plus long du projet.** Un compte de société (« organisation ») n'y est pas soumis.
- **Format de publication : AAB** (Android App Bundle), plus l'APK. Il faut donc **générer
  un `.aab`** (voir §2). Cela ne change pas l'app — c'est juste un autre format de paquet.
- **targetSdk : API 36 OBLIGATOIRE.** Depuis le **31 août 2026**, toute nouvelle app et toute
  mise à jour doit cibler **Android 16 (API 36)** ou plus ; en dessous, Play **rejette** l'envoi.
  D'après ce guide, l'app cible l'**API 34** → il faut donc **passer `targetSdk` (et
  `compileSdk`) à 36** dans `app/build.gradle.kts`, puis rebuild. C'est le **seul** changement
  nécessaire côté source, et il est **bloquant** : sans lui, rien ne peut être publié.
  (Vérifie la valeur réelle dans le dépôt `morpheus45/gsystem` avant de modifier.)
  Passer de 34 à 36 peut demander de vérifier deux comportements Android : l'affichage
  **bord-à-bord** imposé (API 35+) et les **nouvelles règles sur les services en premier plan**.
  À contrôler visuellement sur un téléphone après le rebuild.
- **Signature** : utilise la **signature d'application Play** (Play App Signing). Tu fournis
  une **clé d'upload** ; Google gère la clé finale. Ne perds pas la clé d'upload.

---

## 1. Créer le compte + l'application

1. Va sur <https://play.google.com/console> → crée le compte développeur (25 $), fais la
   vérification d'identité.
2. **Créer une application** :
   - Nom : `G-Systems`
   - Langue par défaut : **Français (France)**
   - Type : **Application** · **Gratuite**
   - Coche les déclarations (règles du programme, lois export US).

---

## 2. Générer l'AAB signé (sans changer l'app)

Dans le dossier du projet `gsystem` (sur un PC avec le SDK Android / Android Studio) :

```bash
# clé d'upload (une seule fois) — garde le .jks et les mots de passe en lieu sûr
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 \
  -validity 9125 -alias upload

# configurer la signature release dans app/build.gradle.kts (signingConfigs) OU
# via gradle.properties, puis :
./gradlew bundleRelease
# → l'AAB est ici : app/build/outputs/bundle/release/app-release.aab
```

> Alternative : Android Studio → **Build → Generate Signed App Bundle** → choisis ta clé d'upload.
> Si tu utilises **Play App Signing**, tu peux aussi laisser Play générer la clé et n'uploader
> qu'un AAB signé avec ta clé d'upload.

---

## 3. Fiche du store (onglet « Présence sur le Store » → « Fiche principale »)

Copie les textes depuis [`listing-fr.md`](listing-fr.md). Ajoute :

- **Icône de l'application** : [`assets/icon-512.png`](assets/icon-512.png) (512×512, PNG).
- **Image mise en avant (feature graphic)** : [`assets/feature-graphic-1024x500.png`](assets/feature-graphic-1024x500.png).
- **Captures d'écran téléphone** : **2 minimum** (4 recommandé pour être éligible aux mises en
  avant), **8 maximum**. PNG 24 bits ou JPEG, chaque côté entre **320 et 3840 px**, ratio max
  **2:1** — le plus simple : des captures portrait **1080 × 1920**.
  👉 À faire par toi depuis l'app installée (accueil 6 tuiles, CLÔTURE, FRAIS, RÉCAP, ENVOI MENSUEL).
  Une capture d'écran brute du téléphone (bouton Volume bas + Marche) convient : pas besoin de
  retouche. **N'invente pas de visuels** : Google exige des captures réelles de l'app.
- **Catégorie** : Professionnel (Business) · **Tags** : productivité, entreprise.
- **Coordonnées** : e-mail `cedric.lago@gmail.com`.
- **Politique de confidentialité (URL)** :
  **https://morpheus45.github.io/GSYSTEM-EPS/privacy-policy.html**

---

## 4. Contenu de l'application (obligatoire avant publication)

- **Confidentialité** : URL ci-dessus.
- **Accès à l'application** : « Toutes les fonctionnalités sont disponibles sans restriction »
  (l'app n'a pas de connexion/compte).
- **Publicités** : **Non**, l'app ne contient pas de publicité.
- **Sécurité des données (Data safety)** : réponses dans [`data-safety.md`](data-safety.md).
- **Classification du contenu (Content rating)** : réponses dans [`content-rating.md`](content-rating.md).
- **Public cible et contenu** : **18 ans et plus** / usage professionnel. Ne cible pas les enfants.
- **Application gouvernementale / financière / santé** : **Non**.
- **Isolement de la publicité, COVID, etc.** : Non concerné.

---

## 5. Créer une version et publier

1. **Version → Tests → Test interne** (recommandé pour valider avant la prod) :
   - Crée une version, **uploade l'`app-release.aab`**.
   - Ajoute des testeurs (adresses e-mail), partage le lien de test, vérifie l'installation.
2. Une fois validé (et le test de 14 j effectué si demandé) → **Version → Production** :
   - Nouvelle version → uploade l'AAB → notes de version → **Envoyer pour examen**.
3. **Examen Google** : de quelques heures à quelques jours. Tu reçois un mail à la validation.

---

## 6. Après publication

- **Lien Play sur le site** : dans `index.html` (racine de ce dépôt), décommente la ligne
  prévue et colle l'adresse de ta fiche Play à la place de `VOTRE.ID` ; le bandeau
  « Bientôt sur Google Play » est alors remplacé par un vrai bouton d'installation.
- **Mises à jour** : réuploader un AAB avec un `versionCode` supérieur.
- **Signature** : conserve précieusement la clé d'upload (sinon impossible de mettre à jour).
- **Conformité** : garde l'URL de politique de confidentialité valide et l'app à jour côté targetSdk.

---

### Récapitulatif « prêt à cocher »

**Déjà fait et vérifié dans ce dépôt** (rien à faire)
- [x] Politique de confidentialité **en ligne** et répondant 200 :
      <https://morpheus45.github.io/GSYSTEM-EPS/privacy-policy.html>
- [x] Icône 512×512 PNG + feature graphic 1024×500 PNG — dimensions et formats contrôlés
- [x] Textes de fiche FR — longueurs contrôlées (nom 9/30, courte 79/80, complète 1165/4000)
- [x] Réponses « Sécurité des données » et « Classification du contenu » rédigées
- [x] Page d'accueil du site sans lien mort

**À faire par toi** (tes identifiants Google sont indispensables)
- [ ] Compte Play créé (25 $) + identité vérifiée
- [ ] `targetSdk` + `compileSdk` passés à **36** dans `morpheus45/gsystem` ⚠️ bloquant
- [ ] AAB signé généré (`app-release.aab`) avec la clé d'upload conservée en sûr
- [ ] 2 captures d'écran minimum prises sur le téléphone, puis ajoutées
- [ ] Textes de fiche recopiés + URL de confidentialité renseignée dans la console
- [ ] Data safety + Content rating recopiés · Public 18+
- [ ] Test fermé 12 testeurs / 14 jours (si compte particulier post-13/11/2023)
- [ ] Production → Envoyé pour examen
- [ ] Après validation : lien Play collé dans `index.html` (§6)

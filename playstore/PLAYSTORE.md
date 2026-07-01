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
  (pièce d'identité, adresse). Compte perso ou société. Comptes créés en 2024+ :
  Google peut demander un **test fermé de 14 jours avec ≥ 12 testeurs** avant la prod
  (pour les comptes « développeur particulier »). À anticiper.
- **Format de publication : AAB** (Android App Bundle), plus l'APK. Il faut donc **générer
  un `.aab`** (voir §2). Cela ne change pas l'app — c'est juste un autre format de paquet.
- **targetSdk** : Play exige une cible récente (au 2ᵉ semestre 2025, **API 35 / Android 15**).
  Ton app cible actuellement l'API 34. Si Play refuse, il faudra **bumper `targetSdk` à 35**
  dans `app/build.gradle.kts` (une ligne, aucune fonctionnalité changée) puis rebuild. C'est
  le **seul** changement potentiellement nécessaire côté source.
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
- **Captures d'écran téléphone** : **2 à 8**, format portrait, entre 320 et 3840 px.
  👉 À faire par toi depuis l'app installée (accueil 6 tuiles, CLÔTURE, FRAIS, RÉCAP, ENVOI MENSUEL).
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

- **Mises à jour** : réuploader un AAB avec un `versionCode` supérieur.
- **Signature** : conserve précieusement la clé d'upload (sinon impossible de mettre à jour).
- **Conformité** : garde l'URL de politique de confidentialité valide et l'app à jour côté targetSdk.

---

### Récapitulatif « prêt à cocher »
- [ ] Compte Play créé + identité vérifiée
- [ ] AAB signé généré (`app-release.aab`)
- [ ] Icône 512 + feature graphic 1024×500 ajoutés
- [ ] 2+ captures d'écran ajoutées
- [ ] Textes de fiche (FR) remplis
- [ ] URL politique de confidentialité renseignée
- [ ] Data safety rempli · Content rating rempli · Public 18+
- [ ] Test interne OK → Production → Envoyé pour examen

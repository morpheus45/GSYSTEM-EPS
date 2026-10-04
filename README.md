# GSYSTEM-EPS — Kit de publication Play Store + hébergement

Ce dépôt héberge, via GitHub Pages, ce qu'il faut pour **publier l'app Android
G-Systems** (`morpheus45/gsystem`, v1.9.9) sur le **Google Play Store**, sans
modifier l'application.

## Contenu

- **`privacy-policy.html`** → politique de confidentialité en ligne :
  <https://morpheus45.github.io/GSYSTEM-EPS/privacy-policy.html>
  (URL à renseigner dans la fiche Play — obligatoire).
- **`index.html`** → page d'accueil du site (confidentialité, contact, et le bouton
  Play Store prêt à activer après publication).
- **`playstore/`** :
  - [`PLAYSTORE.md`](playstore/PLAYSTORE.md) — guide pas-à-pas conforme.
  - [`listing-fr.md`](playstore/listing-fr.md) — textes de la fiche (FR).
  - [`data-safety.md`](playstore/data-safety.md) — réponses « Sécurité des données ».
  - [`content-rating.md`](playstore/content-rating.md) — réponses classification.
  - [`assets/icon-512.png`](playstore/assets/icon-512.png) — icône 512×512.
  - [`assets/feature-graphic-1024x500.png`](playstore/assets/feature-graphic-1024x500.png) — image mise en avant.

## État du kit

Tout ce qui pouvait être préparé, vérifié et mis en ligne depuis ce dépôt l'est :
politique de confidentialité **en ligne et accessible**, visuels aux bonnes dimensions,
textes de fiche **dans les limites de caractères**, réponses Data safety et classification,
page d'accueil **sans lien mort**.

## À faire (côté propriétaire, identifiants requis)

1. ⚠️ **Passer `targetSdk` et `compileSdk` à 36** dans `morpheus45/gsystem` — depuis le
   31 août 2026 Google **refuse** tout envoi qui cible moins que l'API 36. C'est bloquant.
2. Compte Play Console (25 $) + vérification d'identité.
3. Génération de l'**AAB signé**, puis **2 captures d'écran** minimum prises sur le téléphone.
4. Remplissage de la console, **test fermé 12 testeurs / 14 jours** si compte particulier,
   puis production.

Chaque étape est détaillée pas à pas dans [`playstore/PLAYSTORE.md`](playstore/PLAYSTORE.md).

> L'app native (`morpheus45/gsystem`) n'est pas modifiée par ce dépôt.

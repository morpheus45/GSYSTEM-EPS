# GSYSTEM-EPS — Kit de publication Play Store + hébergement

Ce dépôt héberge, via GitHub Pages, ce qu'il faut pour **publier l'app Android
G-Systems** (`morpheus45/gsystem`, v1.9.9) sur le **Google Play Store**, sans
modifier l'application.

## Contenu

- **`privacy-policy.html`** → politique de confidentialité en ligne :
  <https://morpheus45.github.io/GSYSTEM-EPS/privacy-policy.html>
  (URL à renseigner dans la fiche Play — obligatoire).
- **`index.html`** → page d'accueil (téléchargement APK, guide, confidentialité).
- **`playstore/`** :
  - [`PLAYSTORE.md`](playstore/PLAYSTORE.md) — guide pas-à-pas conforme.
  - [`listing-fr.md`](playstore/listing-fr.md) — textes de la fiche (FR).
  - [`data-safety.md`](playstore/data-safety.md) — réponses « Sécurité des données ».
  - [`content-rating.md`](playstore/content-rating.md) — réponses classification.
  - [`assets/icon-512.png`](playstore/assets/icon-512.png) — icône 512×512.
  - [`assets/feature-graphic-1024x500.png`](playstore/assets/feature-graphic-1024x500.png) — image mise en avant.

## À faire (côté propriétaire, identifiants requis)

Compte Play Console (25 $), génération de l'AAB signé, captures d'écran, upload et
remplissage de la console. Tout est détaillé dans [`playstore/PLAYSTORE.md`](playstore/PLAYSTORE.md).

> L'app native (`morpheus45/gsystem`) n'est pas modifiée par ce dépôt.

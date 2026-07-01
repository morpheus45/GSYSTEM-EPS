# Play Console — « Sécurité des données » (Data safety) : réponses

> À recopier dans Play Console → Contenu de l'application → Sécurité des données.

## Collecte et partage
- **Votre application collecte-t-elle ou partage-t-elle des types de données utilisateur ?**
  → **NON.**

Justification (conforme aux règles Google) : l'application **stocke tout localement** sur
l'appareil et **ne transmet aucune donnée** à l'éditeur ni à un serveur. Les données
traitées (saisies, photos, réglages) restent sur le téléphone. Lorsque l'utilisateur choisit
d'envoyer un mail ou un message, le transfert est **initié par l'utilisateur** et réalisé par
**une autre application** (messagerie de l'appareil) — ce qui n'est pas considéré comme une
« collecte » par G-Systems.

## Questions associées
- **Chiffrement en transit** : sans objet (pas de transmission par l'app).
- **Suppression des données** : l'utilisateur peut supprimer ses données (désinstallation /
  effacement des données de l'app). → **Oui**, l'utilisateur peut demander/effectuer la suppression.
- **Données traitées de manière éphémère** : oui (traitement local uniquement).

## Autorisations déclarées (section « Autorisations » de la fiche)
- **CAMERA** — prendre les photos de tickets et de compteur.
- **Lecture/écriture de fichiers** (selon la version d'Android) — enregistrer/joindre les
  photos et exports.
- Aucune autorisation de **localisation**, **contacts**, **micro**, **téléphone**.

> Si Play affiche une question sur des permissions « sensibles », répondre en cohérence :
> les fichiers/photos servent uniquement à l'usage local et aux envois initiés par l'utilisateur.

# Confidentialité & RGPD — G-Systems

> ⚠️ **À valider par le responsable de traitement** (champs entre crochets et
> `js/config.js → LEGAL`). Ce document décrit le traitement réel mis en place
> par l'application. Il ne remplace pas un conseil juridique.

## 1. Responsable de traitement
- **[G-Systems FR]** — contact pour l'exercice des droits : **[cedric.lago@gmail.com]**.

## 2. Données traitées (minimisation)
| Catégorie | Données | Pourquoi |
|---|---|---|
| Identité | nom, email (identifiant), code technicien, plaque (facultatif) | identifier le technicien, reporting |
| Activité | interventions, heures, frais (montants + photos de tickets), relevés compteur | primes, frais, suivi |
| Authentification | mot de passe **haché** (SHA-256 + sel unique/compte), jeton de session | sécuriser l'accès |
| Journaux | actions clés (création de compte, envois) | traçabilité/sécurité |

Aucune donnée sensible (art. 9 RGPD) n'est collectée.

## 3. Finalités & base légale
Suivi d'activité, calcul des primes/frais, reporting interne et envois au partenaire
EPS pour les interventions concernées. **Base légale :** exécution du contrat de
travail et intérêt légitime de l'employeur.

## 4. Destinataires
- L'entreprise (admin, responsable du secteur concerné).
- Le partenaire **EPS** et les boîtes internes (GS) pour les envois métier.
- **Sous-traitant technique : Google** (Drive, Gmail, Apps Script, Sheets). Le
  traitement s'appuie sur les services Google ; vérifier la localisation des
  données du compte Google utilisé (idéalement UE) et accepter les CGU/DPA Google.

## 5. Durée de conservation
**[5 ans]** (obligations comptables et sociales), puis suppression. Les comptes
« désactivés » conservent les données le temps de la conservation ; l'**effacement
définitif** supprime compte + données + dossier Drive.

## 6. Droits des personnes
Accès, rectification, effacement, limitation, opposition. Demande à **[contact]**.
- **Effacement** : l'action admin « Supprimer définitivement » efface le compte,
  toutes ses lignes de données (interventions, frais, geste co, compteur, fichiers),
  ses sessions, et **met le dossier Drive à la corbeille**.

## 7. Sécurité (mesures techniques)
- Transport **HTTPS** (GitHub Pages + Apps Script).
- Mots de passe **hachés** avec **sel unique par compte** + poivre serveur
  (`CONFIG.SALT`) ; **jamais stockés en clair**.
- **Politique de robustesse** : ≥ 12 caractères, maj/min/chiffre/spécial,
  ne contient pas l'identifiant (vérifiée côté client **et** serveur).
- **Changement de mot de passe imposé à la 1re connexion** (et après toute
  réinitialisation par l'admin).
- **Cloisonnement par rôle** : un technicien ne voit que ses données, un
  responsable que son équipe.
- **Sessions** expirant après **30 jours** ; **désactivation immédiate** d'un
  compte coupe l'accès (login refusé + session en cours invalidée).
- Le backend tourne sous le compte Google du responsable ; l'URL `/exec` est
  publique mais **toute action exige un jeton de session valide**.

## 8. Points de vigilance / à faire par le responsable
- [ ] Renseigner `CONFIG.SALT` (poivre) avec une valeur secrète **avant le 1er `setup()`**.
- [ ] Valider la durée de conservation et le contact RGPD (`js/config.js → LEGAL`).
- [ ] Vérifier la localisation UE des données du compte Google.
- [ ] Informer les techniciens (cette notice est accessible depuis l'app : écran « Confidentialité »).
- [ ] Tenir le registre des traitements (obligation RGPD côté entreprise).

## 9. Limites connues
- Le hachage SHA-256 (rapide) est acceptable ici grâce au sel par compte et à la
  politique de robustesse ; un algorithme lent dédié (bcrypt/PBKDF2/argon2) n'est
  pas disponible nativement dans Apps Script. La protection repose donc surtout sur
  des mots de passe forts + accès restreint à la base.
- Les messages Viber sont journalisés (pas d'API officielle) — voir `SETUP.md`.

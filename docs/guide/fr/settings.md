# Réglages

[← Sommaire du guide](index.md)

Pour le propriétaire de la borne :

- **Réglages de l'eXpansion pack** : depuis le menu opérateur, activer ou désactiver chaque Add-on par catégorie, choisir l'écran de démarrage et la langue, puis redémarrer PinballY d'une pression.
- **Profil admin** : les entrées de configuration pour vous seul.
- **Profil enfant** : une roue sans tables pour adultes.
- **Gérer les profils** : marquer un Profil admin ou un Profil enfant, donner ses initiales à un Profil, donner l'historique de jeu de PinballY à un Profil (reprise de l'historique), ou faire repartir de zéro un Profil ou toute la maison d'un coup.
- **Nettoyage des menus** : des menus PinballY allégés (voir [Interface](interface.md#nettoyage-des-menus)).

Tout tient dans un seul dossier, sans modifier PinballY.

## Réglages de l'eXpansion pack

**Réglages de l'eXpansion pack**, dans le menu opérateur, règle les Add-ons, l'écran de démarrage, la langue, les repères de la roue, l'ordre du mode attract et le mode hors ligne sans éditer aucun fichier, puis redémarre PinballY d'une pression. On y trouve aussi « Mettre à jour en vX.Y.Z » après avoir répondu « Plus tard » à l'invite de mise à jour (voir [Mises à jour](updates.md)), et, tant que l'Add-on « ROM des tables » est activé, une ligne vpxtool (voir [Installation](install.md#vpxtool) et [Mises à jour](updates.md#garder-vpxtool-à-jour)) :

- « Installer vpxtool v0.38.0 » tant que vpxtool manque ;
- « Mettre à jour vpxtool (v0.37.1 → v0.38.0) » tant que le vôtre est plus ancien que la version que nomme le pack ;
- « Mettre à jour vpxtool », grisée avec « vpxtool v0.38.0 est à jour » en dessous, quand le vôtre est à cette version ou plus récent.

Tant que le pack n'a pas lu une fois la version de votre vpxtool (une dizaine de secondes après le premier démarrage qui le trouve), ou si cette version est illisible, il n'y a pas de ligne vpxtool.

La liste, de haut en bas :

- **Langue** et **Écran de démarrage** ;
- les catégories d'Add-ons, chacune ouvrant sa page : **Joueurs et progression**, **Roue** (les Add-ons de l'écran de la roue, puis les lignes propres aux repères de la roue et la ligne « Mode attraction »), **Menus**, **Filtres** (les filtres qu'ajoute le pack : Tables les plus jouées, Tables à découvrir, Tables cachées, Tables Originales) et **Lancer et jouer une table** ;
- le groupe **Mode hors ligne** ;
- les lignes « Mettre à jour en » et vpxtool quand elles s'appliquent, puis **Retour**.

Sous « Joueurs et progression », **Notes par Profil** donne à chaque Profil ses propres notes et ses tables favorites, gardées dans un fichier `ratings.json` de son dossier (voir [Notes et tables favorites](profiles.md#notes-et-tables-favorites)). Désactivé, tout le monde partage de nouveau les notes et les favoris de PinballY, et les Succès de notes disparaissent (`ADD_ON_PROFILE_RATINGS=false`).

Sous « Menus », **Jeux cachés** est activé par défaut : certaines surprises débloquent des entrées de menu, ne soyez donc pas surpris d'en voir apparaître une dans le menu principal d'un joueur. Désactivé, ces entrées n'apparaissent jamais (`ADD_ON_ROCKET_GAME=false`). **Easter Eggs** est activé par défaut lui aussi : pour des joueurs qui préfèrent ne pas être surpris, désactivez-le et plus aucune surprise n'arrive, pour aucun Profil ; ce qu'un Profil a déjà débloqué reste, ces entrées de menu comprises (`ADD_ON_EASTER_EGGS=false`). **Configurer la table** ajoute cette entrée au menu principal (`ADD_ON_CUSTOM_MENU_COMMANDS=false` pour la retirer).

Sous « Roue », **Ordre de la roue** est activé, sa roue alphabétique jusqu'à ce qu'un joueur la passe par année ; désactivé, « Changer de filtre » perd son entrée d'ordre et la roue reste alphabétique (`ADD_ON_WHEEL_ORDER=false`, voir [Ordre de la roue](choosing_a_table.md#ordre-de-la-roue)). Il ne touche pas au mode attract : la ligne « Mode attraction », sous lui, fonctionne qu'Ordre de la roue soit activé ou non.

La ligne **Mode attraction**, en bas de la page « Roue » après un séparateur, choisit comment le mode attract passe d'une table à l'autre quand la borne reste inactive :

- **Comme PinballY** (par défaut) : PinballY saute quelques tables au hasard à chaque changement, comme sans le pack.
- **Dans l'ordre** : chaque changement passe à la table suivante de la roue, avec le tour d'un cran de PinballY, et reprend à la première après la dernière. Avec la roue par année, le mode attract devient une visite chronologique.
- **Toute la roue** : chaque table de la roue est montrée une fois, dans un ordre mélangé, avant qu'aucune ne revienne, jamais la table déjà à l'écran. Chaque changement est un tour rapide de la roue, et chaque nouveau mode attract mélange à nouveau.

Pour cela, le pack prend la main sur les changements de PinballY : enregistrer « Dans l'ordre » ou « Toute la roue » garde la valeur de l'option « Switch games every » de PinballY, met à sa place une valeur d'un jour pour que PinballY ne change plus de table, et change lui-même de table à l'intervalle que vous aviez réglé. Enregistrer « Comme PinballY » rend votre valeur. Si vous changez entre-temps « Switch games every » dans les options de PinballY, le pack retient votre nouvelle valeur au démarrage suivant : PinballY change de table avec elle pendant cette session, le pack à partir du démarrage d'après. Comme les autres lignes, le choix s'applique au redémarrage de PinballY (`ATTRACT_ORDER`). **Avant de retirer le pack, remettez le mode attraction sur « Comme PinballY »** : sinon le mode attract de PinballY garde la valeur d'un jour et ne change plus jamais de table.

Sous « Roue », **Repères de la roue** montre où vous en êtes sur la roue : le rail de la roue, les lettres (ou les décennies) le long du bord droit avec une pastille dorée sur celle de la table sélectionnée, la position dans la roue, la place de la table sélectionnée parmi les tables de la roue, en bas à droite, et le cœur des favoris, rouge sur une table favorite, en bas à gauche (voir [Interface](interface.md#sur-lécran-de-la-roue)). Désactivé, « Table n/total » revient dans la ligne d'état du bas (`ADD_ON_WHEEL_GUIDES=false`).

Tant que « Repères de la roue » est enregistré activé, la page « Roue » liste quatre lignes de plus après son séparateur, au-dessus de la ligne « Mode attraction », pour ne garder que les repères voulus ; chacune s'applique au redémarrage de PinballY :

- **Rail de la roue** Activé ou Désactivé (`WHEEL_RAIL`) ;
- **Rail par année**, affichée tant que le rail de la roue est enregistré activé : **Décennies seules** (par défaut) ou **Décennies et années**, les années de chaque décennie dessous quand la roue est par année (`WHEEL_RAIL_YEARS` ; les lettres de la roue alphabétique restent les mêmes) ;
- **Position dans la roue** Activé ou Désactivé : désactivée, « Table n/total » revient dans la ligne d'état du bas (`WHEEL_POSITION`) ;
- **Cœur des favoris** Activé ou Désactivé (`FAVORITE_HEART`).

Pour qu'un bouton de flipper gardé enfoncé fasse défiler la roue au rythme réglé sur la borne, mettez l'option « Auto-repeat rate » de PinballY (Options, Game Wheel) à `180ms` : le pack ne la change jamais.

Sous « Lancer et jouer une table », **Écran de lancement** évite l'écran noir pendant le chargement d'une table (`ADD_ON_SEAMLESS_LAUNCH_OVERLAY=false` pour le désactiver). Si un autre script que vous faites tourner dans PinballY, comme un script de vidéo de lancement, prend l'écran de lancement avant le pack, celui du pack s'affiche quand même, et un **Avis de conflit** le signale une fois : voir [Avec vos Add-ons externes](external_add_ons.md#ce-que-le-pack-vous-signale--lécran-de-lancement).

Le groupe **Mode hors ligne** réunit ce qui contacte internet, ou propose de le faire, un interrupteur chacun :

- **Recherche de mises à jour du pack** : PinballY demande à GitHub, à chaque démarrage, si une version plus récente du pack existe (`UPDATE_CHECK`).
- **Proposer vpxtool** : le pack peut proposer d'installer ou de mettre à jour vpxtool (`OFFER_VPXTOOL`).
- **Discord Rich Presence** : Discord montre sur votre compte la table jouée ; c'est le même interrupteur que celui de l'Add-on sous « Lancer et jouer une table », avec le même dialogue d'accord (voir [plus bas](#discord-rich-presence)).

## Discord Rich Presence

Discord Rich Presence montre, sur le compte Discord ouvert sur le PC de la borne, ce que fait la borne : « Choisit une table » sur la roue, pendant une partie le nom de la table, depuis combien de temps elle dure et, s'il y a lieu, « Table du jour » ou « Table de la semaine », sous le nom « Virtual Pinball » avec le logo du pack, et « Mode attraction » quand la borne inactive passe en mode attract. **C'est public** : vos amis Discord et les membres de vos serveurs le voient. Rien d'autre n'est envoyé : aucun nom de profil, jamais la table sélectionnée sur la roue, rien d'autre de votre PC. Une table adulte montre son nom comme toute autre table.

Il est **désactivé par défaut** : activez-le dans les Réglages de l'eXpansion pack, sous « Lancer et jouer une table » ou dans le groupe Mode hors ligne, ou avec `ADD_ON_DISCORD_RICH_PRESENCE=true`. L'activer dans les Réglages demande votre accord à chaque fois, dans un dialogue qui dit ce qui devient public, le curseur sur « Annuler » : seul « Activer » l'enregistre. Le désactiver ne demande jamais rien. Lancez Discord avant PinballY : le pack ne le lance jamais et le cherche trois fois, à 15 secondes d'intervalle, au démarrage ; si Discord ne tourne toujours pas, ou se ferme pendant la session, un [toast « Avertissement »](troubleshooting.md#le-toast-avertissement) le dit une seule fois et le statut reste vide jusqu'au prochain démarrage de PinballY (la raison est dans `PinballY.log`). Tant que Discord montre vraiment la borne, son symbole blanc se place à côté de l'horloge de la roue, pour tout le monde (voir [Icônes d'état](interface.md#icônes-détat)).

## `.env.local`

Tous les autres réglages se trouvent dans `Scripts\ExpansionPack\.env.local`, un `CLÉ=valeur` par ligne (UTF-8). Copiez `ExpansionPack\.env.example` et n'écrivez que ceux que vous changez, par exemple :

```
LANGUAGE=fr
ACHIEVEMENT_SOUND_FILE=assets\sounds\local\trophee.mp3
ADD_ON_CLOCK=false
```

Les réglages de l'eXpansion Pack écrivent aussi dans ce fichier. Une clé qu'ils enregistrent et qui n'y est pas encore est ajoutée à la fin, avec au-dessus son commentaire tiré de `.env.example` : vous lisez ce qu'elle fait sans ouvrir ce fichier.

| Réglage | Par défaut | Rôle |
|---|---|---|
| `LANGUAGE` | `en` | Langue : `en`, `fr`, `de`, `es`, `it` ou `pt`. |
| `ADULT_CATEGORY` | `NSFW` | Catégorie PinballY des tables pour adultes, cachées aux Profils enfant. |
| `UNTRACKED_TABLES` | vide | Les tables qui n'en sont pas vraiment, comme un lecteur multimédia lancé comme une table : leurs titres séparés par des virgules, écrits exactement comme dans PinballY (`Media Player,Jukebox`). Elles restent sur la roue et se lancent, mais sortent des statistiques, des Succès et de la table au hasard. Retirée de la liste, une table revient avec ses parties enregistrées. |
| `COMMUNITY_TABLES_MANUFACTURER` | `VPX Community` | Fabricant donné aux tables fictives ou communautaires, pour la ligne d'état et le filtre « Tables Originales ». |
| `LAUNCH_SOUND_FILE` | `assets\sounds\launch.mp3` | Son joué au lancement d'une table : un chemin depuis le dossier du pack (vos sons vont dans `assets\sounds\local\`) ou un chemin complet ; vide = aucun son. |
| `LAUNCH_SOUND_VOLUME` | `50` | Volume du son de lancement, de `0` à `100`. Il est joué hors du son de PinballY : ni les réglages de volume de PinballY ni Pinvol ne le baissent. Avec Pinvol, baissez cette valeur jusqu'à ce que le son s'accorde à vos tables. Une valeur hors de `0`-`100`, ou qui n'est pas un nombre, joue à `50` et est écrite dans `logs\errors.log`. |
| `ACHIEVEMENT_SOUND_FILE` | `assets\sounds\achievement.wav` | Son joué avec chaque annonce de Succès. |
| `PROFILE_GREETING_SOUND_FILE` | `assets\sounds\profile_greeting.mp3` | Son joué quand un joueur est accueilli. |
| `CONFETTI_SOUND_FILE` | `assets\sounds\confetti.wav` | Son joué une fois au début d'une pluie de confettis. |
| `FIREWORKS_SOUND_FILE` | `assets\sounds\fireworks.wav` | Son joué une fois au début du feu d'artifice. |
| `PROFILE_PICKER_SOUND_FILE` | vide | Son joué à chaque apparition du carrousel « Changer de joueur » : au démarrage (`STARTUP_SCREEN=profilePicker`) ou depuis un menu ; aucun n'est fourni avec le pack. |
| `AVATAR_CHOICE_SOUND_FILE` | vide | Son joué une fois quand le Choix de l'Avatar apparaît, après la saisie du nom d'un nouveau Profil ; aucun n'est fourni avec le pack. |
| `STARTUP_SCREEN` | `profilePicker` | Ce que PinballY montre en premier : `profilePicker` (le carrousel « Changer de joueur », puis l'écran d'accueil ; sauté tant que la borne compte moins de deux Profils en plus d'Invité), `welcome` (l'écran d'accueil) ou `wheel` (la roue seule, le dernier joueur salué). Un écran dont la fonctionnalité est désactivée cède la place au suivant, du carrousel à l'écran d'accueil puis à la roue. |
| `ATTRACT_ORDER` | `pinballY` | Comment le mode attract passe d'une table à l'autre : `pinballY` (comme PinballY), `inOrder` (la table suivante de la roue) ou `wholeWheel` (chaque table une fois, mélangées). Réglez-le plutôt dans les Réglages de l'eXpansion pack : l'y enregistrer règle aussi l'option « Switch games every » de PinballY (voir [plus haut](#réglages-de-lexpansion-pack)). |
| `ACHIEVEMENT_TOAST_SECONDS` | `4` | Secondes d'affichage d'une annonce de Succès (60 au plus). |
| `ACHIEVEMENT_TOAST_SCALE` | `1.0` | Taille de l'annonce, de `0.5` à `3` : à augmenter sur un grand écran. |
| `CONFETTI` | `true` | `false` coupe la pluie de confettis qui accompagne l'annonce d'un Défi réussi, d'un Succès Platine, du niveau 10 de maîtrise sur une table ou d'un nouveau palier de la collection, si votre PC peine. |
| `FIREWORKS` | `true` | `false` coupe le feu d'artifice qui accompagne l'annonce d'un nouveau niveau, si votre PC peine. Indépendant de `CONFETTI`. |
| `UPDATE_CHECK` | `true` | `false` empêche PinballY de demander à GitHub, à chaque démarrage, si une version plus récente du pack existe, et de proposer de la mettre à jour (voir [Mises à jour](updates.md)). |
| `OFFER_VPXTOOL` | `true` | `false` empêche le pack de jamais proposer d'installer ou de mettre à jour vpxtool ; vous pouvez toujours l'installer vous-même. |
| `SKIP_RANDOM_GAME_ANIMATION` | `false` | `true` saute la roue de la fortune et lance la table au hasard aussitôt. |
| `ASK_TO_RATE_AFTER_MINUTES_PLAYED` | `60` | Minutes jouées sur une table avant qu'on vous demande de la noter. |
| `LOG_UNTRANSLATED_MENU_TITLES` | `false` | `true` écrit chaque titre de menu PinballY non traduit dans `PinballY.log`. |
| `LOG_LAUNCH_EVENTS` | `false` | `true` écrit chaque événement de lancement dans `PinballY.log`, horodaté à la milliseconde, pour vérifier leur ordre sur la borne. Absent des Réglages de l'eXpansion pack. |
| `WHEEL_RAIL` | `true` | `false` retire le rail de la roue (`#` et A à Z le long du bord droit de l'écran de la roue, ou les décennies avec l'ordre de la roue par année, une pastille dorée sur celle de la table sélectionnée ; voir [Interface](interface.md#sur-lécran-de-la-roue)). |
| `WHEEL_RAIL_YEARS` | `false` | `true` affiche, par année, les années de chaque décennie dessous sur le rail de la roue, plus petites, sur deux chiffres (`84`), la pastille sur l'année de la table sélectionnée (voir [Choisir une table](choosing_a_table.md#ordre-de-la-roue)). La ligne « Rail par année » de la page « Roue » des réglages le règle aussi. |
| `WHEEL_RAIL_SECONDS` | `3` | Secondes pendant lesquelles le rail de la roue reste sans mouvement avant de glisser hors de l'écran ; le mouvement suivant le ramène. Un nombre entier ; `0` le garde toujours affiché. Demande `WHEEL_RAIL=true` (voir [Interface](interface.md#sur-lécran-de-la-roue)). |
| `WHEEL_POSITION` | `true` | `false` retire la position dans la roue (`17/100`, en bas à droite de l'écran de la roue) et rend « Table n/total » à la ligne d'état du bas (voir [Interface](interface.md#sur-lécran-de-la-roue)). |
| `FAVORITE_HEART` | `true` | `false` retire le cœur des favoris (en bas à gauche de l'écran de la roue, rouge sur une table favorite ; voir [Interface](interface.md#sur-lécran-de-la-roue)). |

Chaque fonctionnalité se désactive aussi avec sa clé `ADD_ON_*`, par exemple `ADD_ON_CLOCK=false` ou `ADD_ON_CHALLENGES=false`. `ADD_ON_HOUSEHOLD_CHALLENGE=false` désactive à part le [Défi de la maison](achievements_and_challenges.md#défi-de-la-maison) et sa carte : il fonctionne que les Défis soient activés ou non. Seuls le nettoyage des menus, l'horloge du backglass (`ADD_ON_BACKGLASS_CLOCK`, l'heure sur l'écran du backglass pendant une partie, voir [Interface](interface.md#horloge-du-backglass)) et Discord Rich Presence (`ADD_ON_DISCORD_RICH_PRESENCE`, voir [plus haut](#discord-rich-presence)) sont désactivés par défaut. Chaque clé est décrite dans [.env.example](../../../.env.example).

## Profil admin

Le premier Profil [créé depuis la borne](profiles.md#depuis-la-borne) alors que vous n'avez qu'Invité devient Profil admin de lui-même : choisissez-le dans « Changer de joueur » pour garder les entrées de configuration. Sinon, pour les garder pour vous seul, [créez votre Profil](profiles.md#créer-un-profil) si vous n'avez qu'Invité, choisissez-le dans « Changer de joueur » et faites-en le premier Profil admin : tant qu'aucun Profil n'est marqué, ouvrez **Gérer les profils** dans le menu de sortie (Échap) ou le menu opérateur et choisissez **Devenir admin**, sa seule ligne. Votre Profil est marqué aussitôt et le menu complet s'ouvre. Invité et les Profils enfants ne voient pas l'entrée, puisqu'ils ne peuvent jamais être Profils admin.

Vous pouvez aussi le marquer à la main, PinballY fermé : dans le `Scripts\ExpansionPack\profiles\<nom>\profile.json` de votre Profil, ajoutez `"isAdmin": true,` comme première clé, juste après l'accolade ouvrante. La virgule finale est obligatoire : le JSON en exige une entre deux clés.

```json
{
  "isAdmin": true,
  "version": 1,
  "plays": {
```

Modifier ce fichier reste le moyen de retirer la marque tant que c'est le seul Profil admin : supprimez toute la ligne, virgule comprise. Un `profile.json` que le pack ne peut pas lire est mis de côté en `profile.broken-<date>.json` et votre modification semble disparaître : voir [Dépannage](troubleshooting.md).

Ce Profil marque ensuite les autres depuis la borne : ouvrez **Gérer les profils** dans le menu de sortie ou le menu opérateur, choisissez un Profil puis « Admin : non », qui passe aussitôt à « Admin : oui ». Choisissez-le de nouveau pour retirer la marque.

- Vous pouvez retirer votre propre marque de la même façon tant qu'il reste un autre Profil admin : les menus se ferment alors, puisque vous n'y avez plus accès.
- La ligne Admin du dernier Profil admin est grisée (« Dernier admin ») : seule une modification à la main de son `profile.json` ramène la maison à « tout le monde voit tout ».
- Un Profil n'est jamais à la fois Profil admin et Profil enfant : la ligne Admin d'un Profil enfant est grisée (« Retirez d'abord la marque enfant »), comme celle d'Invité (« Invité n'est jamais marqué ») ; la choisir ne change rien.
- Dès qu'au moins un Profil est marqué, les autres Profils (Invité compris) ne voient plus « Configurer la table » dans le menu principal ni « Menu opérateur » dans le menu de sortie ; les Profils admin voient toujours les deux, et le bouton de service de la porte du monnayeur ouvre toujours le Menu opérateur pour tout le monde.
- Plusieurs Profils peuvent être marqués.
- Invité n'est jamais un Profil admin, et une marque qui n'est ni `true` ni `false`, ou dont la clé est mal écrite (`"isAdmin "`, `"IsAdmin"`), est ignorée et signalée dans `PinballY.log`.
- L'invite de mise à jour, la proposition de vpxtool (voir [Installation](install.md#vpxtool)) et les toasts « Problème » destinés au propriétaire ne s'affichent qu'aux Profils admin, ou à tous tant qu'aucun Profil n'est marqué (voir [Mises à jour](updates.md) et [Dépannage](troubleshooting.md)).

## Réinitialiser un profil

Un Profil admin trouve aussi **Gérer les profils** à deux endroits : dans le menu de sortie (Échap), juste après « Changer de joueur », au-dessus de « Menu opérateur » ; et dans le menu opérateur, juste après **Réglages de l'eXpansion pack**, dans leur propre groupe sous « Capture par lot ». Les autres Profils ne le voient jamais, même quand le bouton de service de la porte du monnayeur ouvre le menu opérateur. Il liste tous les Profils, Invité et vous-même compris, plus « Réinitialiser tous les profils », dès qu'il y en a au moins deux, pour remettre toute la maison à zéro d'un coup. Choisir un Profil ouvre son propre menu : ses marques admin et enfant (voir [Profil admin](#profil-admin) et [Profil enfant](#profil-enfant)), ses **Initiales** (voir [Initiales](#initiales)), **Reprendre l'historique de PinballY** (voir [Reprise de l'historique](#reprise-de-lhistorique)) et **Réinitialiser**. Avec les [menus dessinés](interface.md#menus-dessinés), Échap ou « Retour » y ramène à la liste ; sans eux, les deux ferment le menu.

- Après une confirmation (le curseur part sur « Non »), « Réinitialiser » ou « Réinitialiser tous les profils » fait repartir le Profil de zéro : ses parties, ses séries, ses records de session, ses parties aléatoires, sa progression aux défis, ses succès annoncés, sa maîtrise des tables, son palier de collection et ses cadres d'Avatar sont effacés, tandis que son nom, son avatar, ses marques et les meilleurs scores qu'il a gagnés restent. Seuls les scores gagnés depuis comptent pour lui, sauf les places que ses [initiales](#initiales) ont prises.
- Un message indique ensuite si l'opération a réussi.
- Ses anciens fichiers sont gardés à côté, sous les noms `profile.reset-<date>.json` et `play-log-<année>.reset-<date>.json` : pour annuler une réinitialisation, fermez PinballY et renommez chaque copie sans sa partie `.reset-<date>`.
- Si vous avez désactivé le menu de sortie dans les options de PinballY, le bouton de service de la porte du monnayeur ouvre toujours le menu opérateur, et « Gérer les profils » avec lui.
- Une réinitialisation efface aussi ce que le Profil a repris de l'historique de PinballY, et la reprise n'est plus proposée.

### Initiales

Les **initiales** d'un Profil sont les trois lettres qui le désignent sur les tableaux des meilleurs scores des tables, comme « FEL » : les meilleurs scores qui les portent et n'appartiennent à aucun Profil, faits avant le pack par exemple, deviennent ceux de ce Profil. La ligne, dans le propre menu d'un Profil juste après ses marques, les affiche (« Initiales : FEL »), ou « Initiales : aucune ».

- La choisir ouvre la saisie du nom avec les initiales actuelles déjà entrées : lettres capitales de A à Z seulement, effacer et OK, trois lettres au plus. Dès la troisième lettre, le curseur passe sur OK et les lettres sont grisées : seuls effacer et OK restent à choisir.
- OK demande confirmation, en disant combien de places de meilleur score, sur combien de tables, les initiales vont prendre, avec le nom de ces tables l'un sous l'autre (« ... » au-delà de dix) ; « Non » ne change rien. « Oui » les enregistre et donne ces places au Profil, puis dit combien il en a pris, ou qu'aucune ne les porte encore. Les succès que ces places atteignent sont débloqués sans encart, même quand le Profil est choisi plus tard.
- Les changer rend, comme scores par défaut, les places que les anciennes initiales avaient prises, avant que les nouvelles prennent les leurs ; la confirmation dit combien. Un score que le Profil a gagné dans une partie reste le sien, et un record de table perdu sur une place rendue n'est plus annoncé à l'écran d'accueil.
- OK avec toutes les lettres effacées les retire, après une confirmation qui dit combien de places elles rendent ; Échap ne change rien. Le menu du Profil revient ensuite, sur ses initiales.
- Supprimer un Profil libère ses initiales pour un autre Profil.
- Des initiales qu'un autre Profil a déjà sont refusées, en le nommant, et OK reste grisé tant que trois lettres ne sont pas entrées (sauf pour les retirer).
- Invité n'a jamais d'initiales : sa ligne est grisée. La ligne n'apparaît pas tant que l'Add-on des meilleurs scores est désactivé.
- Une réinitialisation garde les initiales, comme le nom, l'Avatar et les marques, et les places qu'elles ont prises comptent toujours dans Scores de la maison, Vos 5 meilleurs scores et Mes meilleurs scores. Les succès des meilleurs scores que ces places atteignent sont débloqués de nouveau sans encart.
- Écrites à la main, `"initials": "FEL"` dans le `profile.json` du Profil doivent être trois lettres capitales ; autre chose est ignoré et noté dans le journal.

### Reprise de l'historique

PinballY compte, pour chaque table, les parties jouées, le temps de jeu et la date de la dernière partie, depuis bien avant le pack, dans `GameStats.csv` de son dossier d'installation. **Reprendre l'historique de PinballY**, dans le propre menu d'un Profil juste avant « Réinitialiser », donne cet historique à ce Profil : choisissez le Profil qui a vraiment joué. Le pack ne fait que lire les stats de PinballY, il ne les modifie jamais.

**Attention : une seule fois par borne, et pour de bon.** Une fois faite, la reprise de l'historique n'est plus jamais proposée, sur aucun Profil, même après une réinitialisation de celui qui l'a reçue.

- Une confirmation (le curseur part sur « Non ») indique combien de parties, d'heures et de tables seraient ajoutées ; un message dit ensuite ce qui a été repris, ou que l'opération a échoué (la cause est dans le journal), auquel cas rien n'a changé.
- Ce que chaque Profil, Invité compris, a déjà joué avec le pack est retiré des comptes de PinballY : aucune partie ne compte deux fois. Les tables non suivies sont laissées de côté.
- La date de dernière partie de PinballY n'est reprise que pour une table que le Profil n'a jamais jouée avec le pack.
- Les parties vont dans les totaux par table du Profil (maîtrise des tables, temps de jeu, tables favorites et poussiéreuses), jamais dans son journal des parties : séries quotidiennes et récompenses de Profil restent intactes.
- Les succès, niveaux de maîtrise et paliers de collection que l'historique atteint sont débloqués sans toast, même quand le Profil est choisi plus tard : pas de déluge de toasts, et la partie suivante n'annonce que ce qu'elle atteint elle-même.
- Le compte peut être un peu élevé : PinballY compte aussi les lancements de moins d'une minute.
- La ligne est grisée avec sa raison pour Invité, une fois l'historique de la borne repris (en nommant le Profil qui l'a reçu), et quand il ne reste rien à reprendre.

## Profil enfant

Pour tenir les tables pour adultes à l'écart d'un enfant, donnez-leur dans PinballY la catégorie `NSFW` (ou nommez votre propre catégorie avec `ADULT_CATEGORY` dans `Scripts\ExpansionPack\.env.local`, écrite exactement comme dans PinballY), puis marquez le Profil de l'enfant : depuis un Profil admin, ouvrez **Gérer les profils** dans le menu de sortie ou le menu opérateur, choisissez le Profil de l'enfant puis « Enfant : non », qui passe aussitôt à « Enfant : oui ». Choisissez-la de nouveau pour retirer la marque.

- La ligne Enfant d'un Profil admin est grisée (« Retirez d'abord la marque admin »), comme celle d'Invité (« Invité n'est jamais marqué ») : la choisir ne change rien.
- Vous pouvez toujours marquer un Profil à la main : ajoutez `"isChild": true` au premier niveau de son `Scripts\ExpansionPack\profiles\<nom>\profile.json`, PinballY fermé.
- Un Profil marqué de nouveau retrouve ses succès à lui comme il les avait laissés, sans nouvelle annonce.
- Tant que ce Profil est actif, ces tables n'apparaissent sur la roue sous aucun filtre, la partie aléatoire n'en tire jamais et le démarrage ne laisse jamais la roue sur l'une d'elles ; passer à un autre Profil les fait revenir aussitôt.
- La table du jour et la table de la semaine restent les mêmes pour toute la maison : tant que l'une d'elles est une table pour adultes, l'enfant n'a pas sa carte sur l'écran d'accueil, et ce jour ou cette semaine ne prolonge ni ne casse sa série.
- Invité n'est jamais un Profil enfant : les adultes de passage voient toute la collection.
- Un Profil enfant a trois succès rien qu'à lui (voir [Succès et défis](achievements_and_challenges.md)).
- Ce n'est pas un contrôle parental : rien ne demande de mot de passe.

---

[← Sommaire du guide](index.md)

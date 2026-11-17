# Réglages

[← Sommaire du guide](index.md)

Pour le propriétaire de la borne :

- **Réglages de l'eXpansion pack** : depuis le menu opérateur, activer ou désactiver chaque Add-on par catégorie, choisir l'écran de démarrage et la langue, puis redémarrer PinballY d'une pression.
- **Profil admin** : les entrées de configuration pour vous seul.
- **Profil enfant** : une roue sans tables pour adultes.
- **Gérer les profils** : marquer un Profil admin ou un Profil enfant, ou faire repartir de zéro un Profil ou toute la maison d'un coup.
- **Nettoyage des menus** : des menus PinballY allégés (voir [Interface](interface.md#nettoyage-des-menus)).

Tout tient dans un seul dossier, sans modifier PinballY.

## Réglages de l'eXpansion pack

**Réglages de l'eXpansion pack**, dans le menu opérateur, règle les Add-ons, l'écran de démarrage, la langue, l'ordre du mode attract et le mode hors ligne sans éditer aucun fichier, puis redémarre PinballY d'une pression. On y trouve aussi « Mettre à jour en vX.Y.Z » après avoir répondu « Plus tard » à l'invite de mise à jour (voir [Mises à jour](updates.md)), et, tant que l'Add-on « ROM des tables » est activé, une ligne vpxtool (voir [Installation](install.md#vpxtool) et [Mises à jour](updates.md#garder-vpxtool-à-jour)) :

- « Installer vpxtool v0.38.0 » tant que vpxtool manque ;
- « Mettre à jour vpxtool (v0.37.1 → v0.38.0) » tant que le vôtre est plus ancien que la version que nomme le pack ;
- « Mettre à jour vpxtool », grisée avec « vpxtool v0.38.0 est à jour » en dessous, quand le vôtre est à cette version ou plus récent.

Sous « Joueurs et progression », **Notes par Profil** donne à chaque Profil ses propres notes et ses tables favorites, gardées dans un fichier `ratings.json` de son dossier. La première fois, chaque Profil, Invité compris, reçoit les notes et les favoris déjà présents sur la borne. Désactivé, tout le monde partage de nouveau les notes et les favoris de PinballY, et les Succès de notes disparaissent (`ADD_ON_PROFILE_RATINGS=false`).

Sous « Menus et filtres », **Jeux cachés** est activé par défaut : certaines surprises débloquent des entrées de menu, ne soyez donc pas surpris d'en voir apparaître une dans le menu principal d'un joueur. Désactivé, ces entrées n'apparaissent jamais (`ADD_ON_ROCKET_GAME=false`). **Ordre de la roue** est activé aussi, sa roue alphabétique jusqu'à ce qu'un joueur la passe par année ; désactivé, « Changer de filtre » perd son entrée d'ordre et la roue reste alphabétique (`ADD_ON_WHEEL_ORDER=false`, voir [Ordre de la roue](choosing_a_table.md#ordre-de-la-roue)). La ligne « Mode attraction » ci-dessous en dépend : elle n'apparaît que si Ordre de la roue est activé, et, Ordre de la roue désactivé, le mode attract est celui de PinballY.

Sous « Écran de la roue », **Repères de la roue** montre où vous en êtes sur la roue : le rail de la roue, les lettres (ou les décennies) le long du bord droit avec une pastille dorée sur celle de la table sélectionnée, la position dans la roue, la place de la table sélectionnée parmi les tables de la roue, en bas à droite, et le cœur des favoris, rouge sur une table favorite, en bas à gauche (voir [Interface](interface.md#sur-lécran-de-la-roue)). Désactivé, « Table n/total » revient dans la ligne d'état du bas (`ADD_ON_WHEEL_GUIDES=false` ; dans `.env.local`, `WHEEL_RAIL=false` retire le rail de la roue seul, `WHEEL_POSITION=false` retire la position dans la roue seule, `FAVORITE_HEART=false` le cœur des favoris seul). Pour qu'un bouton de flipper gardé enfoncé fasse défiler la roue au rythme réglé sur la borne, mettez l'option « Auto-repeat rate » de PinballY (Options, Game Wheel) à `180ms` : le pack ne la change jamais.

Sous « Lancer et jouer une table », **Écran de lancement** évite l'écran noir pendant le chargement d'une table (`ADD_ON_SEAMLESS_LAUNCH_OVERLAY=false` pour le désactiver). Si un autre script que vous faites tourner dans PinballY, comme un script de vidéo de lancement, prend l'écran de lancement avant le pack, celui du pack s'affiche quand même, et de retour sur la roue un **Avis de conflit** indique à un [Profil admin](#profil-admin) (à tout le monde tant qu'aucun profil n'est admin) quelle ligne retirer de `Scripts\main.js` pour ne garder que celui du pack. « Garder les deux », ou Exit, laisse tout en l'état, et l'avis ne revient plus jamais sur cette borne, même après une mise à jour du pack.

La ligne **Mode attraction**, après la langue, choisit comment le mode attract passe d'une table à l'autre quand la borne reste inactive :

- **Comme PinballY** (par défaut) : PinballY saute quelques tables au hasard à chaque changement, comme sans le pack.
- **Dans l'ordre** : chaque changement passe à la table suivante de la roue, avec le tour d'un cran de PinballY, et reprend à la première après la dernière. Avec la roue par année, le mode attract devient une visite chronologique.
- **Toute la roue** : chaque table de la roue est montrée une fois, dans un ordre mélangé, avant qu'aucune ne revienne, jamais la table déjà à l'écran. Chaque changement est un tour rapide de la roue, et chaque nouveau mode attract mélange à nouveau.

Pour cela, le pack prend la main sur les changements de PinballY : enregistrer « Dans l'ordre » ou « Toute la roue » garde la valeur de l'option « Switch games every » de PinballY, met à sa place une valeur d'un jour pour que PinballY ne change plus de table, et change lui-même de table à l'intervalle que vous aviez réglé. Enregistrer « Comme PinballY », ou désactiver Ordre de la roue, rend votre valeur. Si vous changez entre-temps « Switch games every » dans les options de PinballY, le pack retient votre nouvelle valeur au démarrage suivant : PinballY change de table avec elle pendant cette session, le pack à partir du démarrage d'après. Comme les autres lignes, le choix s'applique au redémarrage de PinballY (`ATTRACT_ORDER`). **Avant de retirer le pack, remettez le mode attraction sur « Comme PinballY »** : sinon le mode attract de PinballY garde la valeur d'un jour et ne change plus jamais de table.

Tant que le pack n'a pas lu une fois la version de votre vpxtool (une dizaine de secondes après le premier démarrage qui le trouve), ou si cette version est illisible, il n'y a pas de ligne vpxtool.

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
| `ACHIEVEMENT_SOUND_FILE` | `assets\sounds\achievement.wav` | Son joué avec chaque annonce de Succès. |
| `PROFILE_GREETING_SOUND_FILE` | `assets\sounds\profile_greeting.mp3` | Son joué quand un joueur est accueilli. |
| `CONFETTI_SOUND_FILE` | `assets\sounds\confetti.wav` | Son joué une fois au début d'une pluie de confettis. |
| `FIREWORKS_SOUND_FILE` | `assets\sounds\fireworks.wav` | Son joué une fois au début du feu d'artifice. |
| `PROFILE_PICKER_SOUND_FILE` | vide | Son joué à chaque apparition du carrousel « Changer de joueur » : au démarrage (`STARTUP_SCREEN=profilePicker`) ou depuis un menu ; aucun n'est fourni avec le pack. |
| `AVATAR_CHOICE_SOUND_FILE` | vide | Son joué une fois quand le Choix de l'Avatar apparaît, après la saisie du nom d'un nouveau Profil ; aucun n'est fourni avec le pack. |
| `STARTUP_SCREEN` | `profilePicker` | Ce que PinballY montre en premier : `profilePicker` (le carrousel « Changer de joueur », puis l'écran d'accueil ; sauté tant que la borne compte moins de deux Profils en plus d'Invité), `welcome` (l'écran d'accueil) ou `wheel` (la roue seule, le dernier joueur salué). Un écran dont la fonctionnalité est désactivée cède la place au suivant, du carrousel à l'écran d'accueil puis à la roue. |
| `ATTRACT_ORDER` | `pinballY` | Comment le mode attract passe d'une table à l'autre, seulement si Ordre de la roue est activé : `pinballY` (comme PinballY), `inOrder` (la table suivante de la roue) ou `wholeWheel` (chaque table une fois, mélangées). Réglez-le plutôt dans les Réglages de l'eXpansion pack : l'y enregistrer règle aussi l'option « Switch games every » de PinballY (voir [plus haut](#réglages-de-lexpansion-pack)). |
| `ACHIEVEMENT_TOAST_SECONDS` | `4` | Secondes d'affichage d'une annonce de Succès (60 au plus). |
| `ACHIEVEMENT_TOAST_SCALE` | `1.0` | Taille de l'annonce, de `0.5` à `3` : à augmenter sur un grand écran. |
| `CONFETTI` | `true` | `false` coupe la pluie de confettis qui accompagne l'annonce d'un Défi réussi, d'un Succès Platine, du niveau 10 de maîtrise sur une table ou d'un nouveau palier de la collection, si votre PC peine. |
| `FIREWORKS` | `true` | `false` coupe le feu d'artifice qui accompagne l'annonce d'un nouveau niveau, si votre PC peine. Indépendant de `CONFETTI`. |
| `UPDATE_CHECK` | `true` | `false` empêche PinballY de demander à GitHub, à chaque démarrage, si une version plus récente du pack existe, et de proposer de la mettre à jour (voir [Mises à jour](updates.md)). |
| `OFFER_VPXTOOL` | `true` | `false` empêche le pack de jamais proposer d'installer ou de mettre à jour vpxtool ; vous pouvez toujours l'installer vous-même. |
| `SKIP_RANDOM_GAME_ANIMATION` | `false` | `true` saute la roue de la fortune et lance la table au hasard aussitôt. |
| `ASK_TO_RATE_AFTER_MINUTES_PLAYED` | `60` | Minutes jouées sur une table avant qu'on vous demande de la noter. |
| `LOG_UNTRANSLATED_MENU_TITLES` | `false` | `true` écrit chaque titre de menu PinballY non traduit dans `PinballY.log`. |
| `LOG_LAUNCH_EVENTS` | `false` | `true` écrit chaque événement de lancement dans `PinballY.log`, horodaté à la milliseconde, pour vérifier leur ordre sur la borne. |
| `WHEEL_RAIL` | `true` | `false` retire le rail de la roue (`#` et A à Z le long du bord droit de l'écran de la roue, ou les décennies avec l'ordre de la roue par année, une pastille dorée sur celle de la table sélectionnée ; voir [Interface](interface.md#sur-lécran-de-la-roue)). |
| `WHEEL_RAIL_YEARS` | `false` | `true` affiche, par année, les années de chaque décennie dessous sur le rail de la roue, plus petites, sur deux chiffres (`84`), la pastille sur l'année de la table sélectionnée (voir [Choisir une table](choosing_a_table.md#ordre-de-la-roue)). |
| `WHEEL_RAIL_SECONDS` | `3` | Secondes pendant lesquelles le rail de la roue reste sans mouvement avant de glisser hors de l'écran ; le mouvement suivant le ramène. Un nombre entier ; `0` le garde toujours affiché. Demande `WHEEL_RAIL=true` (voir [Interface](interface.md#sur-lécran-de-la-roue)). |
| `WHEEL_POSITION` | `true` | `false` retire la position dans la roue (`17/100`, en bas à droite de l'écran de la roue) et rend « Table n/total » à la ligne d'état du bas (voir [Interface](interface.md#sur-lécran-de-la-roue)). |
| `FAVORITE_HEART` | `true` | `false` retire le cœur des favoris (en bas à gauche de l'écran de la roue, rouge sur une table favorite ; voir [Interface](interface.md#sur-lécran-de-la-roue)). |

Chaque fonctionnalité se désactive aussi avec sa clé `ADD_ON_*`, par exemple `ADD_ON_CLOCK=false` ou `ADD_ON_CHALLENGES=false`. Seuls le nettoyage des menus, l'horloge du backglass (`ADD_ON_BACKGLASS_CLOCK`, l'heure sur l'écran du backglass pendant une partie, voir [Interface](interface.md#horloge-du-backglass)) et Discord Rich Presence (`ADD_ON_DISCORD_RICH_PRESENCE`, voir [plus haut](#discord-rich-presence)) sont désactivés par défaut. Chaque clé est décrite dans [.env.example](../../../.env.example).

La progression de chaque Profil est enregistrée dans `Scripts\ExpansionPack\profiles`. Gardez ce dossier quand vous réinstallez ou mettez à jour le pack, et vous retrouvez votre progression.

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

Un Profil admin trouve aussi **Gérer les profils** à deux endroits : dans le menu de sortie (Échap), juste après « Changer de joueur », au-dessus de « Menu opérateur » ; et dans le menu opérateur, juste après **Réglages de l'eXpansion pack**, dans leur propre groupe sous « Capture par lot ». Les autres Profils ne le voient jamais, même quand le bouton de service de la porte du monnayeur ouvre le menu opérateur. Il liste tous les Profils, Invité et vous-même compris, plus « Réinitialiser tous les profils », dès qu'il y en a au moins deux, pour remettre toute la maison à zéro d'un coup. Choisir un Profil ouvre son propre menu : ses marques admin et enfant (voir [Profil admin](#profil-admin) et [Profil enfant](#profil-enfant)) et **Réinitialiser**. Avec les [menus dessinés](interface.md#menus-dessinés), Échap ou « Retour » y ramène à la liste ; sans eux, les deux ferment le menu.

- Après une confirmation (le curseur part sur « Non »), « Réinitialiser » ou « Réinitialiser tous les profils » fait repartir le Profil de zéro : ses parties, ses séries, ses records de session, ses parties aléatoires, sa progression aux défis, ses succès annoncés, sa maîtrise des tables, son palier de collection et ses cadres d'Avatar sont effacés, tandis que son nom, son avatar, ses marques et les meilleurs scores qu'il a gagnés restent.
- Un message indique ensuite si l'opération a réussi.
- Ses anciens fichiers sont gardés à côté, sous les noms `profile.reset-<date>.json` et `play-log-<année>.reset-<date>.json` : pour annuler une réinitialisation, fermez PinballY et renommez chaque copie sans sa partie `.reset-<date>`.
- Si vous avez désactivé le menu de sortie dans les options de PinballY, le bouton de service de la porte du monnayeur ouvre toujours le menu opérateur, et « Gérer les profils » avec lui.

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

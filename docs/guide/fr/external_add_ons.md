# Avec vos Add-ons externes

[← Sommaire du guide](index.md)

Un **Add-on externe** est tout script que vous faites tourner dans PinballY à côté du pack : écrit par vous, copié de l'aide de PinballY, pris dans le dépôt officiel [PinballY-Addons-and-Examples](https://github.com/PinballY/PinballY-Addons-and-Examples), ou partagé par un auteur de la communauté comme RichardL64 ou timhobbs. La plupart tournent très bien à côté du pack. Quelques-uns prennent le même écran qu'un Add-on du pack, et un seul des deux peut alors l'emporter. Cette page liste ceux qu'on connaît, ce que vous voyez, et quoi faire.

Les noms d'Add-ons ci-dessous sont ceux des **Réglages de l'eXpansion pack**, dans le menu opérateur (voir [Réglages](settings.md)).

## Pourquoi la ligne du pack va en dernier

PinballY exécute un seul fichier, `Scripts\main.js`, et chaque autre script seulement par une ligne `import` qu'il contient. Les scripts importés avant le pack passent en premier sur chaque événement de PinballY, et le pack peut alors voir ce qu'ils ont fait : un lancement annulé, un message de lancement effacé, une entrée de menu ajoutée. Un script importé après le pack agit après lui, sans laisser de trace que le pack puisse lire.

Donc **la ligne du pack doit être la dernière ligne de `Scripts\main.js`** (voir [Installation](install.md)). Si une autre ligne `import(` la suit, un **avis de conflit** au démarrage demande à un Profil admin (à tous, tant qu'aucun Profil n'est admin) de déplacer la ligne du pack à la fin, une seule fois pour la borne.

## Ce que le pack règle tout seul

Ces chevauchements sont corrigés du côté du pack. Vous ne voyez rien, et il n'y a rien à faire :

- **Un lancement qu'un autre script a annulé** (`Spin.js` de RichardL64, qui annule un lancement venu trop tôt après le relâchement du plongeur) : le pack le traite comme s'il n'y avait pas de lancement. L'**Horloge du backglass** ne s'affiche pas, **Meilleurs scores** ne lit aucun tableau, et aucune surprise du pack ne démarre dessus.
- **Un message de lancement qu'un autre script a effacé** (`LaunchVideo.js` de RichardL64, `launchAnimations.js` de timhobbs avec son option active) : **Traduction de PinballY** le laisse vide au lieu d'y remettre sa traduction.
- **Une entrée « Table setup » qu'un autre script a déjà ajoutée au menu principal** (le `command_example` officiel) : l'entrée « Configurer la table » du pack (l'Add-on **Configurer la table**) lui laisse sa place, et le menu n'en montre qu'une.

## Ce que le pack vous signale : l'écran de lancement

Quand un script importé avant le pack prend l'écran de lancement, l'**Écran de lancement** du pack affiche quand même le sien par-dessus, et votre vidéo ou image de lancement n'apparaît jamais. De retour sur la roue, un **avis de conflit** explique à un [Profil admin](settings.md#profil-admin) (à tous, tant qu'aucun Profil n'est admin) ce qui s'est passé, et quelle ligne retirer de `Scripts\main.js` pour ne garder que l'écran du pack. S'il trouve un script de lancement connu dans `Scripts` ou ses sous-dossiers (`LaunchVideo.js`, `LaunchFade.js`, `launchAnimations.js`, `FlexDMD.js`, ou une ancienne copie de `seamless_launch_overlay.js`), il le nomme après « Probablement : ».

- « Désactiver « Écran de lancement » » rend l'écran de lancement à votre script : il enregistre l'[Écran de lancement](settings.md#réglages-de-lexpansion-pack) désactivé, puis propose « Redémarrer maintenant » ou « Plus tard ».
- « Garder les deux », ou Exit, laisse tout en l'état.
- Après l'une ou l'autre réponse, l'avis ne revient plus jamais sur cette borne, même après une mise à jour du pack ou si vous réactivez l'Écran de lancement.

Pour garder plutôt l'écran de lancement du pack, retirez la ligne d'import de votre script de `Scripts\main.js`.

## Script par script

| Add-on externe | Ce que vous voyez à côté du pack | Quoi faire |
|---|---|---|
| `LaunchVideo.js` de RichardL64 | Le Loader du pack au lieu de votre vidéo de lancement. Pendant la partie, le Loader de fermeture se cache derrière l'écran noir que laisse `LaunchVideo.js`. Un avis de conflit le signale. | Pour garder votre vidéo : désactivez **Écran de lancement** (depuis l'avis, ou dans les réglages). Pour garder l'écran du pack : retirez la ligne d'import de `LaunchVideo.js`. |
| `LaunchFade.js` de RichardL64 | Le Loader du pack au lieu de la roue assombrie. Un avis de conflit le signale. | Désactivez **Écran de lancement**, ou retirez la ligne d'import de `LaunchFade.js`. |
| `launchAnimations.js` de timhobbs | Le Loader du pack au lieu de votre animation de lancement. Un avis de conflit le signale. | Désactivez **Écran de lancement**, ou retirez la ligne d'import de `launchAnimations.js`. |
| `seamless-launch` officiel ; les exemples « Seamless Loading », « Launch Backgrounds » et « Custom Launch Videos » de l'aide | Le Loader du pack au lieu de votre image ou vidéo de lancement ; `seamless-launch` fait déjà ce que fait l'Écran de lancement. Un avis de conflit le signale. | Retirez les lignes de l'exemple (l'Écran de lancement du pack fait la même chose, avec un Loader), ou désactivez **Écran de lancement** pour garder votre image ou vidéo. |
| `FlexDMD` officiel | Son image de lancement est remplacée par le Loader du pack ; son DMD fonctionne. Un avis de conflit le signale. | Désactivez **Écran de lancement** pour garder son image de lancement. |
| `seamless-launch-spinner` officiel | Le Loader du pack au lieu de sa vidéo d'attente. **Pas d'avis de conflit** : ce script ne marque pas l'écran de lancement comme pris, le pack ne peut donc pas le voir. | Désactivez **Écran de lancement**, ou retirez la ligne d'import de `seamless-launch-spinner`. |
| `Startup.js` de RichardL64 | Son texte « Loading startup game... » est remplacé par le message de lancement traduit de PinballY, et caché tant que l'Écran de lancement est actif. | Rien, sauf si vous tenez à son texte : désactivez alors **Écran de lancement** et **Traduction de PinballY** (qui arrête aussi de traduire les menus de PinballY). |
| « Hide a Window During Play » de l'aide ; `toggleWindows` de timhobbs (`gameEvents.js`, `forceCapture.js`) | Eux comme l'Add-on **Backglass** du pack cachent le backglass pendant une partie et le remontrent après. **Pas d'avis de conflit** : le pack ne peut pas voir qui a caché une fenêtre. | Gardez-en un : retirez l'extrait, ou désactivez **Backglass** si votre script cache aussi le DMD et le topper et que vous le préférez. |
| `wheel-actions` officiel | Son propre menu, ni dessiné dans le style du pack ni traduit, sur les entrées de roue qu'il ajoute : il empêche tous les scripts suivants de voir ce menu. **Pas d'avis de conflit.** | Rien : les **Menus dessinés** du pack dessinent toujours tous les autres menus. |
| `Spin.js` de RichardL64 | Rien : un lancement qu'il annule reste annulé. | Rien. |
| `command_example` officiel | Une seule entrée « Table setup » dans le menu principal, la sienne. | Rien. |
| `FlexDMD`, `two-tables-one-wheel` officiels | Ils lancent eux-mêmes certaines tables, à la place de « Jouer » de PinballY : le lancement est le leur. | Rien. |
| Les scripts qui ajoutent des entrées de menu (`tableEdit.js`, `forceCapture.js` de timhobbs, exemples officiels) | Leurs entrées sont dessinées dans le style du pack, avec leurs propres mots : le pack ne les traduit pas. Avec `LOG_UNTRANSLATED_MENU_TITLES=true`, elles sont listées comme non traduites dans `PinballY.log`. | Rien. |
| `Filter.js`, `FilterTop.js` de RichardL64 | Ils tournent très bien. Avec l'**Ordre de la roue** par année, un filtre qu'ils choisissent s'affiche par année, comme un filtre choisi depuis « Changer de filtre ». | Rien. |
| `CategoryButtons` officiel | Il tourne très bien, mais une catégorie qu'il choisit reste par ordre alphabétique même avec l'**Ordre de la roue** par année : il change de filtre sans prévenir les autres scripts. | Rien ; choisissez la catégorie depuis « Changer de filtre » pour la voir par année. |
| `AttractFade.js`, `AutoOff.js` de RichardL64 ; `auto_shutdown` officiel | Ils tournent très bien : ils ne font qu'écouter le mode attract, et la ligne **Mode attraction** des Réglages de l'eXpansion pack règle toujours le parcours des tables. | Rien. |

## Les scripts qui tournent très bien à côté du pack

En plus des scripts marqués « Rien » ci-dessus, ceux-ci ne partagent aucun écran avec le pack : `FlexDMD.js` de RichardL64 (il ne pilote que le DMD), les exemples officiels `show_instruction_card`, `start_random_table`, `sleep_computer`, `BatchCategoryTagging`, `MissingMediaFilter`, `meta_filters`, `additional_filters`, `menu_submenu_batch_file` et `PinMAME_functions`, et `showApronCard.js` et `vpcHighScores.js` de timhobbs. Gardez-les.

## Un script cassé peut empêcher le pack de démarrer

Un script qui échoue au chargement peut empêcher tout le pack de se charger, même si la ligne du pack est séparée : pas de menus dessinés, pas de badge de Profil, et `info.log` n'est pas réécrit, puisqu'aucun code du pack n'a tourné. Cela arrive surtout avec un script enregistré depuis la page web de GitHub au lieu du fichier lui-même : le fichier contient alors du HTML, et `PinballY.log` montre une erreur comme `Unexpected token '<'`.

- **Regardez dans `PinballY.log`**, dans le dossier de PinballY. La ligne du pack écrit `ExpansionPack not loaded (…): look for a script error just above in this log` (`ExpansionPack: …` avec la ligne des installations plus anciennes) : la ligne juste au-dessus nomme le script fautif.
- **Téléchargez les scripts avec le bouton Raw de GitHub**, sur la page du script, puis enregistrez cette page ; ou retirez la ligne d'import de ce script de `Scripts\main.js`.

---

[← Sommaire du guide](index.md)

# Dépannage

[← Sommaire du guide](index.md)

## Le toast « Problème »

Quand quelque chose échoue que vous ne verriez pas autrement, et qui ne se réparera pas au démarrage suivant, le pack le dit avec un toast comme ceux des succès, mais avec sa propre couleur, un panneau d'avertissement au lieu d'un trophée et le titre « Problème ». Il dit en une phrase ce que l'échec a coûté et, pour un Profil admin, quoi faire. Il reste affiché plus longtemps que les autres toasts, et n'interrompt jamais une partie.

| Le toast dit | Qui le voit | Quoi faire |
|---|---|---|
| « Cette partie n'a pas pu être enregistrée : elle ne comptera pas dans vos statistiques. » | Le Profil qui a joué, après les autres toasts de cette partie. | Chercher la cause dans le journal des erreurs. |
| « Cette partie a été comptée, mais elle manque à votre historique de parties. » | Le Profil qui a joué, après les autres toasts de cette partie. | Chercher la cause dans le journal des erreurs. |
| « La mise à jour en vX.Y.Z a échoué : la version précédente reste en place. Détails dans … » | Un Profil admin (ou tout le monde tant qu'aucun Profil n'est marqué), une seule fois, en attendant qu'il soit actif. | Lire le journal du programme de mise à jour qu'il nomme, `%TEMP%\PinballYExpansionPack\pack-update.log` (voir [Mises à jour](updates.md)). |

Un échec qui répond à un choix que vous venez de faire (une réinitialisation de profil, le téléchargement d'une mise à jour, l'installation de vpxtool) garde son propre message sur cet écran, au lieu d'un toast.

| Le message dit | Que faire |
|---|---|
| « vpxtool n'a pas pu être installé ; rien n'a changé. Vous pouvez réessayer depuis les Réglages de l'eXpansion pack. » (ou « … mis à jour … » pour une mise à jour) | La borne est peut-être hors ligne, le téléchargement a pu être coupé ou bloqué par l'antivirus, ou `vpxtool.exe` est en cours d'utilisation. Votre ancien `vpxtool.exe`, s'il y en avait un, est toujours en place. Lisez `%TEMP%\PinballYExpansionPack\script-reader-install.log`, puis réessayez, ou installez vpxtool à la main (voir [Installation](install.md#vpxtool)). |

## Le toast « Avertissement »

Quand quelque chose que vous avez activé ne fonctionnera pas pour le reste de la session, le pack le dit une seule fois avec un toast ambre, le titre « Avertissement » et un panneau d'avertissement. Ce n'est pas un échec du pack : il n'est donc pas écrit dans le journal des erreurs. Comme tous les toasts, il attend la roue, après l'écran d'accueil et le choix du Profil, et n'interrompt jamais une partie.

| Le toast dit | Qui le voit | Quoi faire |
|---|---|---|
| « Discord introuvable : la table jouée n'apparaîtra pas sur Discord. Lancez Discord avant PinballY. » | Le Profil actif, quel qu'il soit, une fois par session. | Lancez Discord avant PinballY, puis redémarrez PinballY. Le pack essaie trois fois pendant les 30 premières secondes, et cesse d'essayer si Discord se ferme ou refuse la connexion ensuite (voir [Discord Rich Presence](settings.md#discord-rich-presence)). |

## Le journal des erreurs (`errors.log`)

PinballY recrée `PinballY.log` à chaque lancement : le pack écrit donc aussi chaque erreur qu'il rencontre dans son propre journal des erreurs, qui survit aux redémarrages :

- **Où** : `PinballY\Scripts\ExpansionPack\errors.log`.
- **Quoi** : une ligne par erreur, avec sa date, son heure, la version du pack et l'add-on en cause, et la pile d'appels en retrait en dessous. Les avertissements et les informations ne vont que dans `PinballY.log`.
- **Taille** : au-delà de 1 Mo, il devient `errors.old.log` au démarrage suivant, et un nouveau `errors.log` commence.
- Il est conservé à chaque mise à jour du pack, et ne peut jamais être désactivé.

Les toasts n'y renvoient jamais le joueur : il est pour le propriétaire de la borne. **Joignez `errors.log` (et `errors.old.log` s'il existe) quand vous signalez un problème.**

## `PinballY.log`

Le journal de PinballY lui-même, dans le dossier de PinballY, ne couvre que la session en cours. À chaque démarrage, il liste vos réglages de `.env.local`, une ligne « initialized » par add-on, et des lignes `ERROR` qui désignent l'add-on en cause. Deux réglages y ajoutent des lignes, pour aider à trouver un problème : `LOG_UNTRANSLATED_MENU_TITLES` et `LOG_LAUNCH_EVENTS` (voir [Réglages](settings.md)).

## Questions fréquentes

**Le pack ne démarre pas du tout.** Vérifiez que vous avez `PinballY\Scripts\ExpansionPack\main.js`, et non `ExpansionPack\ExpansionPack\main.js` ni un dossier nommé `PinballY-Expansion-Pack-<version>` (celui-là vient de « Source code (zip) », pas d'`ExpansionPack.zip`), et que `Scripts\main.js` contient la ligne d'import (voir [Installation](install.md)). Un pack qui échoue au chargement écrit son erreur dans `PinballY.log`, après « ExpansionPack: ».

**Il n'y a aucun son.** Les sons ont besoin de la fonctionnalité facultative *Lecteur Windows Media* de Windows, présente par défaut sur Windows 10 et 11 : si elle a été retirée, rajoutez *Lecteur Windows Media hérité* dans *Paramètres › Applications › Fonctionnalités facultatives* (sur une édition « N », installez le *Media Feature Pack*). Vérifiez aussi les réglages `*_SOUND_FILE` : une valeur vide veut dire aucun son.

**Une table originale n'a pas de tableau des scores.** Son tableau apparaît dès que la table a été jouée avec le pack, qui apprend pendant sa première partie où la table le range.

**Une table au champ ROM vide n'a plus aucun tableau.** Si vous avez mis PINemHi à jour, la section `[romfind]` de `romfind.ini` doit être ajoutée à la fin de `pinemhi.ini` (voir [Installation](install.md#pinemhi-368)).

**Invité est le seul Profil.** Le pack est livré avec le seul Profil Invité. Créez un Profil depuis **Changer de joueur**, avec sa dernière place, le « + », ou depuis Windows, sous forme de dossier (voir [Créer un Profil](profiles.md#créer-un-profil)).

**J'ai marqué un Profil admin et perdu les entrées de configuration.** Dès qu'un Profil est marqué, les autres, Invité compris, ne les voient plus, et vous êtes peut-être encore sur Invité : choisissez le Profil marqué dans « Changer de joueur », dans le menu principal ou le menu de sortie. PinballY n'ouvre « Changer de joueur » de lui-même que si la borne compte au moins deux Profils sans compter Invité.

**J'ai créé mon premier Profil et Invité a perdu les entrées de configuration, et le « + ».** Le premier Profil créé depuis la borne devient Profil admin, comme le dit la ligne jaune de la saisie du nom, et vous êtes toujours sur Invité : choisissez le nouveau Profil dans « Changer de joueur », dans le menu principal ou le menu de sortie (voir [Créer un Profil](profiles.md#créer-un-profil)).

**« Gérer les profils » manque au menu de sortie.** Dès qu'un Profil est marqué, l'entrée n'apparaît qu'aux Profils admin ; tant qu'aucun ne l'est, elle apparaît à tous les Profils sauf Invité et les Profils enfants, avec « Devenir admin » pour seule ligne (voir [Profil admin](settings.md#profil-admin)). Elle a aussi besoin du menu de sortie de PinballY : si vous l'avez désactivé dans les options de PinballY, elle ne peut pas apparaître.

**Une marque de Profil (`isAdmin`, `isChild`) reste sans effet.** Elle doit valoir `true` ou `false`, au premier niveau de `profile.json`, avec sa clé écrite exactement ; une marque fautive est ignorée et signalée dans `PinballY.log`. Modifiez `profile.json` PinballY fermé : s'il tourne, sa prochaine sauvegarde du Profil actif écrase votre modification, sans aucune ligne dans le journal.

**Les confettis ou le feu d'artifice ralentissent la borne.** Coupez-les avec `CONFETTI=false` ou `FIREWORKS=false`.

---

[← Sommaire du guide](index.md)

# Installation

[← Sommaire du guide](index.md)

## Ce qu'il faut

- **Windows** et **PinballY 1.1.0 Beta 10** ou plus récent.
- La fonctionnalité facultative *Lecteur Windows Media* de Windows, pour les sons. Windows 10 et 11 l'installent par défaut : il n'y a rien de plus à installer. Seules les éditions « N » vendues en Europe en sont privées, et le *Media Feature Pack* gratuit de Microsoft l'ajoute.
- Pas besoin de git : le zip de la version suffit.

## Pas à pas

1. **Téléchargez `ExpansionPack.zip`** depuis la dernière version publiée : https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/latest (et non « Source code (zip) », dont le dossier s'appelle `PinballY-Expansion-Pack-<version>` et n'est pas trouvé par le pack).
2. **Extrayez-le dans `PinballY\Scripts`**. Le zip contient déjà un dossier nommé `ExpansionPack`, le nom où le pack cherche ses fichiers : vous devez obtenir `PinballY\Scripts\ExpansionPack\main.js`, et non `ExpansionPack\ExpansionPack\main.js`.
3. **Créez `PinballY\Scripts\main.js` avec cette seule ligne** si le fichier n'existe pas, ou **ajoutez-lui cette ligne** s'il existe :
   ```js
   import("./ExpansionPack/main.js").catch(e => logfile.log("ExpansionPack: " + e.message));
   ```
   Vos propres scripts continuent de fonctionner : rien d'autre n'est touché dans `Scripts`, et ils tournent même si le dossier du pack manque ou si le pack échoue au chargement (l'erreur va dans `PinballY.log`).
4. **Facultatif : créez `ExpansionPack\.env.local`**, seulement pour changer un réglage que **Réglages du pack** ne propose pas (voir [Réglages](settings.md)) : copiez `ExpansionPack\.env.example` et gardez les lignes que vous changez, un `CLÉ=valeur` par ligne (UTF-8). Sans lui, le pack tourne avec ses valeurs par défaut.
5. **Facultatif : passez PINemHi en 3.6.8** (voir plus bas).
6. **Redémarrez PinballY** et consultez `PinballY.log` (voir [Premier démarrage](#premier-démarrage)). Le pack propose alors d'installer vpxtool (voir plus bas).
7. **Choisissez vos Add-ons** dans **Réglages du pack**, depuis le menu opérateur : activez ou désactivez chacun, choisissez l'écran de démarrage et la langue, puis redémarrez PinballY d'une seule pression.
8. **Créez votre Profil** : le pack est livré avec le seul Profil Invité. Ouvrez **Changer de joueur** et choisissez sa dernière place, le « + », ou ajoutez un dossier dans Windows (voir [Créer un Profil](profiles.md#créer-un-profil)).

## vpxtool

Avec vpxtool, la ROM de chaque table est remplie toute seule (l'Add-on « ROM des tables »). vpxtool est écrit par Francis De Brabandere, sous licence Apache-2.0 (https://github.com/francisdb/vpxtool) ; le pack ne l'inclut pas, et vous n'avez rien à télécharger vous-même.

Tant qu'il manque et que l'Add-on « ROM des tables » est activé, un message s'ouvre au démarrage, après l'invite de mise à jour et avant l'écran de démarrage, pour un Profil admin (ou pour tous tant qu'aucun Profil n'est marqué). Il dit à quoi sert vpxtool, qui l'a écrit, sa licence et son site, et que vous pourrez toujours l'installer plus tard. **Installer** le télécharge depuis les versions de son auteur, le vérifie et place `vpxtool.exe` dans `ExpansionPack\tools`, avec la comète et « Téléchargement en cours… » à l'écran ; PinballY reste ouvert. Un message dit ensuite si cela a marché, et les scripts des tables sont lus aussitôt.

**Non merci** enregistre `OFFER_VPXTOOL=false` dans `.env.local` : le pack ne demande plus jamais, et **Proposer vpxtool** indique Désactivé dans le groupe Mode hors ligne de **Réglages du pack** (voir [Réglages](settings.md#réglages-du-pack)). Exit ferme le message sans réponse : il revient au démarrage suivant. Tant qu'aucun Profil admin ne lance PinballY, le message attend.

Par la suite, **Réglages du pack** affiche **Installer vpxtool v0.38.0** tant qu'il manque et que l'Add-on « ROM des tables » est activé, quelle que soit votre réponse ; cette ligne ouvre le même message. Vous pouvez aussi l'installer à la main : téléchargez `vpxtool` pour Windows sur sa page de versions (https://github.com/francisdb/vpxtool/releases) et placez `vpxtool.exe` dans `ExpansionPack\tools`, à côté du programme de redémarrage déjà présent.

Sans lui, la ROM d'une table est quand même trouvée, après sa première partie.

## PINemHi 3.6.8

Avec PINemHi 3.6.8, les meilleurs scores sont lus sur les tableaux d'environ 300 ROM de plus.

1. Remplacez les fichiers de `PinballY\PINemHi` par ceux de [PINemHi 3.6.8](https://www.pinemhi.com/).
2. **Ajoutez toute la section `[romfind]` de son `romfind.ini` à la fin de son `pinemhi.ini`**. PinballY ne lit cette section que dans `pinemhi.ini` : sans elle, une table au champ ROM vide n'a plus aucun tableau.
3. Réglez `USER=` dans `pinemhi.ini` sur le dossier `User` de Visual Pinball X.

## Premier démarrage

Après le redémarrage de PinballY, consultez `PinballY.log` : il liste vos réglages, une ligne « initialized » par add-on, et des lignes `ERROR` qui désignent l'add-on en cause.

PinballY recrée `PinballY.log` à chaque lancement : le pack garde donc aussi chaque erreur dans `Scripts\ExpansionPack\errors.log`, d'un lancement à l'autre (voir [Dépannage](troubleshooting.md)).

Dès que la borne compte au moins deux Profils sans compter Invité, PinballY démarre sur « Changer de joueur » ; voir [Profils](profiles.md) et le réglage `STARTUP_SCREEN` dans [Réglages](settings.md).

## Sauvegarder et désinstaller

Tout ce que le pack conserve reste dans `Scripts\ExpansionPack` : vos réglages (`.env.local`) et la progression de chaque Profil (`profiles`).

- **Pour sauvegarder**, copiez ce dossier.
- **Pour réinstaller ou mettre à jour à la main**, gardez le dossier `profiles` : vous retrouvez votre progression.
- **Pour désinstaller**, supprimez-le et retirez la ligne d'import de `Scripts\main.js`.

## Installer avec git

Pour les contributeurs : au lieu du zip, lancez `git clone https://github.com/F3L1X79/PinballY-Expansion-Pack.git ExpansionPack` depuis `PinballY\Scripts`, puis suivez les étapes à partir de l'étape 3. Un pack installé avec git ne se voit jamais proposer de [mise à jour](updates.md) : lancez `git pull` à la place.

---

[← Sommaire du guide](index.md)

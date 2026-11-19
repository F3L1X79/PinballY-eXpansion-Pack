# Mises à jour

[← Sommaire du guide](index.md)

## L'invite de mise à jour

À chaque démarrage, PinballY demande à GitHub, en arrière-plan, si une version plus récente du pack est sortie, sans ralentir le démarrage ; hors ligne, il écrit seulement une ligne dans `PinballY.log`.

S'il y en a une, le démarrage suivant ouvre l'invite de mise à jour avant tout le reste, titrée « Mise à jour disponible » : « La version vX.Y.Z de l'eXpansion Pack est disponible. », avec « Mettre à jour » et « Plus tard ». Elle attend un démarrage où le dernier joueur voit les entrées de configuration (un [Profil admin](settings.md#profil-admin), ou n'importe qui tant qu'aucun Profil n'est marqué).

Du démarrage qui l'a trouvée jusqu'à la mise à jour, une flèche dorée pointée vers le bas se tient à côté de l'horloge de la roue (voir [Icônes d'état](interface.md#icônes-détat)), pour les mêmes joueurs. Elle disparaît si GitHub dit plus tard que cette version n'est plus plus récente.

## Mettre à jour

« Mettre à jour » télécharge et vérifie la nouvelle version, la comète dorée tournant sur la roue assombrie avec « Téléchargement de la mise à jour… » en dessous et les boutons bloqués pendant ce temps, puis ferme PinballY, remplace le dossier du pack par le nouveau, et relance PinballY. Le démarrage suivant l'annonce sous « Mise à jour terminée » : « eXpansion Pack mis à jour en vX.Y.Z », puis, après une ligne vide, la liste des nouveautés, un tiret par phrase, dans la langue de la borne. Après un saut de plusieurs versions, les nouveautés de chaque version sautée sont aussi listées, les plus récentes d'abord, cinq phrases au plus. Une version de correction sans nouveauté pour les joueurs n'affiche que la première ligne.

Sont conservés (la liste complète est dans [Mettre à jour hors ligne](#mettre-à-jour-hors-ligne)) :

- vos réglages (`.env.local`) ;
- vos Profils (`profiles`) ;
- les fichiers que vous avez mis dans `tools`, `vpxtool.exe` compris ;
- vos propres sons et images de score par défaut ;
- les journaux du pack (`logs`) : le journal des erreurs, le journal d'informations et le journal des anomalies des scores de partie.

## Quand une mise à jour échoue

- Un téléchargement qui échoue avant la fermeture de PinballY est signalé aussitôt par « Mise à jour impossible » : « L'eXpansion Pack reste tel quel. »
- Si la mise à jour a échoué après la fermeture de PinballY, la version précédente reste en place, et un toast « Problème » indique où en lire la raison à qui voit les entrées de configuration (voir [Dépannage](troubleshooting.md)).

## Plus tard

« Plus tard » n'est plus demandé pour cette version : « Mettre à jour en vX.Y.Z » reste dans **Réglages de l'eXpansion pack** jusqu'à la mise à jour, et la flèche dorée reste à côté de l'horloge.

## Garder vpxtool à jour

Chaque version du pack nomme la version de vpxtool avec laquelle elle a été essayée. À chaque démarrage, le pack demande sa version au `vpxtool.exe` installé, en arrière-plan, et la retient dans `script_reader.json` (conservé par les mises à jour). Quand cette version est plus ancienne, le démarrage suivant (ou le premier démarrage après une mise à jour du pack qui en nomme une plus récente) ouvre la même proposition que pour un vpxtool absent, en parlant de mise à jour avec les deux versions : « Mettre à jour » télécharge la nouvelle, la comète dorée tournant sur la roue assombrie avec « Téléchargement en cours… » en dessous, et « Non merci » arrête les propositions, comme pour l'installation (voir [Installation](install.md#vpxtool)). Un vpxtool égal ou plus récent n'est jamais touché ; un vpxtool dont la version est illisible est laissé tel quel, le problème écrit dans le journal des erreurs.

## Couper la recherche

Réglez « Recherche de mises à jour du pack » sur « Désactivé » dans le groupe Mode hors ligne des **Réglages de l'eXpansion pack**, ou écrivez `UPDATE_CHECK=false` dans `.env.local` : la borne ne contacte alors jamais GitHub. Dès le démarrage suivant, une flèche circulaire blanche, barrée, se tient à côté de l'horloge de la roue pour le rappeler, à qui voit les entrées de configuration (voir [Icônes d'état](interface.md#icônes-détat)).

Un pack installé avec git n'est jamais vérifié ni mis à jour : lancez `git pull` dans `Scripts\ExpansionPack`.

## Mettre à jour hors ligne

Une borne sans Internet ne voit jamais l'invite de mise à jour : mettez-la à jour à la main avec le zip de la version, comme le fait « Mettre à jour ». Vous pouvez passer directement de n'importe quelle version à la dernière (de 1.4 à 1.6, par exemple) : le pack lit tels quels les fichiers des versions précédentes, sans étape intermédiaire.

1. Sur un autre ordinateur, téléchargez `ExpansionPack.zip` depuis la dernière version (voir [Installation](install.md)) et apportez-le à la borne.
2. Fermez PinballY.
3. Renommez `Scripts\ExpansionPack` en `ExpansionPack.old-<date>` : c'est votre copie de la version précédente (voir [Revenir à la version précédente](#revenir-à-la-version-précédente)).
4. Extrayez le zip dans `PinballY\Scripts` : vous devez obtenir `Scripts\ExpansionPack\main.js`, et non `ExpansionPack\ExpansionPack\main.js`.
5. Recopiez de `ExpansionPack.old-<date>` vers `ExpansionPack` ceux des éléments suivants que vous avez, par-dessus ce que contient le zip :
   - `.env.local` : vos réglages ;
   - `profiles` : vos Profils ;
   - `logs` : les journaux du pack ;
   - `assets\sounds\local` : vos propres sons ;
   - `assets\images\default_scores\local` : vos propres images de score par défaut ;
   - `pack_update.json` : les réponses données aux messages du pack ;
   - `script_reader.json` : la version de vpxtool que le pack connaît ;
   - `quiet_wheel_pending.json` : un volume de table à rétablir, présent seulement si PinballY a été coupé ;
   - `tools` : les fichiers que vous y avez mis, `vpxtool.exe` compris, mais pas `pack_update.ps1`, `restart_pinbally.ps1` ni `script_reader_install.ps1`, que le zip apporte plus récents.

   Depuis une version qui gardait ses journaux dans le dossier du pack lui-même (`errors.log`, `play_scores_anomalies.log` et leurs `.old.log`), copiez-les aussi : le pack les range dans `logs` à son démarrage.
6. Lancez PinballY.

Pour que la borne arrête de chercher des mises à jour qu'elle ne peut pas atteindre, réglez « Recherche de mises à jour du pack » sur « Désactivé » dans le groupe Mode hors ligne (voir [Couper la recherche](#couper-la-recherche)).

## Revenir à la version précédente

Fermez PinballY : la version précédente est gardée à côté du pack sous le nom `Scripts\ExpansionPack.old-<date>` (la plus récente seulement).

1. Copiez-y `profiles`, `.env.local` et `pack_update.json` depuis `Scripts\ExpansionPack`, pour garder la progression faite depuis la mise à jour (et ne pas être averti d'un échec).
2. Renommez `ExpansionPack` en n'importe quel autre nom.
3. Renommez ce dossier en `ExpansionPack`.

---

[← Sommaire du guide](index.md)

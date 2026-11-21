# Choisir une table

[← Sommaire du guide](index.md)

## Écran d'accueil : table du jour, table de la semaine

<img src="../../images/welcome_screen.png" alt="L'écran d'accueil avec la table du jour, la table de la semaine et une table du défi" width="480">

Chaque jour une table que personne à la maison n'a encore jouée, ou celle délaissée depuis le plus longtemps, chaque semaine une table au hasard. L'écran d'accueil vous les présente au démarrage, après chaque « Changer de joueur », et chaque fois que vous choisissez **Revenir à l'écran d'accueil** dans le menu principal, avec ce qu'elles représentent pour vous.

- Tant que votre défi de la semaine a des tables du défi, il montre aussi l'une d'elles, tirée au hasard. Cette table du défi n'est jamais l'une des deux tables déjà présentées, sauf quand une partie de plus termine votre défi.
- De là, lancez l'une d'elles, restez sur la table de la roue, changez de joueur ou tentez une table au hasard.
- Jouez-les plusieurs jours ou plusieurs semaines d'affilée pour faire une série.
- Ni l'une ni l'autre n'est jamais une table masquée ou non configurée (un fichier de table trouvé par PinballY mais jamais configuré), même quand votre roue l'affiche.
- Si votre dernière partie date d'une semaine ou plus, l'écran d'accueil vous dit « Bon retour », et après plus de 30 jours « Ça faisait un bail ». Invité garde le bonjour habituel tant que « Changer de joueur » existe.
- Quand quelqu'un d'autre vous prend un record, Invité compris, votre prochain écran d'accueil vous dit qui, une seule fois, pour que vous sachiez quel record reprendre.
- Tant que l'écran d'accueil est ouvert, le son des vidéos de la table de la roue est baissé, et revient à sa fermeture.

Pour un Profil enfant, voir [Réglages](settings.md#profil-enfant) : la table du jour et la table de la semaine restent les mêmes pour toute la maison.

## Maîtrise des tables

<img src="../../images/table_mastery.png" alt="La barre de maîtrise de la table sélectionnée : Rookie (Novice), niveau 1" width="297">

Chaque minute passée sur une table fait monter votre maîtrise de celle-ci, sur dix niveaux, de Novice à Mage du flipper, chacun plus long à atteindre que le précédent.

- La barre de maîtrise, en haut à droite de l'écran de la roue, montre où vous en êtes sur la table sélectionnée, et un encart annonce le niveau atteint.
- Quand dix de vos tables atteignent le niveau suivant, la maîtrise de votre collection passe un palier. Les tables masquées et non configurées ne comptent pas.
- Le niveau 10 sur une table et chaque nouveau palier font pleuvoir des confettis.
- Chaque palier débloque aussi un cadre pour votre Avatar, de la Sylve enchantée à la Légende céleste : choisissez celui que vous portez dans **Mon profil**, sous **Cadre**.
- Jouez un jour de fête (Nouvel An, Nouvel An chinois, Saint-Valentin, Pâques, Halloween, Noël et cinq autres) et le cadre de ce jour vous appartient pour de bon, annoncé par un encart à votre retour sur la roue.

## Meilleurs scores

<img src="../../images/high_score_board.png" alt="Le tableau des meilleurs scores d'une table : le podium sous ses trois couronnes, puis les autres places, dont une gagnée par un Profil" width="400">
<img src="../../images/household_board.png" alt="Les scores de la maison d'une table : chaque Profil une fois avec son meilleur score et sa date, les trois premiers sur le podium" width="400">

Quand vous entrez au tableau des meilleurs scores d'une table, la place est à vous : le pack relit le tableau avant et après chaque partie et, pour une partie d'au moins une minute, attribue chaque nouveau score au Profil qui jouait, quelles que soient les initiales tapées, les autres joueurs d'une partie à plusieurs compris.

- Un encart annonce votre meilleure place, ou le record et à qui vous l'avez pris.
- Avec [vpxtool](install.md#vpxtool), une partie qui ne gagne aucune place peut aussi avoir son encart : **Record de la maison** quand son score prend à un autre Profil la première place de **Scores de la maison** (et le nomme), sinon **Record perso** quand il bat tous vos scores précédents sur la table, jamais pour le premier. Invité peut avoir un record perso, jamais un record de la maison. Un seul encart par partie, le plus fort.
- Les scores déjà au tableau au premier relevé, ceux d'usine compris, n'appartiennent à personne, et une remise à zéro de la ROM qui les ramène n'est jamais attribuée.
- Un meilleur score gagné le reste même chassé du tableau par des scores plus récents, et rapporte ses propres succès.
- **Mon profil** montre les meilleurs scores et records que vous détenez encore, et **Stats de la maison** qui détient le plus de records.
- Les tables sans ROM (créations originales) comptent aussi : le pack lit leur tableau dans le dossier `User` de Visual Pinball X (`VPReg.stg`, ou le fichier texte que certaines tables y gardent), apprend où chaque table le range pendant sa première partie, et le passe à PinballY, pour que le DMD et la fiche de la table l'affichent aussi. Leur tableau apparaît après une partie d'au moins une minute avec le pack ; d'ici là, le tableau dit « Jouez une partie d'au moins une minute pour afficher les meilleurs scores de cette table ».

**Tableaux des meilleurs scores** dans le menu principal (ou le bouton `HighScores` de PinballY, s'il est affecté) ouvre le tableau de la table sélectionnée, dessiné dans le style Steamball à la place de la fenêtre de PinballY :

- les trois premières places sur un podium sous une couronne d'or, d'argent et de bronze, les autres en lignes en dessous ;
- chacune avec son rang, son score, ses initiales et le Profil qui l'a gagnée (nom, Avatar et cadre d'Avatar), ou « Score par défaut » avec un portrait choisi d'après ses initiales, le même sur toutes les tables ;
- le tableau est relu sur la table à chaque ouverture, il montre donc toujours ce qu'elle contient ;
- sur un tableau trop long pour l'écran, les flippers s'arrêtent aussi sur chaque place sous le podium, en la faisant défiler à l'écran ;
- « Aucun meilleur score trouvé pour cette table » veut dire que les scores n'ont pas pu être lus, pas que la table n'est pas prise en charge : pour une table à ROM, vérifiez que PinballY cherche le fichier NVRAM (`.nv`) dans le dossier `nvram` que VPinMAME utilise vraiment (le **NVRAM folder** du système dans les options de PinballY ; laissé vide, c'est le dossier que VPinMAME a noté dans le registre), et que le fichier y est après une partie. « Les meilleurs scores de cette table ne sont pas pris en charge » reste réservé à une ROM que PINemHi ne sait pas lire.

Trois boutons sous le tableau, un par vue, montrent en doré la vue affichée ; sous le titre de la table, le titre de la vue dit en une ou deux lignes ce qu'elle montre, et chaque vue garde la même taille. Le tableau s'ouvre sur son premier bouton ; les flippers passent d'un bouton au suivant, puis au bouton Retour ; Select (ou Launch) ouvre la vue du bouton choisi, ou ferme le tableau sur le bouton Retour ; Exit le ferme depuis chaque vue :

- **Scores de la ROM** : le tableau de la table, comme ci-dessus, où commence chaque ouverture ;
- **Scores de la maison** : chaque Profil de la maison (sans Invité, enfants compris) une fois, avec son meilleur score sur cette table, même un score depuis sorti du tableau de la table, et la date de cette partie ; quand un Profil repart de zéro, seuls ses meilleurs scores gagnés depuis comptent ;
- **Vos 5 meilleurs scores** : les cinq meilleurs scores du Profil qui joue en ce moment sur cette table (Invité compris), même ceux sortis du tableau de la table et chacun de ceux d'une partie à plusieurs, avec la date de chaque partie ; quand le Profil repart de zéro, seuls ceux gagnés depuis.

Avec [vpxtool](install.md#vpxtool) installé, **Scores de la maison** et **Vos 5 meilleurs scores** comptent chaque partie sur une table à ROM dont la mémoire garde le score de la dernière partie, même très loin sous les scores d'usine de la table : le pack lit le score de fin de partie dans le fichier `.nv` de la ROM, le meilleur d'une partie à plusieurs, et le garde comme score de partie, affiché comme un meilleur score. Une partie entrée aussi au tableau de la table n'apparaît qu'une fois. Une partie abandonnée en cours, quand la table le dit, et un lancement sans partie ne donnent pas de score de partie. Si vous enchaînez plusieurs parties sans quitter la table, seule la dernière compte : la ROM n'écrit son `.nv` qu'à la fermeture de la table. Les scores de partie comptent à partir de la mise à jour qui les apporte ; les parties d'avant ne peuvent pas être retrouvées. This program makes use of content from the [Pinball Memory Maps](https://github.com/tomlogic/pinball-memory-maps) project.

Les règles qui lisent un score de partie n'ont été vérifiées que sur quelques sortes de tables : le pack note donc ce qui semble anormal (une partie toujours vue comme abandonnée, un score qui aurait dû entrer au tableau, une ROM que vpxtool ne sait pas lire…) dans `Scripts\ExpansionPack\logs\play_scores_anomalies.log`, une ligne par anomalie, jamais les parties ordinaires. Joignez-le (avec `play_scores_anomalies.old.log`, sa partie plus ancienne, s'il existe) quand vous signalez un score de partie manquant ou faux.

Pour lire les tableaux d'environ 300 ROM de plus, mettez PINemHi à jour (voir [Installation](install.md#pinemhi-368)).

## Table au hasard et filtres

- Une table au hasard est tirée sur une roue de la fortune (`SKIP_RANDOM_GAME_ANIMATION=true` la lance aussitôt). Lancez-la depuis l'écran d'accueil, ou depuis « Lancer une table au hasard » dans le menu principal, sous « Jouer » : elle est tirée parmi les tables de la roue, filtre actif compris.
- Derrière « Changer de filtre » dans le menu principal : « Tables à découvrir », « Tables les plus jouées », « Mes meilleurs scores » (les tables où vous avez une place au tableau), « Tables favorites », « Tables masquées » (tant qu'une table est masquée), « Tables Originales » (le fabricant réglé par `COMMUNITY_TABLES_MANUFACTURER`) et « Tables du défi ». Les « Tables favorites » sont celles du Profil actif (voir [Profils](profiles.md#notes-et-tables-favorites)).

## Ordre de la roue

- La roue range ses tables par ordre alphabétique par défaut. « Ordre : alphabétique », juste avant Retour derrière « Changer de filtre », nomme l'ordre en place et ouvre la page **Ordre de la roue** : « Alphabétique » et « Par année », l'ordre en place marqué, puis Retour. Par année, la table la plus ancienne vient d'abord, les tables d'une même année par ordre alphabétique, et les tables sans année à la fin, par ordre alphabétique. Choisir un ordre le met en place ; Retour ou Sortie revient à « Changer de filtre » sans rien changer. Le menu principal nomme l'ordre en place sous le filtre actif.
- Les menus se ferment, et la table sur laquelle vous étiez reste sélectionnée.
- L'ordre est le même pour tous les Profils, et reste quand vous choisissez un autre filtre de PinballY : Toutes les tables, Tables favorites, une époque, un fabricant… Il reste aussi après un redémarrage de PinballY, sur le filtre que vous aviez choisi.
- Les sélections de tables du pack le suivent aussi : « Tables à découvrir », « Tables masquées », « Tables du défi » et « Tables Originales ». « Tables les plus jouées » (la plus jouée d'abord) et « Mes meilleurs scores » (votre meilleure place d'abord) gardent leur propre classement, quel que soit l'ordre.
- Par année, les boutons Page suivante et Page précédente sautent d'une décennie à l'autre : les années 1980, les années 1990, les années 2000, les années 2010, les années 2020, puis les tables sans année. Par ordre alphabétique, ils sautent d'une lettre à l'autre, comme d'habitude. La pastille dorée du rail de la roue, sur le bord droit, saute avec eux (voir [Interface](interface.md#sur-lécran-de-la-roue)). Un titre qui commence par une lettre accentuée fait un arrêt à lui juste après sa lettre simple : depuis « Eight Ball », Page suivante s'arrête sur « Élan Vital », la pastille toujours sur E. Sur « Tables les plus jouées » et « Mes meilleurs scores », ils avancent d'une table à la fois.
- Par année, le rail de la roue liste des décennies au lieu des lettres : chaque décennie de la plus ancienne à la plus récente de la roue (`70s`, `80s`...), celles sans table grisées, puis `?` en bas pour les tables sans année, que la roue liste en dernier. La pastille se pose sur la décennie de la table sélectionnée, ou sur `?`. Changer d'ordre fait passer le rail des lettres aux décennies, et inversement, aussitôt. Avec « Rail par année » sur « Décennies et années » dans la page « Roue » des réglages de l'eXpansion pack (`WHEEL_RAIL_YEARS=true`, voir [Réglages](settings.md)), les années de chaque décennie s'affichent dessous sur deux chiffres (`84`), et la pastille se pose sur l'année de la table sélectionnée ; les décennies, où la pastille ne va plus, sont alors toutes grisées. Les filtres propres à PinballY des tables masquées et des tables non configurées, que le pack ne trie pas, restent alphabétiques : leur rail montre des lettres.
- Désactivé dans les Réglages de l'eXpansion pack (**Ordre de la roue**, `ADD_ON_WHEEL_ORDER=false`), l'entrée disparaît et la roue reste alphabétique.

---

[← Sommaire du guide](index.md)

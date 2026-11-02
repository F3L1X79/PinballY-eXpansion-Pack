# Profils

[← Sommaire du guide](index.md)

## Un Profil pour chacun

<img src="../../images/profiles.png" alt="Le carrousel « Changer de joueur » et ses Avatars avec leur niveau" width="400">

Avec « Changer de joueur », chacun prend son Profil et son Avatar, et l'écran d'accueil vous salue par votre nom : vous savez pour qui les parties vont compter.

- Seules les parties d'au moins une minute comptent : un lancement par erreur ne fausse rien.
- Vos jours d'affilée sur la borne comptent les jours de suite où vous avez joué, sur n'importe quelle table.
- Le Profil Invité reste toujours là pour les visiteurs.
- Dès que la borne compte au moins deux Profils sans compter Invité, PinballY démarre sur « Changer de joueur », pour que chacun choisisse son Profil avant de jouer ; il peut aussi démarrer sur l'écran d'accueil ou directement sur la roue (`STARTUP_SCREEN`, voir [Réglages](settings.md)).
- Tant que « Changer de joueur » est ouvert, le son des vidéos de la table de la roue est baissé, et revient à sa fermeture.

La progression de chaque Profil est enregistrée dans `Scripts\ExpansionPack\profiles`. Un Profil admin garde les entrées de configuration pour lui, un Profil enfant cache les tables pour adultes, et **Gérer les profils**, dans le menu de sortie d'un Profil admin, marque un Profil enfant ou fait repartir un Profil de zéro : voir [Réglages](settings.md).

## Créer un Profil

Le pack est livré avec le seul Profil Invité. Un Profil se crée depuis Windows, pas depuis la borne :

1. Dans `PinballY\Scripts\ExpansionPack\profiles`, créez un dossier vide au nom du joueur : c'est ce nom que la borne affiche. Un nom qui commence par `.` ou `_` est ignoré. Ne copiez pas le dossier d'Invité : la copie reprendrait sa progression, alors qu'un dossier vide part de zéro.
2. Facultatif : placez dans ce dossier une image PNG ou JPEG carrée nommée `avatar.png` ou `avatar.jpg`. Sans elle, le Profil reçoit l'Avatar par défaut.
3. Ouvrez **Changer de joueur**, dans le menu principal ou le menu de sortie, et choisissez le nouveau Profil. Inutile de redémarrer PinballY. Tant que vous ne l'avez pas choisi, vous jouez toujours en Invité.
4. Facultatif : pour garder les entrées de configuration pour vous seul, ouvrez **Gérer les profils** dans le menu de sortie et choisissez **Devenir admin** (voir [Profil admin](settings.md#profil-admin)).

Configurer le pack ne demande pas de Profil admin : tant qu'aucun Profil n'est marqué, tous les Profils, Invité compris, voient les entrées de configuration.

## Mon profil

<img src="../../images/profile_stats.png" alt="Les statistiques d'un Profil : niveau, maîtrise de la collection, parties, séries, goûts et tables jouées en premier, le plus et en dernier" width="480">

**Mon profil**, dans le menu principal, résume votre vie de flippeur :

- parties jouées, temps total et durée moyenne d'une partie ;
- votre niveau et la maîtrise de votre collection ;
- fabricant, décennie et table préférés, et la toute première table jouée ;
- la part de la collection que vous avez essayée ;
- vos succès, vos jours d'affilée sur la borne, vos séries sur la table du jour et la table de la semaine, et les défis réussis ;
- les meilleurs scores et records que vous détenez encore ;
- le cadre que porte votre Avatar (à choisir sous **Cadre**, voir [Maîtrise des tables](choosing_a_table.md#maîtrise-des-tables)) ;
- et le chemin vers vos tables les plus jouées et celles qui restent à découvrir.

## Stats de la maison

<img src="../../images/household_stats.png" alt="Stats de la maison : trois Profils côte à côte, le meilleur de chaque ligne en doré" width="400">

Dès que vous êtes deux à avoir un Profil, **Stats de la maison** montre tous les Profils côte à côte, sauf Invité, chaque Avatar dans son cadre, le meilleur de chaque ligne en doré, et qui détient le plus de records. Choisissez une colonne pour voir les statistiques de ce Profil.

---

[← Sommaire du guide](index.md)

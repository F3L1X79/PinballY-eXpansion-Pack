// ============================================================
// French translations for PinballY's UI.
// Save this file as UTF-8 with BOM so accented characters display correctly.
// ============================================================

// The active Profile's play time of a table, as PinballY writes its own.
const formatPlayTime = (hours, minutes) => (hours > 0
    ? `${hours} h ${String(minutes).padStart(2, "0")}`
    : `${minutes} minute${minutes > 1 ? "s" : ""}`);

// Hours of play with one decimal, as an Achievement Progress shows them.
const formatHours = hours => hours.toFixed(1).replace(".", ",");

export default {
    // Direct translations of PinballY's native menu titles.
    nativeMenuLabels: {
        "About PinballY": "À propos",
        "Add Media": "Ajouter des médias",
        "Add to Favorites": "Ajouter aux favoris",
        "Adjust Audio Volume": "Régler le volume audio",
        "All Games": "Toutes les tables",
        "All Tables": "Toutes les tables",
        "Batch Capture": "Capture par lot",
        "Batch Capture lets you capture screen shot images and videos for multiple games.  Step 1: select which games to include in the capture process:": "La capture par lot vous permet de capturer des captures d'écran et des vidéos pour plusieurs tables. Étape 1 : sélectionnez les tables à inclure dans le processus de capture :",
        "Begin Capture": "Démarrer la capture",
        "Cancel": "Annuler",
        "Capture images & videos": "Capturer images et vidéos",
        "Confirm Power Off": "Confirmer l'arrêt",
        "Delete game details": "Supprimer les détails de la table",
        "Edit category names...": "Modifier les noms de catégories...",
        "Edit game details...": "Modifier les détails de la table...",
        "Enable Videos": "Activer les vidéos",
        "Exit": "Quitter",
        "Exit PinballY": "Quitter",
        "Favorites": "Tables favorites",
        "Filter by Category": "Filtrer par catégorie",
        "Filter by Date Added": "Filtrer par date d'ajout",
        "Filter by Era": "Filtrer par époque",
        "Filter by Last Played": "Filtrer par dernière partie",
        "Filter by Manufacturer": "Filtrer par fabricant",
        "Filter by Rating": "Filtrer par note",
        "Filter by System": "Filtrer par système",
        "Find game media online": "Rechercher les médias en ligne",
        "Game Setup": "Configuration de la table",
        "Games marked for batch capture": "Tables marquées pour la capture par lot",
        "Help": "Aide",
        "Hide this game": "Masquer cette table",
        "High Scores": "Meilleurs scores",
        "In Favorites": "Dans les favoris",
        "Information": "Informations",
        "Instruction Card": "Carte d'instructions",
        "Mark for Batch Capture": "Marquer pour capture par lot",
        "Marked for Batch Capture": "Marquée pour capture par lot",
        "Mute Attract Mode": "Couper le son du mode attraction",
        "Mute Buttons": "Couper le son des boutons",
        "Mute Table Audio": "Couper l'audio de la table",
        "Mute Videos": "Couper le son des vidéos",
        "Operator Menu": "Menu opérateur",
        "Options": "Options",
        "PinballY Options...": "Options de PinballY",
        "Play": "Jouer",
        "Play Game": "Lancer la partie",
        "Power Off": "Éteindre l'ordinateur",
        "Proceed": "Continuer",
        "Rate Table": "Noter la table",
        "Reset Coins/Credits": "Réinitialiser pièces/crédits",
        "Resume Game": "Reprendre la partie",
        "Return": "Retour",
        "Save": "Enregistrer",
        "Search": "Rechercher",
        "Select categories": "Sélectionner les catégories",
        "Show Hidden Games": "Afficher les tables masquées",
        "Show Media Files": "Afficher les fichiers médias",
        "Show Unconfigured Games": "Afficher les tables non configurées",
        "Skip this message next time": "Ne plus afficher ce message",
        "Terminate Game": "Arrêter la partie",
        "The capture process records the exact same areas of the screen where your PinballY windows are located.  Before proceeding, make sure that your PinballY window layout matches the screen layout of the game you're about to record.  For example, if the game's playfield is full-screen, make sure PinballY's playfield window is full-screen.": "Le processus de capture enregistre exactement les mêmes zones de l'écran où sont situées vos fenêtres PinballY. Avant de continuer, assurez-vous que la disposition de vos fenêtres PinballY correspond à celle du jeu que vous allez enregistrer. Par exemple, si le plateau du jeu est en plein écran, assurez-vous que la fenêtre de plateau de PinballY l'est aussi.",
        "This will launch a Web browser window to search for media files for this game.  Look for a \"HyperPin Media Pack\" file.  Download the file and drag it onto this window to install it.\n\nNote that you can drop a Media Pack file onto this window at any time to install media for the currently selected game.  This menu step isn't required to install media; it's just a convenience for launching a Web search.": "Ceci va ouvrir une fenêtre de navigateur Web pour rechercher des fichiers médias pour cette table. Cherchez un fichier \"HyperPin Media Pack\". Téléchargez le fichier et déposez-le sur cette fenêtre pour l'installer.\n\nNotez que vous pouvez déposer un fichier Media Pack sur cette fenêtre à tout moment pour installer des médias pour la table actuellement sélectionnée. Cette étape du menu n'est pas obligatoire pour installer des médias ; c'est juste un raccourci pour lancer une recherche Web.",
        "Uncategorized": "Non catégorisées",
        "Yes, add to current game": "Oui, ajouter à la table actuelle",
        "You must enter the game's bibliographic information (title, system, etc.) before adding media files for the game.  The game information is used to determine the folder locations and file names for the game's media files, so it has to be entered before media files can be added to the game.": "Vous devez saisir les informations bibliographiques de la table (titre, système, etc.) avant d'ajouter des fichiers médias pour cette table. Ces informations sont utilisées pour déterminer les emplacements des dossiers et les noms de fichiers des médias de la table ; elles doivent donc être renseignées avant de pouvoir ajouter des fichiers médias.",
        "Flyer": "Affiche",
        "Pinscape Night Mode": "Mode nuit Pinscape",
        "Hidden Tables": "Tables masquées",
        "Unconfigured Tables": "Tables non configurées",
        "Tables played within:": "Tables jouées depuis moins de :",
        "Tables not played within:": "Tables pas jouées depuis :",
        "Tables added within:": "Tables ajoutées depuis moins de :",
        "Tables added more than:": "Tables ajoutées il y a plus de :",
        "A week": "Une semaine",
        "A month": "Un mois",
        "A year": "Un an",
        "A week ago": "Il y a une semaine",
        "A month ago": "Il y a un mois",
        "A year ago": "Il y a un an",
        "Never played": "Jamais jouées",
        "Batch Capture Step 2: Select the media types you'd like to capture for the selected games.  (You'll be able to say what to do about existing files in the next step.)": "Capture par lot, étape 2 : sélectionnez les types de médias à capturer pour les tables choisies. (Vous pourrez indiquer quoi faire des fichiers existants à l'étape suivante.)",
        "Batch Capture Step 3: For each type, indicate if you'd like to capture the item for EVERY game, even for games that already have existing media of the same type, or if you'd only like to capture missing items.": "Capture par lot, étape 3 : pour chaque type, indiquez si l'élément doit être capturé pour CHAQUE table, même celles qui ont déjà un média de ce type, ou seulement pour celles où il manque.",
        "Next Step": "Étape suivante",
        "Missing only": "Manquants seulement",
        "Capture all": "Tout capturer",
        "View Capture List": "Voir la liste de capture",
        "Please select the system to use to launch this table:": "Choisissez le système avec lequel lancer cette table :",
        "Yes, run as Admin": "Oui, lancer en administrateur",
        "No, cancel": "Non, annuler",
        "Allow (this session only)": "Autoriser (cette session seulement)",
        "Allow (always)": "Autoriser (toujours)",
        "Yes, delete it": "Oui, supprimer",
    },

    // Labels for the media-capture screen's "Item: Action" lines
    // (e.g. "Playfield Image: Skip"), combined via dynamicLabelBuilders.captureItemAction.
    mediaCaptureItemLabels: {
        "Backglass Image": "Image du backglass",
        "Backglass Video": "Vidéo du backglass",
        "Flyer Image": "Image de l'affiche",
        "Instruction Card": "Carte d'instructions",
        "Playfield Image": "Image du plateau",
        "Playfield Video": "Vidéo du plateau",
        "Table Audio": "Audio de la table",
        "Wheel Image": "Image de la roue",
        "DMD Image": "Image du DMD",
        "DMD Video": "Vidéo du DMD",
        "Topper Image": "Image du topper",
        "Topper Video": "Vidéo du topper",
        "Launch Audio": "Audio de lancement",
        "Real DMD Image": "Image du vrai DMD",
        "Real DMD Video": "Vidéo du vrai DMD",
        "Real RGB DMD Image": "Image du vrai DMD RGB",
        "Real RGB DMD Video": "Vidéo du vrai DMD RGB",
    },
    mediaCaptureActionLabels: {
        "Add": "Ajouter",
        "Capture": "Capturer",
        "Capture Silent": "Capturer sans son",
        "Capture w/Audio": "Capturer avec audio",
        "Keep Existing": "Conserver l'existant",
        "Replace Existing": "Remplacer l'existant",
        "Skip": "Ignorer",
    },

    // Status text shown in PinballY's launch overlay, keyed by the
    // language-independent event id (see the "launchoverlaymessage" event).
    launchOverlayMessages: {
        "after": "",
        "capturing": "Capture en cours...",
        "gameover": "Game Over",
        "init": "",
        "launching": "Chargement en cours...",
        "running": "Lancement de la table...",
        "terminating": "Retour aux tables…",
    },

    // The step under way, written in gold beneath the Loader while a
    // table launches or closes (Seamless Launch Overlay).
    launchSteps: {
        loading: "Chargement en cours…",
        closing: "Retour aux tables…",
        capturing: "Capture en cours…",
    },

    // Functions that build translated titles for PinballY's dynamically
    // generated menu text (category names, star ratings, etc.).
    dynamicLabelBuilders: {
        captureInstructions: (seconds) => {
            const plural = seconds === "1" ? "" : "s";
            return `Sélectionnez les éléments à capturer, puis cliquez sur Démarrer la capture. Cela va lancer votre jeu, capturer les images de l'écran, et quitter automatiquement le jeu une fois terminé. Le processus prendra environ ${seconds} seconde${plural}. (!) signifie qu'un élément existant sera remplacé.`;
        },
        captureInstructionsOneMinute: () =>
            "Sélectionnez les éléments à capturer, puis cliquez sur Démarrer la capture. Cela va lancer votre jeu, capturer les images de l'écran, et quitter automatiquement le jeu une fois terminé. Le processus prendra environ 1 minute. (!) signifie qu'un élément existant sera remplacé.",
        captureItemAction: (item, action) => `${item} : ${action}`,
        decadeTables: (decade) => `Tables années ${decade}`,
        genericTables: (name) => `Tables ${name}`,
        mediaGameMismatchWarning: (draggedGame, currentGame) =>
            `Il semblerait que certains fichiers médias que vous ajoutez soient destinés à une autre table, "${draggedGame}". Les fichiers médias sont toujours ajoutés à la table sélectionnée sur la roue, actuellement "${currentGame}". Voulez-vous ajouter ces éléments à la table actuelle ?`,
        mediaGameMismatchWarningMultiple: (gameList, currentGame) =>
            `Il semblerait que certains fichiers médias que vous ajoutez soient destinés à d'autres tables : ${gameList}. Les fichiers médias sont toujours ajoutés à la table sélectionnée sur la roue, actuellement "${currentGame}". Voulez-vous ajouter ces éléments à la table actuelle ?`,
        mediaReadyToAdd: (gameName) =>
            `Les éléments médias suivants sont prêts à être ajoutés pour ${gameName}. Choisissez les éléments que vous souhaitez ajouter ou remplacer.`,
        starTables: (count) => `Tables ${count} étoile${count > 1 ? "s" : ""}`,
        startDelay: (seconds) => `Ajuster le délai de démarrage (${seconds} sec)`,
        unratedTables: () => "Tables non notées",
        batchCaptureReady: (count, duration) => `La capture par lot est prête ! ${count} table(s) seront incluses dans ce processus, qui prendra environ ${duration}.`,
        confirmDeleteGameDetails: (title) => `Voulez-vous vraiment supprimer les détails de la table ${title} ? (Seules les informations bibliographiques sont supprimées, pas les fichiers de la table ni ses médias.)`,
        showCustomView: (name) => `Afficher ${name}`,
        durationSeconds: (count) => `${count} seconde${count > 1 ? "s" : ""}`,
        durationMinutes: (count) => `${count} minute${count > 1 ? "s" : ""}`,
        durationHours: (hours, minutes) => (minutes > 0 ? `${hours} h ${String(minutes).padStart(2, "0")}` : `${hours} heure${hours > 1 ? "s" : ""}`),
    },

    ratingPrompt: {
        title: "Noter cette table",
        message: (tableTitle, minutes) =>
            `Eh beh ! Tu as totalisé plus de ${minutes} minutes de jeu sur la table "${tableTitle}" ! Est-ce que ce serait pas le moment de lui mettre une petite note ?`,
        rateNow: "Allez, go !",
        notNow: "Plus tard...",
    },

    // The Button Hints at the foot of every drawn screen and the Exit
    // Button's tooltip (see GLOSSARY.md). The key caps and the footer's
    // words are shown in capitals.
    buttonHints: {
        // The key caps: Next and Prev are the right and left flipper buttons.
        keyCaps: { next: "Droite", prev: "Gauche", select: "Select", exit: "Exit" },
        browse: "Parcourir",
        // The flippers on a High Score Board longer than the window.
        scroll: "Défiler",
        choose: "Choisir",
        // Exit's word and the Exit Button's tooltip: Back where Exit brings
        // back a screen or a menu, Close where it leaves the bare wheel.
        back: "Retour",
        close: "Fermer",
    },

    // The Welcome Screen, at startup (see addons/welcome_screen.js).
    welcomeScreen: {
        greetings: { morning: "Bien le bonjour", afternoon: "Hey salut", evening: "Bien le bonsoir", night: "Salut nocturne" },
        greetingWithName: (greeting, name) => [`${greeting}, `, name, " !"],
        greetingAlone: (greeting) => `${greeting} !`,
        stayOn: (tableTitle) => `Rester sur ${tableTitle}`,
        stayOnWheel: "Rester sur la roue",
        randomTable: "Lancer une table au hasard",
        menuEntry: "Écran d'accueil",
        // The active Profile's Daily Streak under the greeting, from 2 days
        // on, its count shown in a square before the text.
        cabinetStreak: {
            notYetToday: "jours d'affilée sur la borne : continue !",
            playedToday: "jours d'affilée sur la borne",
        },
        lostRecord: (taker, tableTitle) => `${taker} t'a pris ton record sur ${tableTitle}`,
        lostRecords: (records, moreCount) => {
            const named = records.map(record => `${record.tableTitle} (${record.taker})`);
            return moreCount > 0
                ? `Records perdus : ${named.join(", ")} et ${moreCount} ${moreCount === 1 ? "autre" : "autres"}`
                : `Records perdus : ${named.slice(0, -1).join(", ")} et ${named[named.length - 1]}`;
        },
        // One card per Period Table; its grey line says it was played this
        // Period, or else the Streak of the daily or weekly rendezvous, its
        // count shown in a square before the text.
        periodCards: {
            day: {
                period: "TABLE DU JOUR",
                played: "Jouée aujourd'hui",
                streak: "jours d'affilée sur la table du jour : continue !",
            },
            week: {
                period: "TABLE DE LA SEMAINE",
                played: "Jouée cette semaine",
                streak: "semaines d'affilée sur la table de la semaine : continue !",
            },
            challenge: {
                period: "UNE TABLE DU DÉFI",
                progress: (title, value, target) => `${title} · ${value}/${target}`,
                lastStep: "Plus qu'une partie pour finir le défi !",
            },
            go: "Y aller",
        },
    },

    // Lower status line text for the currently selected table.
    // [Filter.Count], [Game.Year], etc. are PinballY placeholders — keep them as-is.
    tableInfoStatusLines: {
        manufacturer: (position) => `Table ${position}/[Filter.Count] - fabriqué par [Game.Manuf].`,
        manufacturerFictional: (position) => `Table ${position}/[Filter.Count] - Flipper fictif.`,
        playCount: (position, count) => `Table ${position}/[Filter.Count] - lancé ${count} fois.`,
        playTime: (position, hours, minutes) => `Table ${position}/[Filter.Count] - joué pendant ${formatPlayTime(hours, minutes)}.`,
        year: (position) => `Table ${position}/[Filter.Count] - sorti en [Game.Year].`,
    },

    // Upper status line messages, after the player's own from PinballY's options.
    // [Filter.Count] is a PinballY placeholder — keep it as-is.
    upperStatusLines: {
        welcome: name => `Bienvenue, ${name} !`,
        tablesAvailable: "[Filter.Count] tables sont disponibles !",
        launchHint: "Bouton noir pour lancer une table.",
        browseHint: "Flippers droite/gauche pour passer les tables.",
        signOff: "Et surtout, amuse-toi bien ;)",
    },

    // Labels for menu items this project adds itself (see custom_menu_commands.js, random_game.js, custom_filter.js, hall_of_fame.js and tables_to_discover.js).
    customMenuLabels: {
        challengeTables: "Tables du défi",
        hallOfFameFilter: "Tables les plus jouées",
        myHighScoresFilter: "Mes meilleurs scores",
        hiddenTablesFilter: "Tables masquées",
        tablesToDiscoverFilter: "Tables à découvrir",
        originalTablesFilter: "Tables Originales",
        tableSetup: "Configurer la table",
        // The Random Game's main menu entry, worded as welcomeScreen.randomTable.
        randomTable: "Lancer une table au hasard",
        // The native High Scores item, in the main menu only: other menus keep nativeMenuLabels.
        tableScores: "Scores de la table",
        filterPickerBack: "Retour",
        activeFilter: (name) => `Filtre actif : ${name}`,
        // The Drawn main menu's "Change Filter" entry, and its footer's label before the Active Filter.
        changeFilter: "Changer de filtre",
        activeFilterLabel: "Filtre actif :",
    },

    achievements: {
        dailyFirstPlayTitle: () => "Bonjour, table du jour !",
        dailyFirstPlayDescription: () => "Jouer la table du jour pour la première fois.",
        weeklyFirstPlayTitle: () => "Rendez-vous hebdo",
        weeklyFirstPlayDescription: () => "Jouer la table de la semaine pour la première fois.",
        dailyPeriodsPlayedTitles: {
            10: "Explorateur du dimanche",
            25: "Explorateur curieux",
            50: "Explorateur chevronné",
            100: "Indiana Flippers",
        },
        dailyPeriodsPlayedDescription: (days) => `Jouer la table du jour ${days} jours différents.`,
        weeklyPeriodsPlayedTitles: {
            4: "Un mois de rendez-vous",
            10: "Habitué de la semaine",
            26: "Six mois de fidélité",
            52: "Un an, pas une ride",
        },
        weeklyPeriodsPlayedDescription: (weeks) => `Jouer la table de la semaine ${weeks} semaines différentes.`,
        dailyStreakTitles: {
            3: "Jamais deux sans trois",
            7: "Semaine parfaite",
            14: "Quinzaine de fer",
            30: "Moine du flipper",
        },
        dailyStreakDescription: (days) => `Jouer la table du jour ${days} jours d'affilée.`,
        weeklyStreakTitles: {
            4: "Un mois sans faute",
            12: "Abonné fidèle",
        },
        weeklyStreakDescription: (weeks) => `Jouer la table de la semaine ${weeks} semaines d'affilée.`,
        decadeCompletionTitle: (decadeStartYear) => `Voyage dans les années ${decadeStartYear}`,
        manufacturerCompletionTitle: (manufacturer) => `Fan absolu de ${manufacturer}`,
        manufacturerCompletionDescription: (manufacturer, count) => `Jouer au moins une fois aux ${count} tables ${manufacturer}.`,
        firstTableTitle: () => "Premiers pas",
        firstTableDescription: () => "Jouer une toute première table.",
        collectionPercentTitles: {
            10: "Le goût du métal",
            25: "Collectionneur en herbe",
            50: "Mi-temps",
            75: "Presque tout vu",
            100: "Rien ne m'échappe",
        },
        collectionPercentDescription: (percent, playedCount, totalCount) => `Jouer à ${playedCount} tables sur ${totalCount} (${percent} % de votre collection).`,
        worldTourTitle: () => "Tour du monde",
        worldTourDescription: () => "Faire défiler toutes les tables de la roue d'une traite, sans en lancer aucune.",
        playTimeMilestoneTitles: {
            1: "Mise en jambes",
            5: "Ça devient sérieux",
            10: "Accro aux flippers",
            50: "Flipper dans le sang",
            100: "Légende du tilt",
        },
        playTimeMilestoneDescription: (hours) => `Cumuler plus de ${hours} heure${hours > 1 ? "s" : ""} de jeu.`,
        decadeCompletionDescription: (decadeStartYear, count) => `Jouer au moins une fois aux ${count} tables des années ${decadeStartYear}.`,
        categoryCompletionTitle: (category) => `Maître ${category}`,
        categoryCompletionDescription: (category, count) => `Jouer au moins une fois aux ${count} tables "${category}".`,
        marathonTitles: {
            30: "Semi-marathonien",
            60: "Marathonien errant",
        },
        marathonDescription: (minutes) => `Jouer une session de plus de ${minutes} minutes d'affilée.`,
        cabinetStreakTitles: {
            3: "On y revient",
            7: "Une semaine à la borne",
            15: "Pilier de la borne",
            30: "Fait partie des meubles",
        },
        cabinetStreakDescription: (days) => `Jouer sur la borne ${days} jours d'affilée, n'importe quelle table.`,
        rageQuitTitle: () => "Rage quit ?!",
        rageQuitDescription: (minSeconds, maxSeconds) => `Quitter une table au bout de ${minSeconds} à ${maxSeconds} secondes...`,
        grandReturnTitle: () => "Le grand retour",
        grandReturnDescription: (days) => `Rejouer une table après ${days} jours d'absence ou plus.`,
        // A Secret Achievement's hint, shown instead of its description while it is missing.
        rageQuitHint: () => "Il y a des jours où une table ne vous réussit pas...",
        grandReturnHint: () => "Les vieux amis sont toujours contents de vous revoir...",
        worldTourHint: () => "Certains voyages se font sans jamais appuyer sur Start...",
        nightOwlTitle: () => "Oiseau de nuit",
        nightOwlDescription: (from, to) => `Lancer une partie entre ${from} et ${to}.`,
        nightOwlHint: () => "Le flipper ne dort jamais...",
        fullMoonNightTitle: () => "Nuit de pleine lune",
        fullMoonNightDescription: (from, to, percent) => `Lancer une partie entre ${from} et ${to} quand la lune est éclairée à ${percent} % au moins.`,
        fullMoonNightHint: () => "Certaines nuits, même les loups-garous jouent au flipper...",
        fridayThe13thTitle: () => "Vendredi 13",
        fridayThe13thDescription: () => "Lancer une partie un vendredi 13.",
        fridayThe13thHint: () => "Certains jours, mieux vaut ne pas passer sous une échelle...",
        lunchBreakTitle: () => "Pause déjeuner",
        lunchBreakDescription: (from, to) => `Lancer une partie entre ${from} et ${to}, du lundi au vendredi.`,
        lunchBreakHint: () => "Un sandwich d'une main, le flipper de l'autre...",
        mirrorHourTitle: () => "Heure miroir",
        mirrorHourDescription: () => "Lancer une partie à une heure dont les minutes répètent l'heure, comme 11:11.",
        mirrorHourHint: () => "Faites un vœu...",
        fourSeasonsTitle: () => "Quatre saisons",
        fourSeasonsDescription: (count) => `Jouer au moins une fois dans chacune des ${count} saisons.`,
        fourSeasonsHint: () => "Le flipper, c'est toute l'année...",
        oneMoreGameTitle: () => "Encore une !",
        oneMoreGameDescription: (count) => `Jouer ${count} parties d'affilée sur la même table.`,
        oneMoreGameHint: () => "Quand on aime, on ne compte pas...",
        timeTravelTitle: () => "Voyage dans le temps",
        timeTravelDescription: (count) => `Jouer ${count} parties d'affilée, chacune sur une table d'une décennie plus ancienne que la précédente.`,
        timeTravelHint: () => "Et si on remontait le temps...",
        snackTimeTitle: () => "L'heure du goûter",
        snackTimeDescription: () => "Lancer une partie entre 16 h et 17 h.",
        snackTimeHint: () => "Juste une partie avant les devoirs...",
        wednesdayOffTitle: () => "Mercredi, c'est permis",
        wednesdayOffDescription: () => "Lancer une partie un mercredi après-midi.",
        wednesdayOffHint: () => "Pas d'école cet après-midi...",
        grownUpRecordTakenTitle: () => "Plus fort que les grands",
        grownUpRecordTakenDescription: () => "Prendre un record de table à un grand.",
        randomGamesTitles: {
            10: "Pifomètre",
            25: "Pile ou face",
            50: "Joueur de dés",
            100: "Poker face",
        },
        randomGamesDescription: (count) => `Jouer ${count} tables au hasard.`,
        challengesCompletedTitles: {
            1: "Premier défi",
            5: "Amateur de défis",
            10: "Chercheur de défis",
            25: "Chasseur de défis",
            50: "Maître des défis",
            100: "Légende de la semaine",
        },
        challengesCompletedDescription: (count) => (count === 1 ? "Réussir un défi." : `Réussir ${count} défis.`),
        highScoreTablesTitles: {
            1: "Initiales gravées dans la pierre",
            3: "Trois bannières hissées",
            5: "Seigneur des cinq tableaux",
            10: "Le Kwisatz Hiscorach",
        },
        highScoreTablesDescription: (count) => (count === 1 ? "Faire un meilleur score sur une table." : `Faire un meilleur score sur ${count} tables différentes.`),
        tableRecordTablesTitles: {
            1: "Un score pour les gouverner tous",
            3: "Seigneur de guerre des trois mondes",
        },
        tableRecordTablesDescription: (count) => (count === 1 ? "Battre le record d'une table." : `Battre le record de ${count} tables différentes.`),
        tableRecordTakenTitle: "L'Usurpateur",
        tableRecordTakenDescription: "Prendre le record d'une table à un autre profil.",
        dayManufacturersTitles: {
            3: "Tour du monde express",
            5: "Papillon du flipper",
            8: "Infidèle en série",
            10: "Casanova du flipper",
        },
        dayManufacturersDescription: (count) => `Jouer des tables de ${count} fabricants différents le même jour.`,
        // Header of the Achievement Toast card.
        toastHeader: "Succès débloqué",
    },

    achievementList: {
        menuEntry: "Mes succès",
        // The header's title and the section titles are shown in capitals.
        title: "Succès personnels",
        totalLine: (unlockedCount, totalCount, percent) => `${unlockedCount} / ${totalCount} succès débloqués (${percent} %)`,
        unlockedSection: "Succès débloqués",
        missingSection: "Succès à obtenir",
        // After a section's title.
        sectionCount: (count) => `(${count})`,
        // After at most four Avatars on a row: how many other Profiles have it too.
        moreOwners: (count) => `+${count}`,
        // A missing Secret Achievement's title.
        secretTitle: "???",
        // A missing Achievement's Achievement Progress, on its row.
        progressUnits: {
            tables: {
                short: (current, target) => `${current}/${target}`,
            },
            hours: {
                short: (current, target) => `${formatHours(current)}/${target} h`,
            },
            daysInARow: {
                short: (current, target) => `${current}/${target}`,
            },
            weeksInARow: {
                short: (current, target) => `${current}/${target}`,
            },
            daysPlayed: {
                short: (current, target) => `${current}/${target}`,
            },
            weeksPlayed: {
                short: (current, target) => `${current}/${target}`,
            },
            minutes: {
                short: (current, target) => `${current}/${target} min`,
            },
            randomGames: {
                short: (current, target) => `${current}/${target}`,
            },
            manufacturers: {
                short: (current, target) => `${current}/${target}`,
            },
            challenges: {
                short: (current, target) => `${current}/${target}`,
            },
        },
    },

    profileStats: {
        menuEntry: "Mon profil",
        // The buttons at the card's foot.
        buttons: {
            achievements: "Succès",
            frame: "Cadres d'Avatar",
            mostPlayedTables: "Tables les plus jouées",
            tablesToDiscover: "Tables à découvrir",
            household: "Stats de la maison",
        },
        // The Household Stats opened from the Household button: the title and
        // the line labels the stats above do not have.
        household: {
            title: "Statistiques de la maison",
            lines: {
                playerLevel: "Niveau de joueur",
                collectionMastery: "Maîtrise de la collection",
                achievementsUnlocked: "Succès débloqués",
                dailyStreak: "Jours d'affilée",
            },
        },
        // The Avatar Frame list opened from the Frame button: its title, the
        // "no frame" row, the worn row's mark and a locked frame's condition.
        frameList: {
            title: "Cadres d'Avatar",
            none: "Aucun",
            worn: "Porté",
            unlockCondition: (tier) => `Palier de collection ${tier}`,
        },
        // The card's Player Level: its title over the big digits, then the
        // points so far and those of the next level, thousands separated.
        playerLevel: {
            title: "NIVEAU",
            current: (points, nextLevelPoints) => `Actuel : ${points} / ${nextLevelPoints}`,
        },
        collectionTitle: "MAÎTRISE DE LA COLLECTION",
        sections: {
            game: "JEU",
            progression: "PROGRESSION",
            tastes: "GOÛTS",
        },
        // The stats' labels, over their values.
        stats: {
            gamesPlayed: "Parties jouées",
            totalTime: "Temps total",
            averageDuration: "Durée moyenne",
            collection: "Collection",
            challengesCompleted: "Défis réussis",
            highScoresHeld: "Meilleurs scores détenus",
            tableRecordsHeld: "Records détenus",
            cabinetStreak: "Jours d'affilée",
            dayStreak: "Série du jour",
            weekStreak: "Série de la semaine",
            favouriteManufacturer: "Constructeur favori",
            favouriteDecade: "Décennie favorite",
            favouriteTable: "Table préférée",
            firstTablePlayed: "Première table jouée",
            lastTablePlayed: "Dernière table jouée",
        },
        // Thousands separated by a no-break space: "1 206".
        number: (count) => String(count).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0"),
        // Minutes on two digits: "96 h 05".
        hoursAndMinutes: (hours, minutes) => `${hours} h ${String(minutes).padStart(2, "0")}`,
        minutes: (minutes) => `${minutes} min`,
        fraction: (count, total) => `${count}/${total}`,
        // The share of the collection played, in a pill.
        percent: (percent) => `${percent} %`,
        // A Streak's longest, in a pill (gold while the current one sets it).
        record: (longest) => `Record : ${longest}`,
        // A favourite's play time, in a pill; its hours and minutes given.
        playTime: (time) => `${time} de jeu`,
        // The favourite decade, by its start year: 1990 for 1990 to 1999.
        decade: (decadeStartYear) => `Années ${decadeStartYear}`,
        // The first or last table played's date, day and month on two digits.
        playedOn: (day, month, year) => `le ${day}/${month}/${year}`,
        // A stat without a value, such as the average before any Play.
        none: "—",
    },

    // Profiles. Guest's folder name is never shown: this is its name.
    profiles: {
        menuEntry: "Changer de joueur",
        pickerTitle: "Qui joue ?",
        pickerHint: "Flippers : changer · Start : choisir · Exit : annuler",
        guestName: "Invité",
        // The Profile picker's last slot, and the screen it opens.
        newProfile: "Nouveau profil",
        nameEntry: {
            title: "Nommez votre profil",
            lines: [
                "12 caractères au maximum.",
                "Pour un nom plus long ou accentué, renommez le dossier dans Windows, avant de jouer.",
            ],
            firstProfileLine: "Ce premier profil sera admin à la place d'Invité : choisissez-le ensuite pour garder les entrées de configuration.",
            ok: "OK",
            refusals: {
                guest: "Ce nom est celui du profil Invité.",
                reserved: "Windows se réserve ce nom.",
                taken: "Un profil porte déjà ce nom.",
            },
            folderFailed: "Le dossier de ce profil n'a pas pu être créé : vérifiez le dossier profiles dans Windows, puis réessayez.",
        },
        greeting: name => `Salut ${name} !`,
    },

    // A Drawn Menu shown natively: a line that cannot be used, with its reason.
    drawnMenu: {
        disabledLine: (label, reason) => `${label} (${reason})`,
    },

    // Manage profiles, in PinballY's Exit menu for an Admin Profile: the
    // marks and the Profile Reset.
    profileReset: {
        menuEntry: "Gérer les profils",
        listTitle: "Quel profil ?",
        adminLine: isAdmin => `Admin : ${isAdmin ? "oui" : "non"}`,
        childLine: isChild => `Enfant : ${isChild ? "oui" : "non"}`,
        reset: "Réinitialiser",
        back: "Retour",
        becomeAdmin: "Devenir admin",
        // Why a mark line is greyed out, by the mark rules' refusal.
        refusals: {
            guestNeverMarked: "Invité n'est jamais marqué",
            removeAdminMarkFirst: "Retirez d'abord la marque admin",
            removeChildMarkFirst: "Retirez d'abord la marque enfant",
            lastAdmin: "Dernier admin",
        },
        marksFailed: name => `Impossible de changer les marques de ${name}. Voir le journal pour les détails.`,
        confirm: name => `Réinitialiser ${name} ? Ses parties, séries, défis et succès seront tous effacés.`,
        yes: "Oui, réinitialiser",
        no: "Non",
        cancel: "Annuler",
        done: name => `${name} repart de zéro.`,
        failed: name => `Impossible de réinitialiser ${name}. Voir le journal pour les détails.`,
        ok: "OK",
        everyProfile: "Réinitialiser tous les profils",
        confirmEvery: count => `Réinitialiser les ${count} profils ? Leurs parties, séries, défis et succès seront tous effacés.`,
        everyDone: count => `Les ${count} profils repartent de zéro.`,
        everyFailed: (count, names) => `Profils réinitialisés : ${count}. Impossible de réinitialiser ${names.join(", ")}. Voir le journal pour les détails.`,
    },

    // Discord Rich Presence on the cabinet's Discord account (addons/discord_rich_presence.js).
    discordRichPresence: {
        choosingTable: "Choisit une table",
        tableOfTheDay: "Table du jour",
        tableOfTheWeek: "Table de la semaine",
        warningTitle: "Discord Rich Presence",
        warning: "Discord introuvable : la table jouée n'apparaîtra pas sur Discord. Lancez Discord avant PinballY.",
    },
    warningToast: {
        header: "Avertissement",
    },

    // The clock at the top left of the wheel screen.
    clock: {
        time: (hours, minutes) => `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    },

    // The Challenge Card, at the top right of the wheel screen (see common/challenges/challenge_card.js).
    challenges: {
        cardHeader: "Défi de la semaine",
        titles: {
            differentTables: (target) => `Jouer ${target} tables différentes`,
            manufacturerTables: (target, manufacturer) => `Jouer ${target} tables ${manufacturer} différentes`,
            decadeTables: (target, decade) => `Jouer ${target} tables différentes des années ${decade}`,
            differentManufacturers: (target) => `Jouer des tables de ${target} fabricants différents`,
            differentDecades: (target) => `Jouer des tables de ${target} décennies différentes`,
            neverPlayedTables: (target) => `Jouer ${target} tables jamais jouées`,
            dustyTables: (target) => `Jouer ${target} tables délaissées depuis six mois`,
            tableOfTheDayDays: (target) => `Jouer la table du jour ${target} jours différents`,
            tableOfTheWeekGames: (target) => `Jouer ${target} parties sur la table de la semaine`,
            activeDays: (target) => `Jouer ${target} jours différents`,
            endurance: (target) => `Jouer ${target} minutes sur une même table`,
            marathon: (target) => `Jouer ${target} minutes au total`,
            randomGames: (target) => `Jouer ${target} parties au hasard`,
            sameTableGames: (target) => `Jouer ${target} parties sur une même table`,
        },
        progress: (value, target, daysText) => `${value}/${target} · ${daysText}`,
        daysLeft: (days) => `encore ${days} jours`,
        lastDay: "dernier jour",
        completed: "Défi réussi !",
        verdictHeader: "Défi précédent",
        missed: (reached, target) => `Manqué · ${reached}/${target}`,
        toastHeader: "Défi réussi",
        toastDescription: (count) => (count === 1 ? "Premier défi réussi" : `${count} défis réussis`),
    },

    // The Mastery Bar, under the Challenge Card (see common/mastery/mastery_bar.js), and the
    // Collection Mastery's texts.
    tableMastery: {
        // Collection Mastery: the goal toward the next Collection Tier, how
        // many tables already reach it, or, at the last tier, that all did.
        collection: {
            goal: (count, levelName) => `Objectif : ${count} ${count === 1 ? "table" : "tables"} ${levelName}`,
            current: (reached, needed) => `Actuel : ${reached}/${needed}`,
            allTables: (levelName) => `Toutes tes tables : ${levelName}`,
        },
        levelNames: ["Novice", "Élève", "Adepte", "Disciple", "Spécialiste", "As", "Virtuose", "Prodige", "Légende", "Mage du flipper"],
        toDiscover: "Table à découvrir",
        toastHeader: "Maîtrise",
        toastTitle: (name, level) => `${name} (${level})`,
        collectionToastHeader: "Maîtrise de la collection",
        collectionToastTitle: (tier, name) => `Palier ${tier} : ${name}`,
        collectionToastDescription: (count, name) => `${count} ${count === 1 ? "table" : "tables"} au niveau ${name} ou plus`,
    },
    profileRewards: {
        // The Avatar Frames' names, from Collection Tier 1 to 10.
        frameNames: [
            "Sylve enchantée", "Vapeur et engrenages", "Néon d'arcade", "Givre éternel", "Épice d'Arrakis",
            "Grimoire arcanique", "Station orbitale", "Souffle du dragon", "Flipper royal", "Légende céleste",
        ],
        // The Mastery Toast's extra line, naming the frames its Collection
        // Tier unlocks (more than one when a Play raised it by several tiers).
        toastLine: (names) => `${names.length === 1 ? "Nouveau cadre" : "Nouveaux cadres"} : ${names.join(", ")}`,
        // The Holiday Frame toast's header; its title is the toast line.
        toastHeader: "Cadre de fête",
        // Each Holiday Frame's name, and what unlocks it: the locked row's
        // status in the frame list and the description of its toast.
        holidays: {
            newYear: { name: "Jour de l'An", condition: "Une partie le 1er janvier" },
            chineseNewYear: { name: "Nouvel An chinois", condition: "Une partie le jour du Nouvel An chinois, entre le 21 janvier et le 20 février" },
            valentine: { name: "Saint-Valentin", condition: "Une partie le 14 février" },
            mardiGras: { name: "Mardi gras", condition: "Une partie le jour de Mardi gras, 47 jours avant Pâques" },
            stPatrick: { name: "Saint-Patrick", condition: "Une partie le 17 mars" },
            easter: { name: "Pâques", condition: "Une partie le dimanche de Pâques" },
            musicDay: { name: "Fête de la Musique", condition: "Une partie le 21 juin" },
            halloween: { name: "Halloween", condition: "Une partie le 31 octobre" },
            deadDay: { name: "Día de los Muertos", condition: "Une partie le 1er ou le 2 novembre" },
            thanksgiving: { name: "Thanksgiving", condition: "Une partie le jour de Thanksgiving, le quatrième jeudi de novembre" },
            christmas: { name: "Noël", condition: "Une partie le 24 ou le 25 décembre" },
        },
        // The Reward Prompt, after a Profile's first frame: the frame's name,
        // then the main menu entry and the Profile Stats button to equip it from.
        prompt: {
            title: "Nouveau cadre",
            message: (name, menuEntry, button) => `Vous avez gagné le cadre « ${name} » ! Équipez-le depuis « ${menuEntry} », puis « ${button} ».`,
            goEquip: "Aller l'équiper",
            gotIt: "Plus tard...",
        },
    },
    playerLevel: {
        // Kept in English on purpose: the gamers' phrase.
        toastHeader: "Level up",
        toastTitle: (level) => `Niveau ${level}`,
        toastDescription: "Vos succès vous font passer au niveau supérieur.",
    },
    highScores: {
        toastHeader: "Meilleur score",
        toastTitle: (table, place) => `Meilleur score sur ${table} : ${place === 1 ? "1ère" : `${place}e`} place`,
        tableRecordTitle: (table) => `Record sur ${table} !`,
        toastScore: (score) => `${score} points`,
        takenFrom: (profile) => `pris à ${profile}`,
        // The High Score Board.
        board: {
            menuEntry: "Meilleurs scores",
            record: "Record",
            // In place of a place's owner when it belongs to no Profile.
            defaultScore: "Score par défaut",
            // In place of the initials when none were typed.
            noInitials: "\u2014",
            noScore: "Pas encore de score",
            // While PINemHi reads the board, as a message or a note over the last known one.
            reading: "Lecture\u2026",
            // Over the last known board when the fresh read failed.
            notRefreshed: "Ces scores n'ont pas pu être actualisés",
            notSupported: "Les meilleurs scores de cette table ne sont pas pris en charge",
            // A table without a ROM whose VPReg.stg section or text file is not learned yet.
            notLearned: "Lancez une partie pour faire apparaître les meilleurs scores de cette table",
        },
    },

    expansionPackSettings: {
        menuEntry: "Réglages de l'eXpansion pack",
        on: "Activé",
        off: "Désactivé",
        addOnLine: (name, state) => `${name} : ${state}`,
        languageLine: (languageName) => `Langue : ${languageName}`,
        startupScreenLine: (screenName) => `Écran de démarrage : ${screenName}`,
        startupScreenNames: { welcome: "Écran d'accueil", profilePicker: "Choix du joueur", wheel: "Roue" },
        offlineMode: "Mode hors ligne",
        updateCheckLine: (state) => `Recherche de mises à jour du pack : ${state}`,
        offerVpxtoolLine: (state) => `Proposer vpxtool : ${state}`,
        updateTo: (version) => `Mettre à jour en v${version}`,
        installVpxtool: (version) => `Installer vpxtool v${version}`,
        updateVpxtool: (installed, version) => `Mettre à jour vpxtool (v${installed} → v${version})`,
        vpxtoolUpToDateLine: "Mettre à jour vpxtool",
        vpxtoolUpToDate: (installed) => `vpxtool v${installed} est à jour`,
        back: "Retour",
        groups: {
            playersAndProgress: "Joueurs et progression",
            wheelScreen: "Écran de la roue",
            menusAndFilters: "Menus et filtres",
            launchingAndPlaying: "Lancer et jouer une table",
            debugging: "Débogage",
        },
        onRestart: (state) => `${state} au redémarrage`,
        whenOnLabel: "Activé :",
        whenOffLabel: "Désactivé :",
        save: "Enregistrer",
        cancel: "Annuler",
        discordConsentMessage: "Votre compte Discord ouvert sur ce PC montrera publiquement la table jouée, depuis combien de temps, et quand la roue est ouverte. Aucun nom de profil ni aucune autre donnée personnelle de ce PC n'est envoyé par le PinballY Expansion Pack.",
        discordConsentTurnOn: "Activer",
        notSaved: "Réglage non enregistré",
        ok: "OK",
        restartQuestion: "Les réglages enregistrés s'appliquent au redémarrage de PinballY.",
        restartNow: "Redémarrer maintenant",
        later: "Plus tard",
        restartFailedTitle: "Redémarrage impossible",
        restartFailed: "Les réglages s'appliqueront au prochain démarrage.",
        addOns: {
            profilePicker: {
                name: "Choix du joueur",
                whenOn: "« Changer de joueur » dans le menu principal, pour choisir qui joue.",
                whenOff: "Tout le monde joue en Invité ; ni avatar ni salut sur l'écran d'accueil.",
            },
            startupChoicePrompt: {
                name: "Écran d'accueil",
                whenOn: "Au démarrage et après « Changer de joueur » : choisir une table à jouer, ou changer de joueur.",
                whenOff: "Le choix du joueur salue seulement le joueur.",
            },
            achievements: {
                name: "Succès",
                whenOn: "Des Succès gagnés en jouant, chacun annoncé par une bannière.",
                whenOff: "Plus de Niveau de joueur.",
            },
            sessionStatsTracker: {
                name: "Statistiques de session",
                whenOn: "Compte chaque session, pour les Succès de session.",
                whenOff: "Plus de Succès de session.",
            },
            challenges: {
                name: "Défis",
                whenOn: "Un Défi chaque semaine, sous le badge du profil.",
                whenOff: "Plus de Succès ni de statistiques de Défis.",
            },
            tableMastery: {
                name: "Maîtrise des tables",
                whenOn: "Un niveau de Maîtrise sur chaque table, pour chaque joueur.",
                whenOff: "Plus de paliers de collection ni de leurs cadres d'avatar.",
            },
            highScores: {
                name: "Meilleurs scores",
                whenOn: "Chaque nouveau meilleur score attribué au joueur qui l'a fait.",
                whenOff: "Plus de Succès de meilleurs scores ni de records de tables ; les meilleurs scores de PinballY reviennent.",
            },
            statusLineInfo: {
                name: "Ligne d'état",
                whenOn: "L'année, le fabricant, les parties et le temps de jeu de la table dans la ligne d'état.",
                whenOff: "Rien d'autre ne change.",
            },
            clock: {
                name: "Horloge",
                whenOn: "L'heure en haut à gauche de l'écran.",
                whenOff: "Rien d'autre ne change.",
            },
            statusIcons: {
                name: "Icônes d'état",
                whenOn: "À côté de l'horloge, le symbole de Discord quand la borne est publique sur Discord, une flèche dorée quand une mise à jour du pack attend, une flèche barrée quand la recherche de mises à jour est désactivée.",
                whenOff: "Rien d'autre ne change.",
            },
            wheelArc: {
                name: "Arc de la roue",
                whenOn: "Un arc doré sous la roue, sauf si tu as ton propre fond.",
                whenOff: "Rien d'autre ne change.",
            },
            uiTranslation: {
                name: "Traduction de PinballY",
                whenOn: "Les menus et messages de PinballY dans la langue du pack.",
                whenOff: "Rien d'autre ne change.",
            },
            drawnMenus: {
                name: "Menus dessinés",
                whenOn: "Les menus de PinballY dessinés dans le style du pack.",
                whenOff: "Les menus simples de PinballY reviennent, sauf pour ces réglages.",
            },
            customMenuCommands: {
                name: "Commandes de menu",
                whenOn: "Configurer la table dans le menu principal.",
                whenOff: "Rien d'autre ne change.",
            },
            randomGame: {
                name: "Table au hasard",
                whenOn: "Lancer une table au hasard depuis le menu principal, sous Jouer.",
                whenOff: "La table au hasard reste sur l'écran d'accueil ; s'il est désactivé aussi, plus de Succès de tables au hasard.",
            },
            hallOfFame: {
                name: "Tables les plus jouées",
                whenOn: "Un filtre de tes dix tables les plus jouées.",
                whenOff: "Plus de bouton « Tables les plus jouées » dans les statistiques du profil.",
            },
            tablesToDiscover: {
                name: "Tables à découvrir",
                whenOn: "Un filtre des tables jamais jouées.",
                whenOff: "Plus de bouton « Tables à découvrir » dans les statistiques du profil.",
            },
            hiddenTables: {
                name: "Tables cachées",
                whenOn: "Un filtre des tables cachées.",
                whenOff: "Rien d'autre ne change.",
            },
            customFilter: {
                name: "Tables Originales",
                whenOn: "Un filtre « Tables Originales », dans « Filtrer par fabricant ».",
                whenOff: "Rien d'autre ne change.",
            },
            menuCleanup: {
                name: "Menus allégés",
                whenOn: "Des menus plus courts, sans les entrées peu utilisées comme Aide, À propos ou Affiche.",
                whenOff: "Rien d'autre ne change.",
            },
            forceBackglass: {
                name: "Backglass",
                whenOn: "Le backglass affiché au démarrage, caché pendant une partie.",
                whenOff: "Rien d'autre ne change.",
            },
            backglassClock: {
                name: "Horloge du backglass",
                whenOn: "L'heure dans un petit cadre sur l'écran du backglass pendant une partie.",
                whenOff: "Rien d'autre ne change.",
            },
            discordRichPresence: {
                name: "Discord Rich Presence",
                whenOn: "Votre compte Discord montre publiquement la table jouée et depuis combien de temps ; lancez Discord avant PinballY.",
                whenOff: "Rien d'autre ne change.",
            },
            seamlessLaunchOverlay: {
                name: "Écran de lancement",
                whenOn: "Pas d'écran noir pendant le chargement d'une table.",
                whenOff: "Rien d'autre ne change.",
            },
            playLaunchSound: {
                name: "Son de lancement",
                whenOn: "Un son quand une table se lance.",
                whenOff: "Rien d'autre ne change.",
            },
            ratingPrompt: {
                name: "Demande de note",
                whenOn: "Te demande de noter une table après un moment dessus.",
                whenOff: "Rien d'autre ne change.",
            },
            tableRoms: {
                name: "ROM des tables",
                whenOn: "Trouve seul la ROM de chaque table (avec vpxtool).",
                whenOff: "Rien d'autre ne change.",
            },
            launchEventsTrace: {
                name: "Trace des lancements",
                whenOn: "Journalise les lancements, pour le dépannage (avec LOG_LAUNCH_EVENTS=true).",
                whenOff: "Rien d'autre ne change.",
            },
        },
        languageNames: {
            en: "English",
            fr: "Français",
            de: "Deutsch",
            es: "Español",
            it: "Italiano",
            pt: "Português",
        },
    },

    // The Update Prompt at startup, and a Pack Update that cannot start (see common/updates/).
    packUpdates: {
        promptTitle: "Mise à jour disponible",
        // Names the newer Pack Version the Update Check found.
        prompt: (version) => `La version v${version} de l'eXpansion Pack est disponible.`,
        updateNow: "Mettre à jour",
        later: "Plus tard",
        updateFailedTitle: "Mise à jour impossible",
        updateFailed: "L'eXpansion Pack reste tel quel.",
        // Under the Loader while the Pack Update helper gets ready.
        downloadingUpdate: "Téléchargement de la mise à jour…",
        ok: "OK",
        updatedTitle: "Mise à jour terminée",
        updated: (version) => `eXpansion Pack mis à jour en v${version}`,
        toastTitle: "eXpansion Pack",
    },
    scriptReader: {
        dialogTitle: (version) => `vpxtool v${version}`,
        dialog: "vpxtool lit le script de chaque table pour que sa ROM se renseigne toute seule. Écrit par Francis De Brabandere, sous licence Apache-2.0, téléchargé depuis github.com/francisdb/vpxtool.",
        install: "Installer",
        noThanks: "Non merci",
        later: "Vous pourrez aussi l'installer plus tard depuis les Réglages de l'eXpansion pack, ou à la main.",
        downloading: "Téléchargement en cours…",
        ok: "OK",
        installedTitle: "vpxtool installé",
        installed: (version) => `vpxtool v${version} est installé : la ROM de chaque table se renseigne désormais toute seule.`,
        failedTitle: "Installation impossible",
        failed: "vpxtool n'a pas pu être installé ; rien n'a changé. Vous pouvez réessayer depuis les Réglages de l'eXpansion pack.",
        updateTitle: (installed, version) => `vpxtool v${installed} → v${version}`,
        update: "Mettre à jour",
        updateLater: "Vous pourrez aussi le mettre à jour plus tard depuis les Réglages de l'eXpansion pack, ou à la main.",
        updatedTitle: "vpxtool mis à jour",
        updated: (version) => `vpxtool est mis à jour en v${version}.`,
        updateFailedTitle: "Mise à jour impossible",
        updateFailed: "vpxtool n'a pas pu être mis à jour ; rien n'a changé. Vous pouvez réessayer depuis les Réglages de l'eXpansion pack.",
    },
    errorToast: {
        header: "Problème",
        playNotSaved: "Cette partie n'a pas pu être enregistrée : elle ne comptera pas dans vos statistiques.",
        playNotInPlayLog: "Cette partie a été comptée, mais elle manque à votre historique de parties.",
        packUpdateFailed: (version, logPath) => `La mise à jour en v${version} a échoué : la version précédente reste en place. Détails dans ${logPath}`,
    },
    releaseHighlights: {
        "1.2.0": [
            "Créez un profil directement depuis la borne : choisissez le « + » dans Changer de joueur.",
            "Discord peut maintenant montrer la table à laquelle vous jouez : activez-le dans les Réglages de l'eXpansion pack.",
        ],
        "1.1.0": [
            "Lancez une table au hasard directement depuis le menu principal.",
            "Pendant une partie, l'heure s'affiche maintenant sur l'écran du backglass.",
        ],
        "1.0.0": [
            "Version 1.0 : la première version publique de l'eXpansion Pack.",
            "Menus et messages sont plus lisibles, et tiennent dans l'écran dès la première seconde.",
            "Après chaque mise à jour, ce message présente désormais les nouveautés.",
        ],
    },
};

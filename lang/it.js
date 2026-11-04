// ============================================================
// Italian translations for PinballY's UI.
// Save this file as UTF-8 with BOM so accented characters display correctly.
// ============================================================

// The active Profile's play time of a table, as PinballY writes its own.
const formatPlayTime = (hours, minutes) => (hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")} ore`
    : `${minutes} minut${minutes === 1 ? "o" : "i"}`);

// Hours of play with one decimal, as an Achievement Progress shows them.
const formatHours = hours => hours.toFixed(1).replace(".", ",");

export default {
    // Direct translations of PinballY's native menu titles.
    nativeMenuLabels: {
        "About PinballY": "Informazioni su PinballY",
        "Add Media": "Aggiungi contenuti multimediali",
        "Add to Favorites": "Aggiungi ai preferiti",
        "Adjust Audio Volume": "Regola volume audio",
        "All Games": "Tutti i tavoli",
        "All Tables": "Tutti i tavoli",
        "Batch Capture": "Acquisizione in batch",
        "Batch Capture lets you capture screen shot images and videos for multiple games.  Step 1: select which games to include in the capture process:": "L'acquisizione in batch ti permette di acquisire screenshot e video per più tavoli. Passaggio 1: seleziona i tavoli da includere nel processo di acquisizione:",
        "Begin Capture": "Avvia acquisizione",
        "Cancel": "Annulla",
        "Capture images & videos": "Acquisisci immagini e video",
        "Confirm Power Off": "Conferma spegnimento",
        "Delete game details": "Elimina dettagli del tavolo",
        "Edit category names...": "Modifica nomi categorie...",
        "Edit game details...": "Modifica dettagli del tavolo...",
        "Enable Videos": "Abilita video",
        "Exit": "Esci",
        "Exit PinballY": "Esci da PinballY",
        "Favorites": "Preferiti",
        "Filter by Category": "Filtra per categoria",
        "Filter by Date Added": "Filtra per data di aggiunta",
        "Filter by Era": "Filtra per epoca",
        "Filter by Last Played": "Filtra per ultima partita",
        "Filter by Manufacturer": "Filtra per produttore",
        "Filter by Rating": "Filtra per valutazione",
        "Filter by System": "Filtra per sistema",
        "Find game media online": "Cerca contenuti multimediali online",
        "Games marked for batch capture": "Tavoli contrassegnati per l'acquisizione in batch",
        "Game Setup": "Configurazione del tavolo",
        "Help": "Aiuto",
        "Hide this game": "Nascondi questo tavolo",
        "High Scores": "Punteggi migliori",
        "In Favorites": "Nei preferiti",
        "Information": "Informazioni",
        "Instruction Card": "Scheda istruzioni",
        "Mark for Batch Capture": "Segna per acquisizione in batch",
        "Marked for Batch Capture": "Segnato per acquisizione in batch",
        "Mute Attract Mode": "Disattiva audio della modalità attrazione",
        "Mute Buttons": "Disattiva audio dei pulsanti",
        "Mute Table Audio": "Disattiva audio del tavolo",
        "Mute Videos": "Disattiva audio dei video",
        "Operator Menu": "Menu operatore",
        "Options": "Opzioni",
        "PinballY Options...": "Opzioni...",
        "Play": "Gioca",
        "Play Game": "Avvia partita",
        "Power Off": "Spegni il computer",
        "Proceed": "Continua",
        "Rate Table": "Valuta il tavolo",
        "Reset Coins/Credits": "Reimposta monete/crediti",
        "Resume Game": "Riprendi partita",
        "Return": "Indietro",
        "Save": "Salva",
        "Search": "Cerca",
        "Select categories": "Seleziona categorie",
        "Show Hidden Games": "Mostra tavoli nascosti",
        "Show Media Files": "Mostra file multimediali",
        "Show Unconfigured Games": "Mostra tavoli non configurati",
        "Skip this message next time": "Non mostrare più questo messaggio",
        "Terminate Game": "Termina partita",
        "The capture process records the exact same areas of the screen where your PinballY windows are located.  Before proceeding, make sure that your PinballY window layout matches the screen layout of the game you're about to record.  For example, if the game's playfield is full-screen, make sure PinballY's playfield window is full-screen.": "Il processo di acquisizione registra esattamente le stesse aree dello schermo in cui si trovano le finestre di PinballY. Prima di procedere, assicurati che la disposizione delle finestre di PinballY corrisponda a quella dello schermo del gioco che stai per registrare. Ad esempio, se il piano di gioco del gioco è a schermo intero, assicurati che anche la finestra del piano di gioco di PinballY sia a schermo intero.",
        "This will launch a Web browser window to search for media files for this game.  Look for a \"HyperPin Media Pack\" file.  Download the file and drag it onto this window to install it.\n\nNote that you can drop a Media Pack file onto this window at any time to install media for the currently selected game.  This menu step isn't required to install media; it's just a convenience for launching a Web search.": "Verrà aperta una finestra del browser Web per cercare file multimediali per questo tavolo. Cerca un file \"HyperPin Media Pack\". Scarica il file e trascinalo su questa finestra per installarlo.\n\nNota che puoi trascinare un file Media Pack su questa finestra in qualsiasi momento per installare i contenuti multimediali per il tavolo attualmente selezionato. Questo passaggio del menu non è necessario per installare i contenuti multimediali; serve solo come comoda scorciatoia per avviare una ricerca sul Web.",
        "Uncategorized": "Non categorizzati",
        "Yes, add to current game": "Sì, aggiungi al tavolo attuale",
        "You must enter the game's bibliographic information (title, system, etc.) before adding media files for the game.  The game information is used to determine the folder locations and file names for the game's media files, so it has to be entered before media files can be added to the game.": "Devi inserire le informazioni bibliografiche del tavolo (titolo, sistema, ecc.) prima di aggiungere file multimediali per il tavolo. Queste informazioni vengono utilizzate per determinare i percorsi delle cartelle e i nomi dei file per i contenuti multimediali del tavolo, quindi devono essere inserite prima di poter aggiungere file multimediali.",
        "Flyer": "Volantino",
        "Pinscape Night Mode": "Modalità notte Pinscape",
        "Hidden Tables": "Tavoli nascosti",
        "Unconfigured Tables": "Tavoli non configurati",
        "Tables played within:": "Tavoli giocati da meno di:",
        "Tables not played within:": "Tavoli non giocati da:",
        "Tables added within:": "Tavoli aggiunti da meno di:",
        "Tables added more than:": "Tavoli aggiunti più di:",
        "A week": "Una settimana",
        "A month": "Un mese",
        "A year": "Un anno",
        "A week ago": "Una settimana fa",
        "A month ago": "Un mese fa",
        "A year ago": "Un anno fa",
        "Never played": "Mai giocati",
        "Batch Capture Step 2: Select the media types you'd like to capture for the selected games.  (You'll be able to say what to do about existing files in the next step.)": "Acquisizione in batch, passo 2: seleziona i tipi di media da acquisire per i tavoli scelti. (Nel passo successivo potrai indicare cosa fare dei file esistenti.)",
        "Batch Capture Step 3: For each type, indicate if you'd like to capture the item for EVERY game, even for games that already have existing media of the same type, or if you'd only like to capture missing items.": "Acquisizione in batch, passo 3: per ogni tipo, indica se acquisirlo per OGNI tavolo, anche per quelli che hanno già un media di quel tipo, o solo per quelli in cui manca.",
        "Next Step": "Passo successivo",
        "Missing only": "Solo mancanti",
        "Capture all": "Acquisisci tutto",
        "View Capture List": "Visualizza elenco di acquisizione",
        "Please select the system to use to launch this table:": "Seleziona il sistema con cui avviare questo tavolo:",
        "Yes, run as Admin": "Sì, esegui come amministratore",
        "No, cancel": "No, annulla",
        "Allow (this session only)": "Consenti (solo questa sessione)",
        "Allow (always)": "Consenti (sempre)",
        "Yes, delete it": "Sì, elimina",
    },

    // Labels for the media-capture screen's "Item: Action" lines
    // (e.g. "Playfield Image: Skip"), combined via dynamicLabelBuilders.captureItemAction.
    mediaCaptureItemLabels: {
        "Backglass Image": "Immagine del backglass",
        "Backglass Video": "Video del backglass",
        "Flyer Image": "Immagine del volantino",
        "Instruction Card": "Scheda istruzioni",
        "Playfield Image": "Immagine del piano di gioco",
        "Playfield Video": "Video del piano di gioco",
        "Table Audio": "Audio del tavolo",
        "Wheel Image": "Immagine della wheel",
        "DMD Image": "Immagine del DMD",
        "DMD Video": "Video del DMD",
        "Topper Image": "Immagine del topper",
        "Topper Video": "Video del topper",
        "Launch Audio": "Audio di avvio",
        "Real DMD Image": "Immagine del DMD reale",
        "Real DMD Video": "Video del DMD reale",
        "Real RGB DMD Image": "Immagine del DMD RGB reale",
        "Real RGB DMD Video": "Video del DMD RGB reale",
    },
    mediaCaptureActionLabels: {
        "Add": "Aggiungi",
        "Capture": "Acquisisci",
        "Capture Silent": "Acquisisci senza audio",
        "Capture w/Audio": "Acquisisci con audio",
        "Keep Existing": "Mantieni quello esistente",
        "Replace Existing": "Sostituisci quello esistente",
        "Skip": "Ignora",
    },

    // Status text shown in PinballY's launch overlay, keyed by the
    // language-independent event id (see the "launchoverlaymessage" event).
    launchOverlayMessages: {
        "after": "",
        "capturing": "Acquisizione in corso...",
        "gameover": "Game Over",
        "init": "",
        "launching": "Caricamento in corso...",
        "running": "Avvio del tavolo...",
        "terminating": "Ritorno all'elenco dei giochi...",
    },

    // The step under way, written in gold beneath the Loader while a
    // table launches or closes (Seamless Launch Overlay).
    launchSteps: {
        loading: "Caricamento…",
        closing: "Ritorno ai tavoli…",
        capturing: "Acquisizione…",
    },

    // Functions that build translated titles for PinballY's dynamically
    // generated menu text (category names, star ratings, etc.).
    dynamicLabelBuilders: {
        captureInstructions: (seconds) => {
            const plural = seconds === "1" ? "" : "i";
            return `Seleziona gli elementi da acquisire, quindi fai clic su Avvia acquisizione. Questo avvierà il gioco, acquisirà le immagini dello schermo e chiuderà automaticamente il gioco al termine. Il processo richiederà circa ${seconds} second${plural}. (!) indica che un elemento esistente verrà sostituito.`;
        },
        captureInstructionsOneMinute: () =>
            "Seleziona gli elementi da acquisire, quindi fai clic su Avvia acquisizione. Questo avvierà il gioco, acquisirà le immagini dello schermo e chiuderà automaticamente il gioco al termine. Il processo richiederà circa 1 minuto. (!) indica che un elemento esistente verrà sostituito.",
        captureItemAction: (item, action) => `${item}: ${action}`,
        decadeTables: (decade) => `Tavoli degli anni ${decade}`,
        genericTables: (name) => `Tavoli ${name}`,
        mediaGameMismatchWarning: (draggedGame, currentGame) =>
            `Sembra che alcuni dei file multimediali che stai aggiungendo possano essere destinati a un tavolo diverso, "${draggedGame}". I file multimediali vengono sempre aggiunti al tavolo selezionato sulla wheel, attualmente "${currentGame}". Vuoi aggiungere questi elementi multimediali al tavolo attuale?`,
        mediaGameMismatchWarningMultiple: (gameList, currentGame) =>
            `Sembra che alcuni dei file multimediali che stai aggiungendo possano essere destinati ad altri tavoli: ${gameList}. I file multimediali vengono sempre aggiunti al tavolo selezionato sulla wheel, attualmente "${currentGame}". Vuoi aggiungere questi elementi multimediali al tavolo attuale?`,
        mediaReadyToAdd: (gameName) =>
            `I seguenti elementi multimediali sono pronti per essere aggiunti a ${gameName}. Seleziona gli elementi che desideri aggiungere o sostituire.`,
        starTables: (count) => `Tavoli con ${count} stella${count > 1 ? "e" : ""}`,
        startDelay: (seconds) => `Regola ritardo di avvio (${seconds} sec)`,
        unratedTables: () => "Tavoli non valutati",
        batchCaptureReady: (count, duration) => `L'acquisizione in batch è pronta! ${count} tavolo/i saranno inclusi in questo processo, che richiederà circa ${duration}.`,
        confirmDeleteGameDetails: (title) => `Vuoi davvero eliminare i dettagli del tavolo ${title}? (Vengono eliminate solo le informazioni bibliografiche, non i file del tavolo né i suoi media.)`,
        showCustomView: (name) => `Mostra ${name}`,
        durationSeconds: (count) => `${count} second${count === 1 ? "o" : "i"}`,
        durationMinutes: (count) => `${count} minut${count === 1 ? "o" : "i"}`,
        durationHours: (hours, minutes) => (minutes > 0 ? `${hours} h ${minutes} min` : `${hours} or${hours === 1 ? "a" : "e"}`),
    },

    ratingPrompt: {
        title: "Valuta questo tavolo",
        message: (tableTitle, minutes) =>
            `Hai giocato a "${tableTitle}" per più di ${minutes} minuti! Vuoi valutarlo ora?`,
        rateNow: "Valuta ora",
        notNow: "Più tardi",
    },

    // The Button Hints at the foot of every drawn screen and the Exit
    // Button's tooltip (see GLOSSARY.md). The key caps and the footer's
    // words are shown in capitals.
    buttonHints: {
        // PinballY's button names, as on the cabinet's key caps.
        keyCaps: { next: "Next", prev: "Prev", select: "Select", exit: "Exit" },
        browse: "Sfoglia",
        // The flippers on a High Score Board longer than the window.
        scroll: "Scorri",
        choose: "Scegli",
        // Exit's word and the Exit Button's tooltip: Back where Exit brings
        // back a screen or a menu, Close where it leaves the bare wheel.
        back: "Indietro",
        close: "Chiudi",
    },

    welcomeScreen: {
        greetings: { morning: "Buongiorno", afternoon: "Buon pomeriggio", evening: "Buonasera", night: "Ancora in piedi" },
        greetingWithName: (greeting, name) => [`${greeting}, `, name, "!"],
        greetingAlone: (greeting) => `${greeting}!`,
        stayOn: (tableTitle) => `Resta su ${tableTitle}`,
        stayOnWheel: "Resta sulla ruota",
        randomTable: "Avvia un tavolo a caso",
        menuEntry: "Benvenuto",
        // The active Profile's Daily Streak under the greeting, from 2 days
        // on, its count shown in a square before the text.
        cabinetStreak: {
            notYetToday: "giorni di fila al cabinato: continua così!",
            playedToday: "giorni di fila al cabinato",
        },
        lostRecord: (taker, tableTitle) => `${taker} ti ha tolto il record su ${tableTitle}`,
        lostRecords: (records, moreCount) => {
            const named = records.map(record => `${record.tableTitle} (${record.taker})`);
            return moreCount > 0
                ? `Record persi: ${named.join(", ")} e altri ${moreCount}`
                : `Record persi: ${named.slice(0, -1).join(", ")} e ${named[named.length - 1]}`;
        },
        // One card per Period Table; its grey line says it was played this
        // Period, or else the Streak of the daily or weekly rendezvous, its
        // count shown in a square before the text.
        periodCards: {
            day: {
                period: "TAVOLO DEL GIORNO",
                played: "Giocato oggi",
                streak: "giorni di fila sul tavolo del giorno: continua così!",
            },
            week: {
                period: "TAVOLO DELLA SETTIMANA",
                played: "Giocato in settimana",
                streak: "settimane di fila sul tavolo della settimana: continua così!",
            },
            challenge: {
                period: "UN TAVOLO DELLA SFIDA",
                progress: (title, value, target) => `${title} · ${value}/${target}`,
                lastStep: "Ancora una partita per completare la sfida!",
            },
            go: "Vai",
        },
    },
    // Lower status line text for the currently selected table.
    // [Filter.Count], [Game.Year], etc. are PinballY placeholders — keep them as-is.
    tableInfoStatusLines: {
        manufacturer: (position) => `Tavolo ${position}/[Filter.Count] - prodotto da [Game.Manuf].`,
        manufacturerFictional: (position) => `Tavolo ${position}/[Filter.Count] - Flipper fittizio.`,
        playCount: (position, count) => `Tavolo ${position}/[Filter.Count] - avviato ${count} volte.`,
        playTime: (position, hours, minutes) => `Tavolo ${position}/[Filter.Count] - giocato per ${formatPlayTime(hours, minutes)}.`,
        year: (position) => `Tavolo ${position}/[Filter.Count] - pubblicato nel [Game.Year].`,
    },

    // Upper status line messages, after the player's own from PinballY's options.
    // [Filter.Count] is a PinballY placeholder — keep it as-is.
    upperStatusLines: {
        welcome: name => `Ti diamo il benvenuto, ${name}!`,
        tablesAvailable: "[Filter.Count] tavoli disponibili!",
        launchHint: "Pulsante di lancio per avviare un tavolo.",
        browseHint: "Flipper sinistro/destro per scorrere i tavoli.",
        signOff: "Buon divertimento!",
    },

    // Labels for menu items this project adds itself (see custom_menu_commands.js, random_game.js, custom_filter.js, hall_of_fame.js and tables_to_discover.js).
    customMenuLabels: {
        challengeTables: "Tavoli della sfida",
        hallOfFameFilter: "Hall of Fame",
        myHighScoresFilter: "I miei punteggi",
        hiddenTablesFilter: "Tavoli nascosti",
        tablesToDiscoverFilter: "Tavoli da scoprire",
        originalTablesFilter: "Tavoli originali",
        tableSetup: "Configurazione del tavolo",
        // The Random Game's main menu entry, worded as welcomeScreen.randomTable.
        randomTable: "Avvia un tavolo a caso",
        tableScores: "Punteggi",
        filterPickerBack: "Indietro",
        activeFilter: (name) => `Filtro attivo: ${name}`,
        // The Drawn main menu's "Change Filter" entry, and its footer's label before the Active Filter.
        changeFilter: "Cambia filtro",
        activeFilterLabel: "Filtro attivo:",
    },

    achievements: {
        dailyFirstPlayTitle: () => "Ciao, tavolo del giorno!",
        dailyFirstPlayDescription: () => "Avviare il tavolo del giorno per la prima volta.",
        weeklyFirstPlayTitle: () => "Appuntamento settimanale",
        weeklyFirstPlayDescription: () => "Avviare il tavolo della settimana per la prima volta.",
        dailyPeriodsPlayedTitles: {
            10: "Esploratore della domenica",
            25: "Esploratore curioso",
            50: "Esploratore esperto",
            100: "Indiana Flippers",
        },
        dailyPeriodsPlayedDescription: (days) => `Avviare il tavolo del giorno in ${days} giorni diversi.`,
        weeklyPeriodsPlayedTitles: {
            4: "Un mese di appuntamenti",
            10: "Habitué della settimana",
            26: "Sei mesi di fedeltà",
            52: "Un anno e non sentirlo",
        },
        weeklyPeriodsPlayedDescription: (weeks) => `Avviare il tavolo della settimana in ${weeks} settimane diverse.`,
        dailyStreakTitles: {
            3: "Non c'è due senza tre",
            7: "Settimana perfetta",
            14: "Due settimane di ferro",
            30: "Monaco del flipper",
        },
        dailyStreakDescription: (days) => `Avviare il tavolo del giorno per ${days} giorni di fila.`,
        weeklyStreakTitles: {
            4: "Un mese senza errori",
            12: "Abbonato fedele",
        },
        weeklyStreakDescription: (weeks) => `Avviare il tavolo della settimana per ${weeks} settimane di fila.`,
        manufacturerCompletionTitle: (manufacturer) => `Fan assoluto di ${manufacturer}`,
        manufacturerCompletionDescription: (manufacturer, count) => `Giocare almeno una volta tutti i ${count} tavoli ${manufacturer}.`,
        firstTableTitle: () => "Primi passi",
        firstTableDescription: () => "Giocare il tuo primissimo tavolo.",
        collectionPercentTitles: {
            10: "Il gusto del metallo",
            25: "Collezionista in erba",
            50: "Metà partita",
            75: "Quasi tutto visto",
            100: "Non mi sfugge niente",
        },
        collectionPercentDescription: (percent, playedCount, totalCount) => `Giocare ${playedCount} tavoli su ${totalCount} (${percent}% della tua collezione).`,
        worldTourTitle: () => "Giro del mondo",
        worldTourDescription: () => "Scorrere tutti i tavoli della ruota in una volta sola, senza avviarne nessuno.",
        playTimeMilestoneTitles: {
            1: "Riscaldamento",
            5: "Si fa sul serio",
            10: "Malato di flipper",
            50: "Flipper nel sangue",
            100: "Leggenda del tilt",
        },
        playTimeMilestoneDescription: (hours) => `Accumulare più di ${hours} or${hours > 1 ? "e" : "a"} di gioco.`,
        decadeCompletionTitle: (decadeStartYear) => `Viaggio negli anni ${decadeStartYear}`,
        decadeCompletionDescription: (decadeStartYear, count) => `Giocare almeno una volta tutti i ${count} tavoli degli anni ${decadeStartYear}.`,
        categoryCompletionTitle: (category) => `Maestro ${category}`,
        categoryCompletionDescription: (category, count) => `Giocare almeno una volta tutti i ${count} tavoli "${category}".`,
        marathonTitles: {
            30: "Piccola maratona",
            60: "Maratoneta",
        },
        marathonDescription: (minutes) => `Giocare una singola sessione di oltre ${minutes} minuti.`,
        cabinetStreakTitles: {
            3: "Ci ho preso gusto",
            7: "Una settimana al cabinato",
            15: "Cliente abituale",
            30: "Parte dell'arredamento",
        },
        cabinetStreakDescription: (days) => `Giocare al cabinato ${days} giorni di fila, su qualsiasi tavolo.`,
        rageQuitTitle: () => "Abbandono per rabbia?!",
        rageQuitDescription: (minSeconds, maxSeconds) => `Lasciare un tavolo dopo appena ${minSeconds}-${maxSeconds} secondi...`,
        grandReturnTitle: () => "Il grande ritorno",
        grandReturnDescription: (days) => `Rigiocare un tavolo dopo ${days} o più giorni di assenza.`,
        // A Secret Achievement's hint, shown instead of its description while it is missing.
        rageQuitHint: () => "Ci sono giorni in cui un tavolo proprio non gira...",
        grandReturnHint: () => "I vecchi amici sono sempre felici di rivederti...",
        worldTourHint: () => "Certi viaggi si fanno senza mai premere Start...",
        nightOwlTitle: () => "Nottambulo",
        nightOwlDescription: (from, to) => `Avviare una partita tra le ${from} e le ${to}.`,
        nightOwlHint: () => "Il flipper non dorme mai...",
        fullMoonNightTitle: () => "Notte di luna piena",
        fullMoonNightDescription: (from, to, percent) => `Avviare una partita tra le ${from} e le ${to} con la luna illuminata almeno al ${percent}%.`,
        fullMoonNightHint: () => "Certe notti, anche i lupi mannari giocano a flipper...",
        fridayThe13thTitle: () => "Venerdì 13",
        fridayThe13thDescription: () => "Avviare una partita di venerdì 13.",
        fridayThe13thHint: () => "Certi giorni è meglio non passare sotto una scala...",
        lunchBreakTitle: () => "Pausa pranzo",
        lunchBreakDescription: (from, to) => `Avviare una partita tra le ${from} e le ${to}, dal lunedì al venerdì.`,
        lunchBreakHint: () => "Il panino in una mano, il flipper nell'altra...",
        mirrorHourTitle: () => "Ora doppia",
        mirrorHourDescription: () => "Avviare una partita a un'ora in cui le ore sono uguali ai minuti, come le 11:11.",
        mirrorHourHint: () => "Esprimi un desiderio...",
        fourSeasonsTitle: () => "Quattro stagioni",
        fourSeasonsDescription: (count) => `Giocare almeno una volta in ciascuna delle ${count} stagioni.`,
        fourSeasonsHint: () => "Il flipper è per tutto l'anno...",
        oneMoreGameTitle: () => "Ancora una partita!",
        oneMoreGameDescription: (count) => `Giocare lo stesso tavolo ${count} volte di fila.`,
        oneMoreGameHint: () => "Quando si ama, non si conta...",
        timeTravelTitle: () => "Viaggio nel tempo",
        timeTravelDescription: (count) => `Giocare ${count} partite di fila, ognuna su un tavolo di un decennio più vecchio del precedente.`,
        timeTravelHint: () => "E se tornassimo indietro nel tempo...",
        snackTimeTitle: () => "Ora della merenda",
        snackTimeDescription: () => "Avviare una partita tra le 16 e le 17.",
        snackTimeHint: () => "Solo una partita prima dei compiti...",
        wednesdayOffTitle: () => "Mercoledì libero",
        wednesdayOffDescription: () => "Avviare una partita di mercoledì pomeriggio.",
        wednesdayOffHint: () => "Niente scuola oggi pomeriggio...",
        grownUpRecordTakenTitle: () => "Più forte dei grandi",
        grownUpRecordTakenDescription: () => "Togliere un record del tavolo a un adulto.",
        randomGamesTitles: {
            10: "E perché no?",
            25: "Testa o croce",
            50: "Giocatore di dadi",
            100: "Adoooooro il caso",
        },
        randomGamesDescription: (count) => `Giocare ${count} tavoli a caso.`,
        challengesCompletedTitles: {
            1: "Prima sfida",
            5: "Amante delle sfide",
            10: "Cercatore di sfide",
            25: "Cacciatore di sfide",
            50: "Maestro delle sfide",
            100: "Leggenda della settimana",
        },
        challengesCompletedDescription: (count) => (count === 1 ? "Completare una sfida." : `Completare ${count} sfide.`),
        highScoreTablesTitles: {
            1: "Iniziali nella pietra",
            3: "Tre stendardi issati",
            5: "Signore dei cinque tabelloni",
            10: "Il Kwisatz Hiscorach",
        },
        highScoreTablesDescription: (count) => (count === 1 ? "Ottenere un punteggio migliore su un tavolo." : `Ottenere punteggi migliori su ${count} tavoli diversi.`),
        tableRecordTablesTitles: {
            1: "Un record per domarli tutti",
            3: "Condottiero di tre mondi",
        },
        tableRecordTablesDescription: (count) => (count === 1 ? "Stabilire un record del tavolo." : `Stabilire record del tavolo su ${count} tavoli diversi.`),
        tableRecordTakenTitle: "L'usurpatore",
        tableRecordTakenDescription: "Togliere un record del tavolo a un altro profilo.",
        dayManufacturersTitles: {
            3: "Giro del mondo express",
            5: "Farfalla del flipper",
            8: "Infedele seriale",
            10: "Casanova del flipper",
        },
        dayManufacturersDescription: (count) => `Giocare tavoli di ${count} produttori diversi nello stesso giorno.`,
        // Header of the Achievement Toast card.
        toastHeader: "Obiettivo sbloccato",
    },

    achievementList: {
        menuEntry: "I miei obiettivi",
        // The header's title and the section titles are shown in capitals.
        title: "Elenco degli obiettivi",
        totalLine: (unlockedCount, totalCount, percent) => `${unlockedCount} / ${totalCount} obiettivi sbloccati (${percent}%)`,
        unlockedSection: "Obiettivi sbloccati",
        missingSection: "Obiettivi da ottenere",
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
        menuEntry: "Il mio profilo",
        // The buttons at the card's foot.
        buttons: {
            achievements: "Obiettivi",
            frame: "Cornici avatar",
            mostPlayedTables: "Tavoli più giocati",
            tablesToDiscover: "Tavoli da scoprire",
            household: "Statistiche di casa",
        },
        // The Household Stats opened from the Household button: the title and
        // the line labels the stats above do not have.
        household: {
            title: "Statistiche di casa",
            lines: {
                playerLevel: "Livello giocatore",
                collectionMastery: "Maestria della collezione",
                achievementsUnlocked: "Obiettivi sbloccati",
                dailyStreak: "Giorni di fila",
            },
        },
        // The Avatar Frame list opened from the Frame button: its title, the
        // "no frame" row, the worn row's mark and a locked frame's condition.
        frameList: {
            title: "Cornici avatar",
            none: "Nessuna",
            worn: "Indossata",
            unlockCondition: (tier) => `Grado della collezione ${tier}`,
        },
        // The card's Player Level: its title over the big digits, then the
        // points so far and those of the next level, thousands separated.
        playerLevel: {
            title: "LIVELLO",
            current: (points, nextLevelPoints) => `Attuale: ${points} / ${nextLevelPoints}`,
        },
        collectionTitle: "MAESTRIA DELLA COLLEZIONE",
        sections: {
            game: "GIOCO",
            progression: "PROGRESSI",
            tastes: "GUSTI",
        },
        // The stats' labels, over their values.
        stats: {
            gamesPlayed: "Partite giocate",
            totalTime: "Tempo totale",
            averageDuration: "Partita media",
            collection: "Collezione",
            challengesCompleted: "Sfide completate",
            highScoresHeld: "Punteggi migliori",
            tableRecordsHeld: "Record del tavolo",
            cabinetStreak: "Giorni di fila al cabinato",
            dayStreak: "Serie tavolo del giorno",
            weekStreak: "Serie tavolo della settimana",
            favouriteManufacturer: "Produttore preferito",
            favouriteDecade: "Decennio preferito",
            favouriteTable: "Tavolo più giocato",
            firstTablePlayed: "Primo tavolo giocato",
            lastTablePlayed: "Ultimo tavolo giocato",
        },
        // Thousands separated: "1.206".
        number: (count) => String(count).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
        // Minutes on two digits: "96 h 05".
        hoursAndMinutes: (hours, minutes) => `${hours} h ${String(minutes).padStart(2, "0")}`,
        minutes: (minutes) => `${minutes} min`,
        fraction: (count, total) => `${count}/${total}`,
        // The share of the collection played, in a pill.
        percent: (percent) => `${percent}%`,
        // A Streak's longest, in a pill (gold while the current one sets it).
        record: (longest) => `Record: ${longest}`,
        // A favourite's play time, in a pill; its hours and minutes given.
        playTime: (time) => `${time} di gioco`,
        // The favourite decade, by its start year: 1990 for 1990 to 1999.
        decade: (decadeStartYear) => `Anni ${decadeStartYear}`,
        // The first or last table played's date, day and month on two digits.
        playedOn: (day, month, year) => `il ${day}/${month}/${year}`,
        // A stat without a value, such as the average before any Play.
        none: "—",
    },

    // Profiles. Guest's folder name is never shown: this is its name.
    profiles: {
        menuEntry: "Cambia giocatore",
        pickerTitle: "Chi gioca?",
        pickerHint: "Flipper: scorri · Start: scegli · Exit: annulla",
        guestName: "Ospite",
        // The Profile picker's last slot, and the screen it opens.
        newProfile: "Nuovo profilo",
        nameEntry: {
            title: "Dai un nome al tuo profilo",
            lines: [
                "12 caratteri al massimo.",
                "Per un nome più lungo o con accenti, rinomina la cartella in Windows prima di giocare.",
            ],
            firstProfileLine: "Questo primo profilo sarà admin al posto di Ospite: sceglilo poi per mantenere le voci di configurazione.",
            ok: "OK",
            refusals: {
                guest: "Questo nome è quello del profilo Ospite.",
                reserved: "Windows riserva questo nome per sé.",
                taken: "Un profilo ha già questo nome.",
            },
            folderFailed: "Non è stato possibile creare la cartella di questo profilo: controlla la cartella profiles in Windows e riprova.",
        },
        greeting: name => `Ciao ${name}!`,
    },

    // A Drawn Menu shown natively: a line that cannot be used, with its reason.
    drawnMenu: {
        disabledLine: (label, reason) => `${label} (${reason})`,
    },

    // Manage profiles, in PinballY's Exit menu for an Admin Profile: the
    // marks and the Profile Reset.
    profileReset: {
        menuEntry: "Gestisci i profili",
        listTitle: "Quale profilo?",
        adminLine: isAdmin => `Admin: ${isAdmin ? "sì" : "no"}`,
        childLine: isChild => `Bambino: ${isChild ? "sì" : "no"}`,
        reset: "Azzera",
        back: "Indietro",
        becomeAdmin: "Diventa admin",
        // Why a mark line is greyed out, by the mark rules' refusal.
        refusals: {
            guestNeverMarked: "Ospite non viene mai contrassegnato",
            removeAdminMarkFirst: "Togli prima il segno di admin",
            removeChildMarkFirst: "Togli prima il segno di bambino",
            lastAdmin: "Ultimo admin",
        },
        marksFailed: name => `Impossibile cambiare i segni di ${name}. Consulta il log per i dettagli.`,
        confirm: name => `Azzerare ${name}? Tutte le sue partite, serie, sfide e obiettivi saranno cancellati.`,
        yes: "Sì, azzera",
        no: "No",
        cancel: "Annulla",
        done: name => `${name} riparte da zero.`,
        failed: name => `Impossibile azzerare ${name}. Consulta il log per i dettagli.`,
        ok: "OK",
        everyProfile: "Azzera tutti i profili",
        confirmEvery: count => `Azzerare tutti i ${count} profili? Tutte le loro partite, serie, sfide e obiettivi saranno cancellati.`,
        everyDone: count => `Tutti i ${count} profili ripartono da zero.`,
        everyFailed: (count, names) => `Profili azzerati: ${count}. Impossibile azzerare: ${names.join(", ")}. Consulta il log per i dettagli.`,
    },

    // Discord Rich Presence on the cabinet's Discord account (addons/discord_rich_presence.js).
    discordRichPresence: {
        choosingTable: "Sceglie un tavolo",
        tableOfTheDay: "Tavolo del giorno",
        tableOfTheWeek: "Tavolo della settimana",
        warningTitle: "Discord Rich Presence",
        warning: "Discord non trovato: il tavolo giocato non apparirà su Discord. Avvia Discord prima di PinballY.",
    },
    warningToast: {
        header: "Avviso",
    },

    // The clock at the top left of the wheel screen.
    clock: {
        time: (hours, minutes) => `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    },

    // The Challenge Card, at the top right of the wheel screen (see common/challenges/challenge_card.js).
    challenges: {
        cardHeader: "Sfida della settimana",
        titles: {
            differentTables: (target) => `Giocare ${target} tavoli diversi`,
            manufacturerTables: (target, manufacturer) => `Giocare ${target} tavoli ${manufacturer} diversi`,
            decadeTables: (target, decade) => `Giocare ${target} tavoli diversi degli anni ${decade}`,
            differentManufacturers: (target) => `Giocare tavoli di ${target} produttori diversi`,
            differentDecades: (target) => `Giocare tavoli di ${target} decenni diversi`,
            neverPlayedTables: (target) => `Giocare ${target} tavoli mai giocati`,
            dustyTables: (target) => `Giocare ${target} tavoli non giocati da sei mesi`,
            tableOfTheDayDays: (target) => `Giocare il tavolo del giorno in ${target} giorni diversi`,
            tableOfTheWeekGames: (target) => `Giocare ${target} partite sul tavolo della settimana`,
            activeDays: (target) => `Giocare in ${target} giorni diversi`,
            endurance: (target) => `Giocare ${target} minuti su uno stesso tavolo`,
            marathon: (target) => `Giocare ${target} minuti in totale`,
            randomGames: (target) => `Giocare ${target} partite a caso`,
            sameTableGames: (target) => `Giocare ${target} partite su uno stesso tavolo`,
        },
        progress: (value, target, daysText) => `${value}/${target} · ${daysText}`,
        daysLeft: (days) => `ancora ${days} giorni`,
        lastDay: "ultimo giorno",
        completed: "Sfida completata!",
        verdictHeader: "Sfida precedente",
        missed: (reached, target) => `Mancata · ${reached}/${target}`,
        toastHeader: "Sfida completata",
        toastDescription: (count) => (count === 1 ? "Prima sfida completata" : `${count} sfide completate`),
    },

    // The Mastery Bar, under the Challenge Card (see common/mastery/mastery_bar.js), and the
    // Collection Mastery's texts.
    tableMastery: {
        // Collection Mastery: the goal toward the next Collection Tier
        // (that many tables at the level of that name), how many tables
        // already reach it, or, at the last tier, that all of them did.
        collection: {
            goal: (count, levelName) => `Traguardo: ${count} ${count === 1 ? "tavolo" : "tavoli"} a ${levelName}`,
            current: (reached, needed) => `Attuale: ${reached}/${needed}`,
            allTables: (levelName) => `Tutti i tuoi tavoli: ${levelName}`,
        },
        levelNames: ["Novizio", "Apprendista", "Assiduo", "Abile", "Specialista", "Asso", "Virtuoso", "Prodigio", "Leggenda", "Mago del flipper"],
        toDiscover: "Da scoprire",
        toastHeader: "Maestria del tavolo",
        toastTitle: (name, level) => `${name} (${level})`,
        collectionToastHeader: "Maestria della collezione",
        collectionToastTitle: (tier, name) => `Grado ${tier}: ${name}`,
        collectionToastDescription: (count, name) => `${count} ${count === 1 ? "tavolo" : "tavoli"} a ${name} o più`,
    },
    profileRewards: {
        // The Avatar Frames' names, from Collection Tier 1 to 10.
        frameNames: [
            "Foresta incantata", "Vapore e ingranaggi", "Neon arcade", "Gelo eterno", "Spezia di Arrakis",
            "Grimorio arcano", "Stazione orbitale", "Soffio del drago", "Flipper reale", "Leggenda celeste",
        ],
        // The Mastery Toast's extra line, naming the frames its Collection
        // Tier unlocks (more than one when a Play raised it by several tiers).
        toastLine: (names) => `${names.length === 1 ? "Nuova cornice" : "Nuove cornici"}: ${names.join(", ")}`,
        toastHeader: "Cornice festiva",
        holidays: {
            newYear: { name: "Capodanno", condition: "Una partita il 1° gennaio" },
            chineseNewYear: { name: "Capodanno cinese", condition: "Una partita a Capodanno cinese, tra il 21 gennaio e il 20 febbraio" },
            valentine: { name: "San Valentino", condition: "Una partita il 14 febbraio" },
            mardiGras: { name: "Martedì grasso", condition: "Una partita il martedì grasso, 47 giorni prima di Pasqua" },
            stPatrick: { name: "San Patrizio", condition: "Una partita il 17 marzo" },
            easter: { name: "Pasqua", condition: "Una partita la domenica di Pasqua" },
            musicDay: { name: "Festa della Musica", condition: "Una partita il 21 giugno" },
            halloween: { name: "Halloween", condition: "Una partita il 31 ottobre" },
            deadDay: { name: "Día de los Muertos", condition: "Una partita il 1° o il 2 novembre" },
            thanksgiving: { name: "Ringraziamento", condition: "Una partita il giorno del Ringraziamento, il quarto giovedì di novembre" },
            christmas: { name: "Natale", condition: "Una partita il 24 o il 25 dicembre" },
        },
        // The Reward Prompt, after a Profile's first frame: the frame's name,
        // then the main menu entry and the Profile Stats button to equip it from.
        prompt: {
            title: "Nuova cornice avatar",
            message: (name, menuEntry, button) => `Hai vinto la cornice avatar "${name}"! Indossala da "${menuEntry}", poi "${button}".`,
            goEquip: "Indossala",
            gotIt: "Capito",
        },
    },
    playerLevel: {
        toastHeader: "Nuovo livello",
        toastTitle: (level) => `Livello ${level}`,
        toastDescription: "I tuoi obiettivi ti hanno portato a un nuovo livello.",
    },
    highScores: {
        toastHeader: "Punteggio migliore",
        toastTitle: (table, place) => `Punteggio migliore su ${table}: ${place}° posto`,
        tableRecordTitle: (table) => `Record del tavolo su ${table}!`,
        toastScore: (score) => `${score} punti`,
        takenFrom: (profile) => `strappato a ${profile}`,
        // The High Score Board.
        board: {
            menuEntry: "Punteggi migliori",
            record: "Record",
            // In place of a place's owner when it belongs to no Profile.
            defaultScore: "Predefinito",
            // In place of the initials when none were typed.
            noInitials: "\u2014",
            noScore: "Nessun punteggio",
            // While PINemHi reads the board, as a message or a note over the last known one.
            reading: "Lettura\u2026",
            // Over the last known board when the fresh read failed.
            notRefreshed: "Impossibile aggiornare questi punteggi",
            notSupported: "I punteggi di questo tavolo non sono supportati",
            // A table without a ROM whose VPReg.stg section or text file is not learned yet.
            notLearned: "Gioca una partita per vedere i punteggi di questo tavolo",
        },
    },

    // The language names stay each in its own language.
    expansionPackSettings: {
        menuEntry: "Impostazioni del pack",
        on: "Sì",
        off: "No",
        addOnLine: (name, state) => `${name}: ${state}`,
        languageLine: (languageName) => `Lingua: ${languageName}`,
        startupScreenLine: (screenName) => `Schermata iniziale: ${screenName}`,
        startupScreenNames: { welcome: "Benvenuto", profilePicker: "Scelta del profilo", wheel: "Ruota" },
        offlineMode: "Modalità offline",
        updateCheckLine: (state) => `Controllo aggiornamenti del pack: ${state}`,
        offerVpxtoolLine: (state) => `Proponi vpxtool: ${state}`,
        updateTo: (version) => `Aggiorna alla v${version}`,
        installVpxtool: (version) => `Installa vpxtool v${version}`,
        updateVpxtool: (installed, version) => `Aggiorna vpxtool (v${installed} → v${version})`,
        vpxtoolUpToDateLine: "Aggiorna vpxtool",
        vpxtoolUpToDate: (installed) => `vpxtool v${installed} è aggiornato`,
        back: "Indietro",
        groups: {
            playersAndProgress: "Giocatori e progressi",
            wheelScreen: "La ruota",
            menusAndFilters: "Menu e filtri",
            launchingAndPlaying: "Avviare e giocare un tavolo",
            debugging: "Debug",
        },
        onRestart: (state) => `${state} (al riavvio)`,
        whenOnLabel: "Sì:",
        whenOffLabel: "No:",
        save: "Salva",
        cancel: "Annulla",
        discordConsentMessage: "Il tuo account Discord aperto su questo PC mostrerà pubblicamente il tavolo giocato, da quanto tempo e quando la ruota è aperta. Il PinballY Expansion Pack non invia alcun nome di profilo né altri dati personali di questo PC.",
        discordConsentTurnOn: "Attiva",
        notSaved: "Impostazione non salvata",
        ok: "OK",
        restartQuestion: "Le impostazioni salvate si applicano al riavvio di PinballY.",
        restartNow: "Riavvia ora",
        later: "Più tardi",
        restartFailedTitle: "Riavvio impossibile",
        restartFailed: "Le impostazioni si applicheranno al prossimo avvio.",
        addOns: {
            profilePicker: {
                name: "Scelta del profilo",
                whenOn: "Cambia giocatore nel menu principale, per scegliere chi gioca.",
                whenOff: "Tutti giocano come Ospite; niente avatar né saluto nella schermata di benvenuto.",
            },
            startupChoicePrompt: {
                name: "Benvenuto",
                whenOn: "All'avvio e dopo Cambia giocatore: scegli un tavolo da giocare, o cambia giocatore.",
                whenOff: "La scelta del profilo saluta solo il giocatore.",
            },
            achievements: {
                name: "Obiettivi",
                whenOn: "Obiettivi ottenuti giocando, ognuno annunciato da un avviso.",
                whenOff: "Niente livello giocatore.",
            },
            sessionStatsTracker: {
                name: "Sessioni",
                whenOn: "Conta ogni sessione, per gli obiettivi di sessione.",
                whenOff: "Niente obiettivi di sessione.",
            },
            challenges: {
                name: "Sfide",
                whenOn: "Una sfida ogni settimana, sotto il badge del profilo.",
                whenOff: "Niente obiettivi né statistiche delle sfide.",
            },
            tableMastery: {
                name: "Maestria del tavolo",
                whenOn: "Un livello di maestria su ogni tavolo, per ogni giocatore.",
                whenOff: "Niente gradi della collezione né le loro cornici avatar.",
            },
            highScores: {
                name: "Punteggi migliori",
                whenOn: "Ogni nuovo punteggio migliore attribuito al giocatore che l'ha fatto.",
                whenOff: "Niente obiettivi dei punteggi migliori né record del tavolo; tornano i punteggi migliori di PinballY.",
            },
            statusLineInfo: {
                name: "Riga di stato",
                whenOn: "Anno, produttore, partite e tempo di gioco del tavolo nella riga di stato.",
                whenOff: "Nient'altro cambia.",
            },
            clock: {
                name: "Orologio",
                whenOn: "L'ora in alto a sinistra dello schermo.",
                whenOff: "Nient'altro cambia.",
            },
            statusIcons: {
                name: "Icone di stato",
                whenOn: "Accanto all'orologio, il simbolo di Discord quando il cabinato è pubblico su Discord, una freccia dorata quando un aggiornamento del pack è in attesa, una freccia barrata quando il controllo aggiornamenti è disattivato.",
                whenOff: "Nient'altro cambia.",
            },
            wheelArc: {
                name: "Arco dorato",
                whenOn: "Un arco dorato sotto la ruota, a meno che tu non usi un tuo sfondo.",
                whenOff: "Nient'altro cambia.",
            },
            uiTranslation: {
                name: "Traduzione di PinballY",
                whenOn: "I menu e i messaggi di PinballY nella lingua del pack.",
                whenOff: "Nient'altro cambia.",
            },
            drawnMenus: {
                name: "Menu disegnati",
                whenOn: "I menu di PinballY disegnati nello stile del pack.",
                whenOff: "Tornano i menu semplici di PinballY, tranne che per queste impostazioni.",
            },
            customMenuCommands: {
                name: "Comandi di menu",
                whenOn: "Configurazione del tavolo nel menu principale.",
                whenOff: "Nient'altro cambia.",
            },
            randomGame: {
                name: "Tavolo a caso",
                whenOn: "Avvia un tavolo a caso dal menu principale, sotto Gioca.",
                whenOff: "Il tavolo a caso resta nel Benvenuto; con anche questo disattivato, niente obiettivi delle partite a caso.",
            },
            hallOfFame: {
                name: "Hall of Fame",
                whenOn: "Un filtro dei tuoi dieci tavoli più giocati.",
                whenOff: "Niente pulsante Tavoli più giocati in «Il mio profilo».",
            },
            tablesToDiscover: {
                name: "Tavoli da scoprire",
                whenOn: "Un filtro dei tavoli che non hai mai giocato.",
                whenOff: "Niente pulsante Tavoli da scoprire in «Il mio profilo».",
            },
            hiddenTables: {
                name: "Tavoli nascosti",
                whenOn: "Un filtro dei tavoli nascosti.",
                whenOff: "Nient'altro cambia.",
            },
            customFilter: {
                name: "Tavoli originali",
                whenOn: "Un filtro Tavoli originali, in Filtra per produttore.",
                whenOff: "Nient'altro cambia.",
            },
            menuCleanup: {
                name: "Menu ripuliti",
                whenOn: "Menu più corti, senza voci poco usate come Aiuto, Informazioni o Volantino.",
                whenOff: "Nient'altro cambia.",
            },
            forceBackglass: {
                name: "Backglass",
                whenOn: "Il backglass mostrato all'avvio, nascosto durante la partita.",
                whenOff: "Nient'altro cambia.",
            },
            backglassClock: {
                name: "Orologio del backglass",
                whenOn: "L'ora in un piccolo riquadro sullo schermo del backglass durante la partita.",
                whenOff: "Nient'altro cambia.",
            },
            discordRichPresence: {
                name: "Discord Rich Presence",
                whenOn: "Il tuo account Discord mostra pubblicamente il tavolo giocato e da quanto tempo; avvia Discord prima di PinballY.",
                whenOff: "Nient'altro cambia.",
            },
            seamlessLaunchOverlay: {
                name: "Overlay di avvio",
                whenOn: "Niente lampo nero mentre un tavolo si carica.",
                whenOff: "Nient'altro cambia.",
            },
            playLaunchSound: {
                name: "Suono di avvio",
                whenOn: "Un suono quando si avvia un tavolo.",
                whenOff: "Nient'altro cambia.",
            },
            ratingPrompt: {
                name: "Valutazione",
                whenOn: "Ti chiede di valutare un tavolo dopo averci giocato un po'.",
                whenOff: "Nient'altro cambia.",
            },
            tableRoms: {
                name: "ROM dei tavoli",
                whenOn: "Trova da sé la ROM di ogni tavolo (richiede vpxtool).",
                whenOff: "Nient'altro cambia.",
            },
            launchEventsTrace: {
                name: "Traccia di avvio",
                whenOn: "Registra gli eventi di avvio, per la risoluzione dei problemi (con LOG_LAUNCH_EVENTS=true).",
                whenOff: "Nient'altro cambia.",
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
        // Names the newer Pack Version the Update Check found.
        promptTitle: "Aggiornamento disponibile",
        prompt: (version) => `eXpansion Pack v${version} è disponibile.`,
        updateNow: "Aggiorna ora",
        later: "Più tardi",
        updateFailedTitle: "Aggiornamento impossibile",
        updateFailed: "L'eXpansion Pack resta com'è.",
        // Under the Loader while the Pack Update helper gets ready.
        downloadingUpdate: "Download dell'aggiornamento…",
        ok: "OK",
        updatedTitle: "Aggiornamento completato",
        updated: (version) => `eXpansion Pack aggiornato alla v${version}`,
        toastTitle: "eXpansion Pack",
    },
    scriptReader: {
        dialogTitle: (version) => `vpxtool v${version}`,
        dialog: "vpxtool legge lo script di ogni tavolo perché la sua ROM venga compilata da sola. Scritto da Francis De Brabandere, con licenza Apache-2.0, scaricato da github.com/francisdb/vpxtool.",
        install: "Installa",
        noThanks: "No, grazie",
        later: "Puoi anche installarlo più tardi dalle Impostazioni del pack, o a mano.",
        downloading: "Download in corso…",
        ok: "OK",
        installedTitle: "vpxtool installato",
        installed: (version) => `vpxtool v${version} è installato: la ROM di ogni tavolo ora viene compilata da sola.`,
        failedTitle: "Installazione impossibile",
        failed: "Non è stato possibile installare vpxtool; non è cambiato nulla. Puoi riprovare dalle Impostazioni del pack.",
        updateTitle: (installed, version) => `vpxtool v${installed} → v${version}`,
        update: "Aggiorna",
        updateLater: "Puoi anche aggiornarlo più tardi dalle Impostazioni del pack, o a mano.",
        updatedTitle: "vpxtool aggiornato",
        updated: (version) => `vpxtool è aggiornato alla v${version}.`,
        updateFailedTitle: "Aggiornamento impossibile",
        updateFailed: "Non è stato possibile aggiornare vpxtool; non è cambiato nulla. Puoi riprovare dalle Impostazioni del pack.",
    },
    errorToast: {
        header: "Problema",
        playNotSaved: "Impossibile salvare questa partita: non conterà nelle tue statistiche.",
        playNotInPlayLog: "Questa partita è stata contata, ma manca dalla tua cronologia delle partite.",
        packUpdateFailed: (version, logPath) => `L'aggiornamento alla v${version} non è riuscito: la versione precedente resta al suo posto. Dettagli in ${logPath}`,
    },
    releaseHighlights: {
        "1.1.0": [
            "Avvia un tavolo a caso direttamente dal menu principale.",
            "Durante una partita, lo schermo del backglass mostra ora l'orario.",
        ],
        "1.0.0": [
            "Versione 1.0: la prima versione pubblica dell'eXpansion Pack.",
            "Menu e messaggi sono più leggibili e stanno nello schermo fin dal primo secondo.",
            "Dopo ogni aggiornamento, questo messaggio ora mostra le novità.",
        ],
    },
};

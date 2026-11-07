// ============================================================
// German translations for PinballY's UI.
// Save this file as UTF-8 with BOM so accented characters display correctly.
// ============================================================

// The active Profile's play time of a table, as PinballY writes its own.
const formatPlayTime = (hours, minutes) => (hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")} Stunden`
    : `${minutes} Minute${minutes === 1 ? "" : "n"}`);

// Hours of play with one decimal, as an Achievement Progress shows them.
const formatHours = hours => hours.toFixed(1).replace(".", ",");

export default {
    // Direct translations of PinballY's native menu titles.
    nativeMenuLabels: {
        "About PinballY": "Über PinballY",
        "Add Media": "Medien hinzufügen",
        "Add to Favorites": "Zu den Favoriten hinzufügen",
        "Adjust Audio Volume": "Lautstärke einstellen",
        "All Games": "Alle Tische",
        "All Tables": "Alle Tische",
        "Batch Capture": "Stapelaufnahme",
        "Batch Capture lets you capture screen shot images and videos for multiple games.  Step 1: select which games to include in the capture process:": "Mit der Stapelaufnahme können Sie Screenshots und Videos für mehrere Tische aufnehmen. Schritt 1: Wählen Sie die Tische aus, die in den Aufnahmevorgang einbezogen werden sollen:",
        "Begin Capture": "Aufnahme starten",
        "Cancel": "Abbrechen",
        "Capture images & videos": "Bilder und Videos aufnehmen",
        "Confirm Power Off": "Ausschalten bestätigen",
        "Delete game details": "Tischdetails löschen",
        "Edit category names...": "Kategorienamen bearbeiten...",
        "Edit game details...": "Tischdetails bearbeiten...",
        "Enable Videos": "Videos aktivieren",
        "Exit": "Beenden",
        "Exit PinballY": "PinballY beenden",
        "Favorites": "Favoriten",
        "Filter by Category": "Nach Kategorie filtern",
        "Filter by Date Added": "Nach Hinzufügedatum filtern",
        "Filter by Era": "Nach Epoche filtern",
        "Filter by Last Played": "Nach zuletzt gespielt filtern",
        "Filter by Manufacturer": "Nach Hersteller filtern",
        "Filter by Rating": "Nach Bewertung filtern",
        "Filter by System": "Nach System filtern",
        "Find game media online": "Spielemedien online suchen",
        "Games marked for batch capture": "Für die Stapelaufnahme markierte Tische",
        "Game Setup": "Tischkonfiguration",
        "Help": "Hilfe",
        "Hide this game": "Diesen Tisch ausblenden",
        "High Scores": "Highscores",
        "In Favorites": "In den Favoriten",
        "Information": "Informationen",
        "Instruction Card": "Anleitungskarte",
        "Mark for Batch Capture": "Für die Stapelaufnahme markieren",
        "Marked for Batch Capture": "Für die Stapelaufnahme markiert",
        "Mute Attract Mode": "Ton im Attraktionsmodus ausschalten",
        "Mute Buttons": "Tastentöne ausschalten",
        "Mute Table Audio": "Tischton ausschalten",
        "Mute Videos": "Videoton ausschalten",
        "Operator Menu": "Betreibermenü",
        "Options": "Optionen",
        "PinballY Options...": "Optionen...",
        "Play": "Spielen",
        "Play Game": "Spiel starten",
        "Power Off": "Computer ausschalten",
        "Proceed": "Fortfahren",
        "Rate Table": "Tisch bewerten",
        "Reset Coins/Credits": "Münzen/Guthaben zurücksetzen",
        "Resume Game": "Spiel fortsetzen",
        "Return": "Zurück",
        "Save": "Speichern",
        "Search": "Suchen",
        "Select categories": "Kategorien auswählen",
        "Show Hidden Games": "Ausgeblendete Tische anzeigen",
        "Show Media Files": "Mediendateien anzeigen",
        "Show Unconfigured Games": "Nicht konfigurierte Tische anzeigen",
        "Skip this message next time": "Diese Meldung beim nächsten Mal nicht mehr anzeigen",
        "Terminate Game": "Spiel beenden",
        "The capture process records the exact same areas of the screen where your PinballY windows are located.  Before proceeding, make sure that your PinballY window layout matches the screen layout of the game you're about to record.  For example, if the game's playfield is full-screen, make sure PinballY's playfield window is full-screen.": "Der Aufnahmevorgang zeichnet genau die Bereiche des Bildschirms auf, in denen sich Ihre PinballY-Fenster befinden. Bevor Sie fortfahren, stellen Sie sicher, dass die Anordnung Ihrer PinballY-Fenster der Bildschirmaufteilung des Spiels entspricht, das Sie aufnehmen möchten. Wenn beispielsweise das Spielfeld des Spiels den gesamten Bildschirm ausfüllt, stellen Sie sicher, dass auch das Spielfeldfenster von PinballY den gesamten Bildschirm ausfüllt.",
        "This will launch a Web browser window to search for media files for this game.  Look for a \"HyperPin Media Pack\" file.  Download the file and drag it onto this window to install it.\n\nNote that you can drop a Media Pack file onto this window at any time to install media for the currently selected game.  This menu step isn't required to install media; it's just a convenience for launching a Web search.": "Dies öffnet ein Webbrowser-Fenster, um Mediendateien für diesen Tisch zu suchen. Suchen Sie nach einer Datei mit dem Namen \"HyperPin Media Pack\". Laden Sie die Datei herunter und ziehen Sie sie auf dieses Fenster, um sie zu installieren.\n\nBeachten Sie, dass Sie jederzeit eine Media-Pack-Datei auf dieses Fenster ziehen können, um Medien für den aktuell ausgewählten Tisch zu installieren. Dieser Menüpunkt ist nicht erforderlich, um Medien zu installieren; er dient lediglich als praktische Möglichkeit, eine Websuche zu starten.",
        "Uncategorized": "Nicht kategorisiert",
        "Yes, add to current game": "Ja, zum aktuellen Tisch hinzufügen",
        "You must enter the game's bibliographic information (title, system, etc.) before adding media files for the game.  The game information is used to determine the folder locations and file names for the game's media files, so it has to be entered before media files can be added to the game.": "Sie müssen die bibliografischen Informationen des Tisches (Titel, System usw.) eingeben, bevor Sie Mediendateien für den Tisch hinzufügen können. Diese Informationen werden verwendet, um die Ordnerpfade und Dateinamen für die Mediendateien des Tisches zu bestimmen, daher müssen sie eingegeben werden, bevor Mediendateien hinzugefügt werden können.",
        "Flyer": "Flyer",
        "Pinscape Night Mode": "Pinscape-Nachtmodus",
        "Hidden Tables": "Ausgeblendete Tische",
        "Unconfigured Tables": "Nicht konfigurierte Tische",
        "Tables played within:": "Gespielt innerhalb von:",
        "Tables not played within:": "Nicht gespielt seit:",
        "Tables added within:": "Hinzugefügt innerhalb von:",
        "Tables added more than:": "Hinzugefügt vor mehr als:",
        "A week": "Einer Woche",
        "A month": "Einem Monat",
        "A year": "Einem Jahr",
        "A week ago": "Einer Woche",
        "A month ago": "Einem Monat",
        "A year ago": "Einem Jahr",
        "Never played": "Nie gespielt",
        "Batch Capture Step 2: Select the media types you'd like to capture for the selected games.  (You'll be able to say what to do about existing files in the next step.)": "Stapelaufnahme, Schritt 2: Wählen Sie die Medientypen, die für die ausgewählten Tische aufgenommen werden sollen. (Was mit vorhandenen Dateien geschieht, legen Sie im nächsten Schritt fest.)",
        "Batch Capture Step 3: For each type, indicate if you'd like to capture the item for EVERY game, even for games that already have existing media of the same type, or if you'd only like to capture missing items.": "Stapelaufnahme, Schritt 3: Geben Sie für jeden Typ an, ob er für JEDEN Tisch aufgenommen werden soll, auch für Tische mit vorhandenen Medien dieses Typs, oder nur dort, wo er fehlt.",
        "Next Step": "Nächster Schritt",
        "Missing only": "Nur fehlende",
        "Capture all": "Alle aufnehmen",
        "View Capture List": "Aufnahmeliste anzeigen",
        "Please select the system to use to launch this table:": "Wählen Sie das System, mit dem dieser Tisch gestartet werden soll:",
        "Yes, run as Admin": "Ja, als Administrator ausführen",
        "No, cancel": "Nein, abbrechen",
        "Allow (this session only)": "Erlauben (nur diese Sitzung)",
        "Allow (always)": "Erlauben (immer)",
        "Yes, delete it": "Ja, löschen",
    },

    // Labels for the media-capture screen's "Item: Action" lines
    // (e.g. "Playfield Image: Skip"), combined via dynamicLabelBuilders.captureItemAction.
    mediaCaptureItemLabels: {
        "Backglass Image": "Backglass-Bild",
        "Backglass Video": "Backglass-Video",
        "Flyer Image": "Flyer-Bild",
        "Instruction Card": "Anleitungskarte",
        "Playfield Image": "Spielfeldbild",
        "Playfield Video": "Spielfeldvideo",
        "Table Audio": "Tischaudio",
        "Wheel Image": "Wheel-Bild",
        "DMD Image": "DMD-Bild",
        "DMD Video": "DMD-Video",
        "Topper Image": "Topper-Bild",
        "Topper Video": "Topper-Video",
        "Launch Audio": "Startaudio",
        "Real DMD Image": "Bild des echten DMD",
        "Real DMD Video": "Video des echten DMD",
        "Real RGB DMD Image": "Bild des echten RGB-DMD",
        "Real RGB DMD Video": "Video des echten RGB-DMD",
    },
    mediaCaptureActionLabels: {
        "Add": "Hinzufügen",
        "Capture": "Aufnehmen",
        "Capture Silent": "Ohne Ton aufnehmen",
        "Capture w/Audio": "Mit Audio aufnehmen",
        "Keep Existing": "Vorhandenes behalten",
        "Replace Existing": "Vorhandenes ersetzen",
        "Skip": "Überspringen",
    },

    // Status text shown in PinballY's launch overlay, keyed by the
    // language-independent event id (see the "launchoverlaymessage" event).
    launchOverlayMessages: {
        "after": "",
        "capturing": "Aufnahme läuft...",
        "gameover": "Game Over",
        "init": "",
        "launching": "Wird geladen...",
        "running": "Tisch wird gestartet...",
        "terminating": "Zurück zur Spieleliste...",
    },

    // The step under way, written in gold beneath the Loader while a
    // table launches or closes (Seamless Launch Overlay).
    launchSteps: {
        loading: "Wird geladen…",
        closing: "Zurück zu den Tischen…",
        capturing: "Aufnahme…",
    },

    // Functions that build translated titles for PinballY's dynamically
    // generated menu text (category names, star ratings, etc.).
    dynamicLabelBuilders: {
        captureInstructions: (seconds) => {
            const plural = seconds === "1" ? "" : "en";
            return `Wählen Sie die aufzunehmenden Elemente aus und klicken Sie dann auf Aufnahme starten. Dadurch wird Ihr Spiel gestartet, die Bildschirmaufnahmen werden erstellt und das Spiel wird nach Abschluss automatisch beendet. Der Vorgang dauert etwa ${seconds} Sekunde${plural}. (!) bedeutet, dass ein vorhandenes Element ersetzt wird.`;
        },
        captureInstructionsOneMinute: () =>
            "Wählen Sie die aufzunehmenden Elemente aus und klicken Sie dann auf Aufnahme starten. Dadurch wird Ihr Spiel gestartet, die Bildschirmaufnahmen werden erstellt und das Spiel wird nach Abschluss automatisch beendet. Der Vorgang dauert etwa 1 Minute. (!) bedeutet, dass ein vorhandenes Element ersetzt wird.",
        captureItemAction: (item, action) => `${item}: ${action}`,
        decadeTables: (decade) => `Tische der ${decade}er-Jahre`,
        genericTables: (name) => `Tische ${name}`,
        mediaGameMismatchWarning: (draggedGame, currentGame) =>
            `Es sieht so aus, als wären einige der Mediendateien, die Sie hinzufügen, für einen anderen Tisch bestimmt: "${draggedGame}". Mediendateien werden immer dem auf dem Wheel ausgewählten Tisch hinzugefügt, aktuell "${currentGame}". Möchten Sie diese Medienelemente trotzdem dem aktuellen Tisch hinzufügen?`,
        mediaGameMismatchWarningMultiple: (gameList, currentGame) =>
            `Es sieht so aus, als wären einige der Mediendateien, die Sie hinzufügen, für andere Tische bestimmt: ${gameList}. Mediendateien werden immer dem auf dem Wheel ausgewählten Tisch hinzugefügt, aktuell "${currentGame}". Möchten Sie diese Medienelemente trotzdem dem aktuellen Tisch hinzufügen?`,
        mediaReadyToAdd: (gameName) =>
            `Die folgenden Medienelemente sind bereit, für ${gameName} hinzugefügt zu werden. Wählen Sie die Elemente aus, die Sie hinzufügen oder ersetzen möchten.`,
        starTables: (count) => `Tische mit ${count} Stern${count > 1 ? "en" : ""}`,
        startDelay: (seconds) => `Startverzögerung einstellen (${seconds} Sek.)`,
        unratedTables: () => "Nicht bewertete Tische",
        batchCaptureReady: (count, duration) => `Die Stapelaufnahme ist bereit! ${count} Tisch(e) werden einbezogen; das dauert etwa ${duration}.`,
        confirmDeleteGameDetails: (title) => `Die Tischdetails von ${title} wirklich löschen? (Nur die bibliografischen Angaben werden gelöscht, keine Tischdateien oder Medien.)`,
        showCustomView: (name) => `${name} anzeigen`,
        durationSeconds: (count) => `${count} Sekunde${count === 1 ? "" : "n"}`,
        durationMinutes: (count) => `${count} Minute${count === 1 ? "" : "n"}`,
        durationHours: (hours, minutes) => (minutes > 0 ? `${hours} Std. ${minutes} Min.` : `${hours} Stunde${hours === 1 ? "" : "n"}`),
    },

    ratingPrompt: {
        title: "Diesen Tisch bewerten",
        message: (tableTitle, minutes) =>
            `Sie haben "${tableTitle}" seit über ${minutes} Minuten gespielt! Möchten Sie ihn jetzt bewerten?`,
        rateNow: "Jetzt bewerten",
        notNow: "Später",
    },

    // The Button Hints at the foot of every drawn screen and the Exit
    // Button's tooltip (see GLOSSARY.md). The key caps and the footer's
    // words are shown in capitals.
    buttonHints: {
        // PinballY's button names, as on the cabinet's key caps.
        keyCaps: { next: "Rechts", prev: "Links", select: "Select", exit: "Exit" },
        browse: "Blättern",
        // The flippers on a High Score Board longer than the window.
        scroll: "Scrollen",
        choose: "Wählen",
        // Exit's word and the Exit Button's tooltip: Back where Exit brings
        // back a screen or a menu, Close where it leaves the bare wheel.
        back: "Zurück",
        close: "Schließen",
    },

    welcomeScreen: {
        greetings: { morning: "Guten Morgen", afternoon: "Guten Tag", evening: "Guten Abend", night: "Noch wach" },
        greetingWithName: (greeting, name) => [`${greeting}, `, name, "!"],
        greetingAlone: (greeting) => `${greeting}!`,
        stayOn: (tableTitle) => `Bei ${tableTitle} bleiben`,
        stayOnWheel: "Auf dem Wheel bleiben",
        randomTable: "Zufälligen Tisch starten",
        menuEntry: "Willkommensseite",
        // The active Profile's Daily Streak under the greeting, from 2 days
        // on, its count shown in a square before the text.
        cabinetStreak: {
            notYetToday: "Tage in Folge am Automaten: weiter so!",
            playedToday: "Tage in Folge am Automaten",
        },
        lostRecord: (taker, tableTitle) => `${taker} hat Ihnen den Rekord auf ${tableTitle} abgenommen`,
        lostRecords: (records, moreCount) => {
            const named = records.map(record => `${record.tableTitle} (${record.taker})`);
            return moreCount > 0
                ? `Verlorene Rekorde: ${named.join(", ")} und ${moreCount} weitere`
                : `Verlorene Rekorde: ${named.slice(0, -1).join(", ")} und ${named[named.length - 1]}`;
        },
        // One card per Period Table; its grey line says it was played this
        // Period, or else the Streak of the daily or weekly rendezvous, its
        // count shown in a square before the text.
        periodCards: {
            day: {
                period: "TISCH DES TAGES",
                played: "Heute gespielt",
                streak: "Tage in Folge am Tisch des Tages: weiter so!",
            },
            week: {
                period: "TISCH DER WOCHE",
                played: "Diese Woche gespielt",
                streak: "Wochen in Folge am Tisch der Woche: weiter so!",
            },
            challenge: {
                period: "EIN TISCH DER HERAUSFORDERUNG",
                progress: (title, value, target) => `${title} · ${value}/${target}`,
                lastStep: "Noch eine Partie, um die Herausforderung zu schaffen!",
            },
            go: "Los",
        },
    },

    // Lower status line text for the currently selected table.
    // [Filter.Count], [Game.Year], etc. are PinballY placeholders — keep them as-is.
    tableInfoStatusLines: {
        manufacturer: (position) => `Tisch ${position}/[Filter.Count] - hergestellt von [Game.Manuf].`,
        manufacturerFictional: (position) => `Tisch ${position}/[Filter.Count] - Fiktiver Flipper.`,
        playCount: (position, count) => `Tisch ${position}/[Filter.Count] - ${count}-mal gestartet.`,
        playTime: (position, hours, minutes) => `Tisch ${position}/[Filter.Count] - ${formatPlayTime(hours, minutes)} lang gespielt.`,
        year: (position) => `Tisch ${position}/[Filter.Count] - veröffentlicht im Jahr [Game.Year].`,
        // A Household Rating has two Ratings or more.
        householdRating: (position, rating, count) =>
            `Tisch ${position}/[Filter.Count] - Familienbewertung: ${String(rating).replace(".", ",")} von 5 (${count} Bewertungen).`,
        yourRating: (position, rating) => `Tisch ${position}/[Filter.Count] - Ihre Bewertung: ${String(rating).replace(".", ",")} von 5.`,
        noRating: (position) => `Tisch ${position}/[Filter.Count] - keine Bewertung für diesen Tisch.`,
    },

    // Upper status line messages, after the player's own from PinballY's options.
    // [Filter.Count] is a PinballY placeholder — keep it as-is.
    upperStatusLines: {
        welcome: name => `Willkommen, ${name}!`,
        tablesAvailable: "[Filter.Count] Tische sind verfügbar!",
        launchHint: "Start-Taste, um einen Tisch zu starten.",
        browseHint: "Linker/rechter Flipper, um die Tische durchzublättern.",
        signOff: "Viel Spaß!",
    },

    // Labels for menu items this project adds itself (see custom_menu_commands.js, random_game.js, custom_filter.js, hall_of_fame.js and tables_to_discover.js).
    customMenuLabels: {
        challengeTables: "Tische für die Herausforderung",
        hallOfFameFilter: "Hall of Fame",
        myHighScoresFilter: "Meine Highscores",
        hiddenTablesFilter: "Ausgeblendete Tische",
        tablesToDiscoverFilter: "Unentdeckte Tische",
        originalTablesFilter: "Original-Tische",
        tableSetup: "Tischkonfiguration",
        // The Random Game's main menu entry, worded as welcomeScreen.randomTable.
        randomTable: "Zufälligen Tisch starten",
        tableScores: "Tisch-Highscores",
        currentRating: (rating) => `(aktuell: ${String(rating).replace(".", ",")} / 5)`,
        filterPickerBack: "Zurück",
        activeFilter: (name) => `Aktiver Filter: ${name}`,
        // The Drawn main menu's "Change Filter" entry, and its footer's label before the Active Filter.
        changeFilter: "Filter wechseln",
        activeFilterLabel: "Aktiver Filter:",
    },

    achievements: {
        dailyFirstPlayTitle: () => "Hallo, Tisch des Tages!",
        dailyFirstPlayDescription: () => "Den Tisch des Tages zum ersten Mal starten.",
        weeklyFirstPlayTitle: () => "Wöchentliches Rendezvous",
        weeklyFirstPlayDescription: () => "Den Tisch der Woche zum ersten Mal starten.",
        dailyPeriodsPlayedTitles: {
            10: "Sonntagsentdecker",
            25: "Neugieriger Entdecker",
            50: "Erfahrener Entdecker",
            100: "Indiana Flippers",
        },
        dailyPeriodsPlayedDescription: (days) => `Den Tisch des Tages an ${days} verschiedenen Tagen starten.`,
        weeklyPeriodsPlayedTitles: {
            4: "Ein Monat voller Dates",
            10: "Stammgast der Woche",
            26: "Sechs Monate Treue",
            52: "Ein Jahr und keine Falte",
        },
        weeklyPeriodsPlayedDescription: (weeks) => `Den Tisch der Woche in ${weeks} verschiedenen Wochen starten.`,
        dailyStreakTitles: {
            3: "Aller guten Dinge sind drei",
            7: "Perfekte Woche",
            14: "Zwei eiserne Wochen",
            30: "Flipper-Mönch",
        },
        dailyStreakDescription: (days) => `Den Tisch des Tages ${days} Tage in Folge starten.`,
        weeklyStreakTitles: {
            4: "Ein Monat ohne Fehler",
            12: "Treuer Abonnent",
        },
        weeklyStreakDescription: (weeks) => `Den Tisch der Woche ${weeks} Wochen in Folge starten.`,
        manufacturerCompletionTitle: (manufacturer) => `Absoluter ${manufacturer}-Fan`,
        manufacturerCompletionDescription: (manufacturer, count) => `Alle ${count} Tische von ${manufacturer} mindestens einmal spielen.`,
        firstTableTitle: () => "Erste Schritte",
        firstTableDescription: () => "Den allerersten Tisch spielen.",
        collectionPercentTitles: {
            10: "Der Geschmack von Metall",
            25: "Angehender Sammler",
            50: "Halbzeit",
            75: "Fast alles gesehen",
            100: "Mir entgeht nichts",
        },
        collectionPercentDescription: (percent, playedCount, totalCount) => `${playedCount} von ${totalCount} Tischen spielen (${percent} % der Sammlung).`,
        worldTourTitle: () => "Weltreise",
        worldTourDescription: () => "Alle Tische des Rads in einem Zug durchblättern, ohne einen zu starten.",
        playTimeMilestoneTitles: {
            1: "Aufwärmen",
            5: "Jetzt wird's ernst",
            10: "Flippersüchtig",
            50: "Flippern im Blut",
            100: "Tilt-Legende",
        },
        playTimeMilestoneDescription: (hours) => `Insgesamt mehr als ${hours} Stunde${hours > 1 ? "n" : ""} spielen.`,
        decadeCompletionTitle: (decadeStartYear) => `Reise in die ${decadeStartYear}er`,
        decadeCompletionDescription: (decadeStartYear, count) => `Alle ${count} Tische der ${decadeStartYear}er mindestens einmal spielen.`,
        categoryCompletionTitle: (category) => `${category}-Meister`,
        categoryCompletionDescription: (category, count) => `Alle ${count} Tische der Kategorie "${category}" mindestens einmal spielen.`,
        marathonTitles: {
            30: "Kleiner Marathon",
            60: "Marathonläufer",
        },
        marathonDescription: (minutes) => `Eine einzige Session von über ${minutes} Minuten spielen.`,
        cabinetStreakTitles: {
            3: "Nachschlag, bitte",
            7: "Eine Woche am Automaten",
            15: "Automaten-Stammgast",
            30: "Gehört zum Inventar",
        },
        cabinetStreakDescription: (days) => `${days} Tage in Folge am Automaten spielen, egal an welchem Tisch.`,
        rageQuitTitle: () => "Wutausstieg?!",
        rageQuitDescription: (minSeconds, maxSeconds) => `Einen Tisch nach nur ${minSeconds} bis ${maxSeconds} Sekunden verlassen...`,
        grandReturnTitle: () => "Die große Rückkehr",
        grandReturnDescription: (days) => `Einen Tisch nach ${days} oder mehr Tagen Pause wieder spielen.`,
        // A Secret Achievement's hint, shown instead of its description while it is missing.
        rageQuitHint: () => "An manchen Tagen will ein Tisch einfach nicht...",
        grandReturnHint: () => "Alte Freunde freuen sich immer über ein Wiedersehen...",
        worldTourHint: () => "Manche Reisen gelingen, ohne je Start zu drücken...",
        nightOwlTitle: () => "Nachteule",
        nightOwlDescription: (from, to) => `Ein Spiel zwischen ${from} und ${to} starten.`,
        nightOwlHint: () => "Flippern schläft nie...",
        fullMoonNightTitle: () => "Vollmondnacht",
        fullMoonNightDescription: (from, to, percent) => `Ein Spiel zwischen ${from} und ${to} starten, während der Mond zu mindestens ${percent} % beleuchtet ist.`,
        fullMoonNightHint: () => "In manchen Nächten flippern sogar Werwölfe...",
        fridayThe13thTitle: () => "Freitag, der 13.",
        fridayThe13thDescription: () => "An einem Freitag, dem 13., ein Spiel starten.",
        fridayThe13thHint: () => "An manchen Tagen geht man besser nicht unter einer Leiter durch...",
        lunchBreakTitle: () => "Mittagspause",
        lunchBreakDescription: (from, to) => `Ein Spiel zwischen ${from} und ${to} starten, von Montag bis Freitag.`,
        lunchBreakHint: () => "Das Brötchen in der einen Hand, den Flipper in der anderen...",
        mirrorHourTitle: () => "Spiegelzeit",
        mirrorHourDescription: () => "Ein Spiel zu einer Uhrzeit starten, deren Stunden den Minuten gleichen, etwa 11:11.",
        mirrorHourHint: () => "Zeit für einen Wunsch...",
        fourSeasonsTitle: () => "Vier Jahreszeiten",
        fourSeasonsDescription: (count) => `In jeder der ${count} Jahreszeiten mindestens einmal spielen.`,
        fourSeasonsHint: () => "Flippern hat das ganze Jahr Saison...",
        oneMoreGameTitle: () => "Noch ein Spiel!",
        oneMoreGameDescription: (count) => `Denselben Tisch ${count}-mal hintereinander spielen.`,
        oneMoreGameHint: () => "Wer liebt, der zählt nicht...",
        timeTravelTitle: () => "Zeitreise",
        timeTravelDescription: (count) => `${count} Spiele hintereinander spielen, jedes auf einem Tisch aus einem älteren Jahrzehnt als das vorige.`,
        timeTravelHint: () => "Und wenn wir in der Zeit zurückreisen...",
        snackTimeTitle: () => "Snackpause",
        snackTimeDescription: () => "Ein Spiel zwischen 16 und 17 Uhr starten.",
        snackTimeHint: () => "Nur ein Spiel vor den Hausaufgaben...",
        wednesdayOffTitle: () => "Freier Mittwoch",
        wednesdayOffDescription: () => "An einem Mittwochnachmittag ein Spiel starten.",
        wednesdayOffHint: () => "Heute Nachmittag ist keine Schule...",
        grownUpRecordTakenTitle: () => "Besser als die Großen",
        grownUpRecordTakenDescription: () => "Einem Erwachsenen einen Tischrekord abnehmen.",
        randomGamesTitles: {
            10: "Warum nicht?",
            25: "Kopf oder Zahl",
            50: "Würfelspieler",
            100: "Ich liiiiebe den Zufall",
        },
        randomGamesDescription: (count) => `${count} zufällige Tische spielen.`,
        ratingsTitles: {
            1: "Erstes Urteil",
            5: "Sofakritiker",
            10: "Großinquisitor",
            25: "Orakel des Spielfelds",
        },
        ratingsDescription: (count) => (count === 1 ? "Einen Tisch bewerten." : `${count} Tische bewerten.`),
        challengesCompletedTitles: {
            1: "Erste Herausforderung",
            5: "Herausforderer",
            10: "Herausforderungssucher",
            25: "Herausforderungsjäger",
            50: "Meister der Herausforderungen",
            100: "Legende der Woche",
        },
        challengesCompletedDescription: (count) => (count === 1 ? "Eine Herausforderung schaffen." : `${count} Herausforderungen schaffen.`),
        highScoreTablesTitles: {
            1: "In Stein gemeißelt",
            3: "Drei Banner gehisst",
            5: "Herr der fünf Tafeln",
            10: "Der Kwisatz Hiscorach",
        },
        highScoreTablesDescription: (count) => (count === 1 ? "Auf einem Tisch einen Highscore erringen." : `Auf ${count} verschiedenen Tischen Highscores erringen.`),
        tableRecordTablesTitles: {
            1: "Ein Score, sie zu knechten",
            3: "Kriegsherr dreier Welten",
        },
        tableRecordTablesDescription: (count) => (count === 1 ? "Einen Tischrekord aufstellen." : `Auf ${count} verschiedenen Tischen Tischrekorde aufstellen.`),
        tableRecordTakenTitle: "Der Usurpator",
        tableRecordTakenDescription: "Einem anderen Profil einen Tischrekord abnehmen.",
        dayManufacturersTitles: {
            3: "Weltreise im Eiltempo",
            5: "Flipper-Schmetterling",
            8: "Serien-Untreuer",
            10: "Flipper-Casanova",
        },
        dayManufacturersDescription: (count) => `Am selben Tag Tische von ${count} verschiedenen Herstellern spielen.`,
        // Header of the Achievement Toast card.
        toastHeader: "Erfolg freigeschaltet",
    },

    achievementList: {
        menuEntry: "Meine Erfolge",
        // The header's title and the section titles are shown in capitals.
        title: "Erfolgsliste",
        totalLine: (unlockedCount, totalCount, percent) => `${unlockedCount} / ${totalCount} Erfolge freigeschaltet (${percent} %)`,
        unlockedSection: "Freigeschaltete Erfolge",
        missingSection: "Offene Erfolge",
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
            ratedTables: {
                short: (current, target) => `${current}/${target}`,
            },
        },
    },

    profileStats: {
        menuEntry: "Mein Profil",
        // The buttons at the card's foot.
        buttons: {
            achievements: "Erfolge",
            frame: "Avatar-Rahmen",
            mostPlayedTables: "Meistgespielte Tische",
            tablesToDiscover: "Unentdeckte Tische",
            household: "Familienstatistik",
        },
        // The Household Stats opened from the Household button: the title and
        // the line labels the stats above do not have.
        household: {
            title: "Familienstatistik",
            lines: {
                playerLevel: "Spielerlevel",
                collectionMastery: "Sammlungsmeisterschaft",
                achievementsUnlocked: "Erfolge freigeschaltet",
                dailyStreak: "Tage in Folge",
            },
        },
        // The Avatar Frame list opened from the Frame button: its title, the
        // "no frame" row, the worn row's mark and a locked frame's condition.
        frameList: {
            title: "Avatar-Rahmen",
            none: "Keiner",
            worn: "Getragen",
            unlockCondition: (tier) => `Sammlungsstufe ${tier}`,
        },
        // The card's Player Level: its title over the big digits, then the
        // points so far and those of the next level, thousands separated.
        playerLevel: {
            title: "LEVEL",
            current: (points, nextLevelPoints) => `Aktuell: ${points} / ${nextLevelPoints}`,
        },
        collectionTitle: "SAMMLUNGSMEISTERSCHAFT",
        sections: {
            game: "SPIEL",
            progression: "FORTSCHRITT",
            tastes: "VORLIEBEN",
        },
        // The stats' labels, over their values.
        stats: {
            gamesPlayed: "Gespielte Spiele",
            totalTime: "Gesamtzeit",
            averageDuration: "Ø Spieldauer",
            collection: "Sammlung",
            challengesCompleted: "Herausforderungen",
            highScoresHeld: "Gehaltene Highscores",
            tableRecordsHeld: "Gehaltene Tischrekorde",
            cabinetStreak: "Tage in Folge",
            dayStreak: "Serie Tisch des Tages",
            weekStreak: "Serie Tisch der Woche",
            favouriteManufacturer: "Lieblingshersteller",
            favouriteDecade: "Lieblingsjahrzehnt",
            favouriteTable: "Meistgespielter Tisch",
            firstTablePlayed: "Zuerst gespielt",
            lastTablePlayed: "Zuletzt gespielt",
        },
        // Thousands separated: "1.206".
        number: (count) => String(count).replace(/\B(?=(\d{3})+(?!\d))/g, "."),
        // Minutes on two digits: "96 h 05".
        hoursAndMinutes: (hours, minutes) => `${hours} h ${String(minutes).padStart(2, "0")}`,
        minutes: (minutes) => `${minutes} min`,
        fraction: (count, total) => `${count}/${total}`,
        // The share of the collection played, in a pill.
        percent: (percent) => `${percent} %`,
        // A Streak's longest, in a pill (gold while the current one sets it).
        record: (longest) => `Rekord: ${longest}`,
        // A favourite's play time, in a pill; its hours and minutes given.
        playTime: (time) => `${time} gespielt`,
        // The favourite decade, by its start year: 1990 for 1990 to 1999.
        decade: (decadeStartYear) => `${decadeStartYear}er`,
        // The first or last table played's date, day and month on two digits.
        playedOn: (day, month, year) => `am ${day}.${month}.${year}`,
        // A stat without a value, such as the average before any Play.
        none: "—",
    },

    // Profiles. Guest's folder name is never shown: this is its name.
    profiles: {
        menuEntry: "Spieler wechseln",
        pickerTitle: "Wer spielt?",
        pickerHint: "Flipper: blättern · Start: wählen · Exit: abbrechen",
        guestName: "Gast",
        // The Profile picker's last slot, and the screen it opens.
        newProfile: "Neues Profil",
        nameEntry: {
            title: "Benennen Sie Ihr Profil",
            lines: [
                "Höchstens 12 Zeichen.",
                "Für einen längeren Namen oder einen mit Akzenten benennen Sie den Ordner in Windows um, bevor Sie spielen.",
            ],
            firstProfileLine: "Dieses erste Profil wird statt Gast Admin: Wählen Sie es danach aus, um die Konfigurationseinträge zu behalten.",
            ok: "OK",
            refusals: {
                guest: "Dieser Name gehört dem Profil Gast.",
                reserved: "Windows behält sich diesen Namen vor.",
                taken: "Ein Profil trägt bereits diesen Namen.",
            },
            folderFailed: "Der Ordner dieses Profils konnte nicht erstellt werden: Prüfen Sie den Ordner profiles in Windows und versuchen Sie es erneut.",
        },
        // Avatar Choice, right after Name Entry: its title, then a line under the Profile's name.
        avatarChoice: {
            title: "Wählen Sie Ihren Avatar",
            line: "Sie können ihn in Windows ersetzen; die Änderung gilt nach dem nächsten Start von PinballY.",
            keepDefaultQuestion: "Den Standard-Avatar behalten?",
            chooseAvatar: "Einen Avatar wählen",
            keepDefault: "Den Standard-Avatar behalten",
        },
        greeting: name => `Hallo ${name}!`,
    },

    // A Drawn Menu shown natively: a line that cannot be used, with its reason.
    drawnMenu: {
        disabledLine: (label, reason) => `${label} (${reason})`,
    },

    // Manage profiles, in PinballY's Exit menu for an Admin Profile: the
    // marks and the Profile Reset.
    profileReset: {
        menuEntry: "Profile verwalten",
        listTitle: "Welches Profil?",
        adminLine: isAdmin => `Admin: ${isAdmin ? "ja" : "nein"}`,
        childLine: isChild => `Kind: ${isChild ? "ja" : "nein"}`,
        reset: "Zurücksetzen",
        back: "Zurück",
        becomeAdmin: "Admin werden",
        // Why a mark line is greyed out, by the mark rules' refusal.
        refusals: {
            guestNeverMarked: "Gast wird nie markiert",
            removeAdminMarkFirst: "Zuerst die Admin-Markierung entfernen",
            removeChildMarkFirst: "Zuerst die Kind-Markierung entfernen",
            lastAdmin: "Letzter Admin",
        },
        marksFailed: name => `Die Markierungen von ${name} konnten nicht geändert werden. Details stehen im Log.`,
        confirm: name => `${name} zurücksetzen? Alle Partien, Serien, Herausforderungen und Erfolge werden gelöscht.`,
        yes: "Ja, zurücksetzen",
        no: "Nein",
        cancel: "Abbrechen",
        done: name => `${name} fängt von vorne an.`,
        failed: name => `${name} konnte nicht zurückgesetzt werden. Details stehen im Log.`,
        ok: "OK",
        everyProfile: "Alle Profile zurücksetzen",
        confirmEvery: count => `Alle ${count} Profile zurücksetzen? Alle ihre Partien, Serien, Herausforderungen und Erfolge werden gelöscht.`,
        everyDone: count => `Alle ${count} Profile fangen von vorne an.`,
        everyFailed: (count, names) => `Zurückgesetzte Profile: ${count}. Nicht zurückgesetzt: ${names.join(", ")}. Details stehen im Log.`,
    },

    // Discord Rich Presence on the cabinet's Discord account (addons/discord_rich_presence.js).
    discordRichPresence: {
        choosingTable: "Wählt einen Tisch",
        tableOfTheDay: "Tisch des Tages",
        tableOfTheWeek: "Tisch der Woche",
        warningTitle: "Discord Rich Presence",
        warning: "Discord nicht gefunden: Der gespielte Tisch wird nicht auf Discord angezeigt. Starten Sie Discord vor PinballY.",
    },
    warningToast: {
        header: "Warnung",
    },

    // The clock at the top left of the wheel screen.
    clock: {
        time: (hours, minutes) => `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    },

    // The Challenge Card, at the top right of the wheel screen (see common/challenges/challenge_card.js).
    challenges: {
        cardHeader: "Herausforderung der Woche",
        titles: {
            differentTables: (target) => `${target} verschiedene Tische spielen`,
            manufacturerTables: (target, manufacturer) => `${target} verschiedene ${manufacturer}-Tische spielen`,
            decadeTables: (target, decade) => `${target} verschiedene Tische aus den ${decade}ern spielen`,
            differentManufacturers: (target) => `Tische von ${target} verschiedenen Herstellern spielen`,
            differentDecades: (target) => `Tische aus ${target} verschiedenen Jahrzehnten spielen`,
            neverPlayedTables: (target) => `${target} nie gespielte Tische spielen`,
            dustyTables: (target) => `${target} seit sechs Monaten nicht gespielte Tische spielen`,
            tableOfTheDayDays: (target) => `Den Tisch des Tages an ${target} verschiedenen Tagen spielen`,
            tableOfTheWeekGames: (target) => `${target} Spiele auf dem Tisch der Woche spielen`,
            activeDays: (target) => `An ${target} verschiedenen Tagen spielen`,
            endurance: (target) => `${target} Minuten auf einem Tisch spielen`,
            marathon: (target) => `Insgesamt ${target} Minuten spielen`,
            randomGames: (target) => `${target} zufällige Spiele spielen`,
            sameTableGames: (target) => `${target} Spiele auf demselben Tisch spielen`,
        },
        progress: (value, target, daysText) => `${value}/${target} · ${daysText}`,
        daysLeft: (days) => `noch ${days} Tage`,
        lastDay: "letzter Tag",
        completed: "Herausforderung geschafft!",
        verdictHeader: "Vorherige Herausforderung",
        missed: (reached, target) => `Verpasst · ${reached}/${target}`,
        toastHeader: "Herausforderung geschafft",
        toastDescription: (count) => (count === 1 ? "Erste Herausforderung geschafft" : `${count} Herausforderungen geschafft`),
    },

    // The Mastery Bar, under the Challenge Card (see common/mastery/mastery_bar.js), and the
    // Collection Mastery's texts.
    tableMastery: {
        // Collection Mastery: the goal toward the next Collection Tier
        // (that many tables at the level of that name), how many tables
        // already reach it, or, at the last tier, that all of them did.
        collection: {
            goal: (count, levelName) => `Ziel: ${count} ${count === 1 ? "Tisch" : "Tische"} auf Niveau ${levelName}`,
            current: (reached, needed) => `Aktuell: ${reached}/${needed}`,
            allTables: (levelName) => `Alle Ihre Tische: ${levelName}`,
        },
        levelNames: ["Neuling", "Lehrling", "Stammspieler", "Könner", "Spezialist", "Ass", "Virtuose", "Wunderkind", "Legende", "Flipper-Zauberer"],
        toDiscover: "Zu entdecken",
        toastHeader: "Tischmeisterschaft",
        toastTitle: (name, level) => `${name} (${level})`,
        collectionToastHeader: "Sammlungsmeisterschaft",
        collectionToastTitle: (tier, name) => `Sammlungsstufe ${tier}: ${name}`,
        collectionToastDescription: (count, name) => `${count} ${count === 1 ? "Tisch" : "Tische"} auf Niveau ${name} oder höher`,
    },
    profileRewards: {
        // The Avatar Frames' names, from Collection Tier 1 to 10.
        frameNames: [
            "Zauberwald", "Dampf und Zahnräder", "Arcade-Neon", "Ewiger Frost", "Gewürz von Arrakis",
            "Arkanes Grimoire", "Orbitalstation", "Drachenatem", "Königlicher Flipper", "Himmlische Legende",
        ],
        // The Mastery Toast's extra line, naming the frames its Collection
        // Tier unlocks (more than one when a Play raised it by several tiers).
        toastLine: (names) => `${names.length === 1 ? "Neuer Rahmen" : "Neue Rahmen"}: ${names.join(", ")}`,
        toastHeader: "Feiertagsrahmen",
        holidays: {
            newYear: { name: "Neujahr", condition: "Eine Partie am 1. Januar" },
            chineseNewYear: { name: "Chinesisches Neujahr", condition: "Eine Partie am Chinesischen Neujahr, zwischen dem 21. Januar und dem 20. Februar" },
            valentine: { name: "Valentinstag", condition: "Eine Partie am 14. Februar" },
            mardiGras: { name: "Faschingsdienstag", condition: "Eine Partie am Faschingsdienstag, 47 Tage vor Ostern" },
            stPatrick: { name: "St. Patrick's Day", condition: "Eine Partie am 17. März" },
            easter: { name: "Ostern", condition: "Eine Partie am Ostersonntag" },
            musicDay: { name: "Fête de la Musique", condition: "Eine Partie am 21. Juni" },
            halloween: { name: "Halloween", condition: "Eine Partie am 31. Oktober" },
            deadDay: { name: "Día de los Muertos", condition: "Eine Partie am 1. oder 2. November" },
            thanksgiving: { name: "Thanksgiving", condition: "Eine Partie an Thanksgiving, dem vierten Donnerstag im November" },
            christmas: { name: "Weihnachten", condition: "Eine Partie am 24. oder 25. Dezember" },
        },
        // The Reward Prompt, after a Profile's first frame: the frame's name,
        // then the main menu entry and the Profile Stats button to equip it from.
        prompt: {
            title: "Neuer Avatar-Rahmen",
            message: (name, menuEntry, button) => `Sie haben den Avatar-Rahmen "${name}" gewonnen! Legen Sie ihn unter "${menuEntry}" und dann "${button}" an.`,
            goEquip: "Jetzt anlegen",
            gotIt: "OK",
        },
    },
    playerLevel: {
        toastHeader: "Level-Up",
        toastTitle: (level) => `Level ${level}`,
        toastDescription: "Ihre Erfolge haben Sie auf ein neues Level gebracht.",
    },
    highScores: {
        toastHeader: "Highscore",
        toastTitle: (table, place) => `Highscore auf ${table}: ${place}. Platz`,
        tableRecordTitle: (table) => `Tischrekord auf ${table}!`,
        toastScore: (score) => `${score} Punkte`,
        takenFrom: (profile) => `${profile} abgenommen`,
        // The High Score Board.
        board: {
            menuEntry: "Highscores",
            record: "Rekord",
            // In place of a place's owner when it belongs to no Profile.
            defaultScore: "Standardscore",
            // In place of the initials when none were typed.
            noInitials: "\u2014",
            noScore: "Noch kein Score",
            // While PINemHi reads the board, as a message or a note over the last known one.
            reading: "Wird gelesen\u2026",
            // Over the last known board when the fresh read failed.
            notRefreshed: "Diese Scores konnten nicht aktualisiert werden",
            notSupported: "Die Highscores dieses Tisches werden nicht unterstützt",
            // A table without a ROM whose VPReg.stg section or text file is not learned yet.
            notLearned: "Spielen Sie eine Partie, um die Highscores dieses Tisches anzuzeigen",
            views: { table: "Der Tisch", household: "Die Familie", personal: "Meine besten 5" },
            noHouseholdScore: "Noch hat niemand aus der Familie einen Highscore auf diesem Tisch",
            noPersonalScore: "Schaffen Sie es auf die Highscores dieses Tisches, um hier Ihre besten Scores zu sehen",
            date: (day, month, year) => `${day}.${month}.${year}`,
        },
    },

    // The language names stay each in its own language.
    expansionPackSettings: {
        menuEntry: "Expansion-Pack-Einstellungen",
        on: "An",
        off: "Aus",
        addOnLine: (name, state) => `${name}: ${state}`,
        languageLine: (languageName) => `Sprache: ${languageName}`,
        startupScreenLine: (screenName) => `Startbildschirm: ${screenName}`,
        startupScreenNames: { welcome: "Willkommensseite", profilePicker: "Profilauswahl", wheel: "Wheel" },
        offlineMode: "Offline-Modus",
        updateCheckLine: (state) => `Update-Prüfung des Packs: ${state}`,
        offerVpxtoolLine: (state) => `vpxtool anbieten: ${state}`,
        updateTo: (version) => `Auf v${version} aktualisieren`,
        installVpxtool: (version) => `vpxtool v${version} installieren`,
        updateVpxtool: (installed, version) => `vpxtool aktualisieren (v${installed} → v${version})`,
        vpxtoolUpToDateLine: "vpxtool aktualisieren",
        vpxtoolUpToDate: (installed) => `vpxtool v${installed} ist aktuell`,
        back: "Zurück",
        groups: {
            playersAndProgress: "Spieler und Fortschritt",
            wheelScreen: "Wheel-Bildschirm",
            menusAndFilters: "Menüs und Filter",
            launchingAndPlaying: "Einen Tisch starten und spielen",
            debugging: "Fehlersuche",
        },
        onRestart: (state) => `${state} (nach Neustart)`,
        whenOnLabel: "An:",
        whenOffLabel: "Aus:",
        save: "Speichern",
        cancel: "Abbrechen",
        discordConsentMessage: "Ihr auf diesem PC geöffnetes Discord-Konto zeigt öffentlich den gespielten Tisch, wie lange er gespielt wird und wann das Wheel geöffnet ist. Das PinballY Expansion Pack sendet keinen Profilnamen und keine anderen persönlichen Daten von diesem PC.",
        discordConsentTurnOn: "Einschalten",
        notSaved: "Einstellung nicht gespeichert",
        ok: "OK",
        restartQuestion: "Die gespeicherten Einstellungen gelten nach einem Neustart von PinballY.",
        restartNow: "Neu starten",
        later: "Später",
        restartFailedTitle: "Neustart nicht möglich",
        restartFailed: "Die Einstellungen gelten beim nächsten Start.",
        addOns: {
            profilePicker: {
                name: "Profilauswahl",
                whenOn: "Spieler wechseln im Hauptmenü, um zu wählen, wer spielt.",
                whenOff: "Alle spielen als Gast; kein Avatar und kein Gruß auf der Willkommensseite.",
            },
            profileRatings: {
                name: "Bewertungen pro Profil",
                whenOn: "Jedes Profil behält seine eigenen Bewertungen und Favoriten.",
                whenOff: "Alle teilen dieselben Bewertungen und Favoriten; keine Bewertungs-Erfolge.",
            },
            startupChoicePrompt: {
                name: "Willkommensseite",
                whenOn: "Beim Start und nach Spieler wechseln: einen Tisch wählen oder den Spieler wechseln.",
                whenOff: "Die Profilauswahl begrüßt den Spieler nur.",
            },
            achievements: {
                name: "Erfolge",
                whenOn: "Beim Spielen verdiente Erfolge, jeweils mit einer Einblendung angekündigt.",
                whenOff: "Kein Spielerlevel.",
            },
            sessionStatsTracker: {
                name: "Session-Statistik",
                whenOn: "Zählt jede Session, für die Session-Erfolge.",
                whenOff: "Keine Session-Erfolge.",
            },
            challenges: {
                name: "Herausforderungen",
                whenOn: "Jede Woche eine Herausforderung, unter dem Profil-Abzeichen.",
                whenOff: "Keine Herausforderungs-Erfolge und keine Herausforderungsstatistik.",
            },
            tableMastery: {
                name: "Tischmeisterschaft",
                whenOn: "Eine Meisterschaftsstufe auf jedem Tisch, für jeden Spieler.",
                whenOff: "Keine Sammlungsstufen und keine Avatar-Rahmen dazu.",
            },
            highScores: {
                name: "Highscores",
                whenOn: "Jeder neue Highscore wird dem Spieler gutgeschrieben, der ihn erzielt hat.",
                whenOff: "Keine Highscore-Erfolge und keine Tischrekorde; die Highscores von PinballY kehren zurück.",
            },
            statusLineInfo: {
                name: "Statuszeile",
                whenOn: "Jahr, Hersteller, Partien und Spielzeit des Tisches in der Statuszeile.",
                whenOff: "Sonst ändert sich nichts.",
            },
            clock: {
                name: "Uhr",
                whenOn: "Die Uhrzeit oben links auf dem Bildschirm.",
                whenOff: "Sonst ändert sich nichts.",
            },
            statusIcons: {
                name: "Statussymbole",
                whenOn: "Neben der Uhr das Discord-Symbol, solange der Automat auf Discord öffentlich ist, ein goldener Pfeil, solange eine Aktualisierung des Packs wartet, ein durchgestrichener Pfeil, solange die Update-Prüfung des Packs aus ist.",
                whenOff: "Sonst ändert sich nichts.",
            },
            wheelArc: {
                name: "Wheel-Bogen",
                whenOn: "Ein goldener Bogen unter dem Wheel, außer Sie verwenden ein eigenes Underlay.",
                whenOff: "Sonst ändert sich nichts.",
            },
            uiTranslation: {
                name: "PinballY-Übersetzung",
                whenOn: "Die Menüs und Meldungen von PinballY in der Sprache des Packs.",
                whenOff: "Sonst ändert sich nichts.",
            },
            drawnMenus: {
                name: "Gezeichnete Menüs",
                whenOn: "Die Menüs von PinballY im Stil des Packs gezeichnet.",
                whenOff: "Die schlichten Menüs von PinballY kehren zurück, außer für diese Einstellungen.",
            },
            customMenuCommands: {
                name: "Menübefehle",
                whenOn: "Tischkonfiguration im Hauptmenü.",
                whenOff: "Sonst ändert sich nichts.",
            },
            randomGame: {
                name: "Zufallstisch",
                whenOn: "Einen zufälligen Tisch aus dem Hauptmenü starten, unter Spielen.",
                whenOff: "Der Zufallstisch bleibt auf der Willkommensseite; ist auch sie aus, keine Zufallsspiel-Erfolge.",
            },
            hallOfFame: {
                name: "Hall of Fame",
                whenOn: "Ein Filter mit Ihren zehn meistgespielten Tischen.",
                whenOff: "Keine Schaltfläche Meistgespielte Tische unter Mein Profil.",
            },
            tablesToDiscover: {
                name: "Unentdeckte Tische",
                whenOn: "Ein Filter mit den Tischen, die Sie nie gespielt haben.",
                whenOff: "Keine Schaltfläche Unentdeckte Tische unter Mein Profil.",
            },
            hiddenTables: {
                name: "Ausgeblendete Tische",
                whenOn: "Ein Filter mit den ausgeblendeten Tischen.",
                whenOff: "Sonst ändert sich nichts.",
            },
            customFilter: {
                name: "Original-Tische",
                whenOn: "Ein Filter Original-Tische, unter Nach Hersteller filtern.",
                whenOff: "Sonst ändert sich nichts.",
            },
            menuCleanup: {
                name: "Menüs aufräumen",
                whenOn: "Kürzere Menüs, ohne selten genutzte Einträge wie Hilfe, Über oder Flyer.",
                whenOff: "Sonst ändert sich nichts.",
            },
            forceBackglass: {
                name: "Backglass",
                whenOn: "Das Backglass wird beim Start gezeigt und während eines Spiels ausgeblendet.",
                whenOff: "Sonst ändert sich nichts.",
            },
            backglassClock: {
                name: "Backglass-Uhr",
                whenOn: "Die Uhrzeit in einem kleinen Kasten auf dem Backglass-Bildschirm während eines Spiels.",
                whenOff: "Sonst ändert sich nichts.",
            },
            discordRichPresence: {
                name: "Discord Rich Presence",
                whenOn: "Ihr Discord-Konto zeigt öffentlich den gespielten Tisch und seit wann; starten Sie Discord vor PinballY.",
                whenOff: "Sonst ändert sich nichts.",
            },
            seamlessLaunchOverlay: {
                name: "Start-Overlay",
                whenOn: "Kein schwarzes Aufblitzen, während ein Tisch lädt.",
                whenOff: "Sonst ändert sich nichts.",
            },
            playLaunchSound: {
                name: "Startton",
                whenOn: "Ein Ton, wenn ein Tisch startet.",
                whenOff: "Sonst ändert sich nichts.",
            },
            ratingPrompt: {
                name: "Bewertungsfrage",
                whenOn: "Bittet Sie nach einer Weile, einen Tisch zu bewerten.",
                whenOff: "Sonst ändert sich nichts.",
            },
            tableRoms: {
                name: "Tisch-ROMs",
                whenOn: "Findet die ROM jedes Tisches selbst (benötigt vpxtool).",
                whenOff: "Sonst ändert sich nichts.",
            },
            launchEventsTrace: {
                name: "Startereignis-Protokoll",
                whenOn: "Protokolliert die Startereignisse zur Fehlersuche (mit LOG_LAUNCH_EVENTS=true).",
                whenOff: "Sonst ändert sich nichts.",
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
        promptTitle: "Aktualisierung verfügbar",
        prompt: (version) => `eXpansion Pack v${version} ist verfügbar.`,
        updateNow: "Jetzt aktualisieren",
        later: "Später",
        updateFailedTitle: "Aktualisierung nicht möglich",
        updateFailed: "Das eXpansion Pack bleibt unverändert.",
        // Under the Loader while the Pack Update helper gets ready.
        downloadingUpdate: "Aktualisierung wird heruntergeladen…",
        ok: "OK",
        updatedTitle: "Aktualisierung abgeschlossen",
        updated: (version) => `eXpansion Pack auf v${version} aktualisiert`,
        toastTitle: "eXpansion Pack",
    },
    versionNotice: {
        notTestedTitle: "PinballY-Version nicht getestet",
        notTested: (running, tested) => `PinballY ${running} wurde noch nicht mit dieser Version des Packs getestet, die auf ${tested} getestet wurde. Alles kann einwandfrei funktionieren, aber wenn sich etwas seltsam verhält, kann es daran liegen.`,
        tooOldTitle: "PinballY-Version zu alt",
        tooOld: (minimum, running) => `Dieses Pack benötigt PinballY ${minimum} oder neuer, und dieser Automat hat ${running}. Manche Funktionen arbeiten möglicherweise nicht: Installieren Sie eine neuere PinballY-Version.`,
        gotIt: "Verstanden",
    },
    scriptReader: {
        dialogTitle: (version) => `vpxtool v${version}`,
        dialog: "vpxtool liest das Skript jedes Tisches, damit seine ROM von selbst eingetragen wird. Geschrieben von Francis De Brabandere, unter der Lizenz Apache-2.0, heruntergeladen von github.com/francisdb/vpxtool.",
        install: "Installieren",
        noThanks: "Nein danke",
        later: "Sie können es auch später in den Expansion-Pack-Einstellungen oder von Hand installieren.",
        downloading: "Wird heruntergeladen…",
        ok: "OK",
        installedTitle: "vpxtool installiert",
        installed: (version) => `vpxtool v${version} ist installiert: Die ROM jedes Tisches wird jetzt von selbst eingetragen.`,
        failedTitle: "Installation nicht möglich",
        failed: "vpxtool konnte nicht installiert werden; nichts wurde geändert. Sie können es in den Expansion-Pack-Einstellungen erneut versuchen.",
        updateTitle: (installed, version) => `vpxtool v${installed} → v${version}`,
        update: "Aktualisieren",
        updateLater: "Sie können es auch später in den Expansion-Pack-Einstellungen oder von Hand aktualisieren.",
        updatedTitle: "vpxtool aktualisiert",
        updated: (version) => `vpxtool ist auf v${version} aktualisiert.`,
        updateFailedTitle: "Aktualisierung nicht möglich",
        updateFailed: "vpxtool konnte nicht aktualisiert werden; nichts wurde geändert. Sie können es in den Expansion-Pack-Einstellungen erneut versuchen.",
    },
    errorToast: {
        header: "Problem",
        playNotSaved: "Dieses Spiel konnte nicht gespeichert werden: Es zählt nicht in Ihrer Statistik.",
        playNotInPlayLog: "Dieses Spiel wurde gezählt, fehlt aber in Ihrem Spielverlauf.",
        packUpdateFailed: (version, logPath) => `Die Aktualisierung auf v${version} ist fehlgeschlagen: Die vorherige Version bleibt erhalten. Details in ${logPath}`,
    },
    releaseHighlights: {
        "1.3.0": [
            "Ein neues Profil wählt jetzt direkt nach der Namenseingabe seinen Avatar aus 24 Porträts.",
            "Während ein Tisch lädt, dreht sich der goldene Komet jetzt auch auf dem Backglass.",
        ],
        "1.2.0": [
            "Erstelle ein neues Profil direkt am Automaten: Wähle das \"+\" unter Spieler wechseln.",
            "Discord kann jetzt den Tisch zeigen, den du spielst: Schalte es in den Expansion-Pack-Einstellungen ein.",
        ],
        "1.1.0": [
            "Starte einen zufälligen Tisch direkt aus dem Hauptmenü.",
            "Während eines Spiels zeigt der Backglass-Bildschirm jetzt die Uhrzeit.",
        ],
        "1.0.0": [
            "Version 1.0: die erste öffentliche Version des eXpansion Pack.",
            "Menüs und Meldungen sind besser lesbar und passen von der ersten Sekunde an auf den Bildschirm.",
            "Nach jeder Aktualisierung zeigt diese Meldung jetzt die Neuigkeiten.",
        ],
    },
};

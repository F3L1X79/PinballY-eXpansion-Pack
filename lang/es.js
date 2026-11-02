// ============================================================
// Spanish translations for PinballY's UI.
// Save this file as UTF-8 with BOM so accented characters display correctly.
// ============================================================

// The active Profile's play time of a table, as PinballY writes its own.
const formatPlayTime = (hours, minutes) => (hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")} horas`
    : `${minutes} minuto${minutes === 1 ? "" : "s"}`);

// Hours of play with one decimal, as an Achievement Progress shows them.
const formatHours = hours => hours.toFixed(1).replace(".", ",");

export default {
    // Direct translations of PinballY's native menu titles.
    nativeMenuLabels: {
        "About PinballY": "Acerca de PinballY",
        "Add Media": "Añadir contenido multimedia",
        "Add to Favorites": "Añadir a favoritos",
        "Adjust Audio Volume": "Ajustar volumen de audio",
        "All Games": "Todas las mesas",
        "All Tables": "Todas las mesas",
        "Batch Capture": "Captura por lotes",
        "Batch Capture lets you capture screen shot images and videos for multiple games.  Step 1: select which games to include in the capture process:": "La captura por lotes te permite capturar imágenes y vídeos de pantalla para varias mesas. Paso 1: selecciona las mesas que quieres incluir en el proceso de captura:",
        "Begin Capture": "Iniciar captura",
        "Cancel": "Cancelar",
        "Capture images & videos": "Capturar imágenes y vídeos",
        "Confirm Power Off": "Confirmar apagado",
        "Delete game details": "Eliminar detalles de la mesa",
        "Edit category names...": "Editar nombres de categorías...",
        "Edit game details...": "Editar detalles de la mesa...",
        "Enable Videos": "Activar vídeos",
        "Exit": "Salir",
        "Exit PinballY": "Salir de PinballY",
        "Favorites": "Favoritos",
        "Filter by Category": "Filtrar por categoría",
        "Filter by Date Added": "Filtrar por fecha de adición",
        "Filter by Era": "Filtrar por época",
        "Filter by Last Played": "Filtrar por última partida",
        "Filter by Manufacturer": "Filtrar por fabricante",
        "Filter by Rating": "Filtrar por valoración",
        "Filter by System": "Filtrar por sistema",
        "Find game media online": "Buscar archivos multimedia en línea",
        "Games marked for batch capture": "Mesas marcadas para captura por lotes",
        "Game Setup": "Configuración de la mesa",
        "Help": "Ayuda",
        "Hide this game": "Ocultar esta mesa",
        "High Scores": "Mejores puntuaciones",
        "In Favorites": "En favoritos",
        "Information": "Información",
        "Instruction Card": "Tarjeta de instrucciones",
        "Mark for Batch Capture": "Marcar para captura por lotes",
        "Marked for Batch Capture": "Marcada para captura por lotes",
        "Mute Attract Mode": "Silenciar el modo de atracción",
        "Mute Buttons": "Silenciar botones",
        "Mute Table Audio": "Silenciar el audio de la mesa",
        "Mute Videos": "Silenciar vídeos",
        "Operator Menu": "Menú del operador",
        "Options": "Opciones",
        "PinballY Options...": "Opciones...",
        "Play": "Jugar",
        "Play Game": "Iniciar partida",
        "Power Off": "Apagar el ordenador",
        "Proceed": "Continuar",
        "Rate Table": "Valorar la mesa",
        "Reset Coins/Credits": "Restablecer monedas/créditos",
        "Resume Game": "Reanudar partida",
        "Return": "Volver",
        "Save": "Guardar",
        "Search": "Buscar",
        "Select categories": "Seleccionar categorías",
        "Show Hidden Games": "Mostrar mesas ocultas",
        "Show Media Files": "Mostrar archivos multimedia",
        "Show Unconfigured Games": "Mostrar mesas no configuradas",
        "Skip this message next time": "No volver a mostrar este mensaje",
        "Terminate Game": "Finalizar partida",
        "The capture process records the exact same areas of the screen where your PinballY windows are located.  Before proceeding, make sure that your PinballY window layout matches the screen layout of the game you're about to record.  For example, if the game's playfield is full-screen, make sure PinballY's playfield window is full-screen.": "El proceso de captura registra exactamente las mismas áreas de la pantalla donde se encuentran las ventanas de PinballY. Antes de continuar, asegúrate de que la disposición de las ventanas de PinballY coincida con la distribución de la pantalla del juego que vas a grabar. Por ejemplo, si el campo de juego del juego está a pantalla completa, asegúrate de que la ventana del campo de juego de PinballY también esté a pantalla completa.",
        "This will launch a Web browser window to search for media files for this game.  Look for a \"HyperPin Media Pack\" file.  Download the file and drag it onto this window to install it.\n\nNote that you can drop a Media Pack file onto this window at any time to install media for the currently selected game.  This menu step isn't required to install media; it's just a convenience for launching a Web search.": "Esto abrirá una ventana del navegador web para buscar archivos multimedia para esta mesa. Busca un archivo \"HyperPin Media Pack\". Descarga el archivo y arrástralo hasta esta ventana para instalarlo.\n\nTen en cuenta que puedes arrastrar un archivo Media Pack a esta ventana en cualquier momento para instalar contenido multimedia para la mesa seleccionada actualmente. Este paso del menú no es necesario para instalar contenido multimedia; simplemente facilita el inicio de una búsqueda web.",
        "Uncategorized": "Sin categoría",
        "Yes, add to current game": "Sí, añadir a la mesa actual",
        "You must enter the game's bibliographic information (title, system, etc.) before adding media files for the game.  The game information is used to determine the folder locations and file names for the game's media files, so it has to be entered before media files can be added to the game.": "Debes introducir la información bibliográfica de la mesa (título, sistema, etc.) antes de añadir archivos multimedia para la mesa. Esta información se utiliza para determinar las ubicaciones de las carpetas y los nombres de archivo de los elementos multimedia de la mesa, por lo que debe introducirse antes de poder añadir archivos multimedia.",
        "Flyer": "Cartel",
        "Pinscape Night Mode": "Modo nocturno de Pinscape",
        "Hidden Tables": "Mesas ocultas",
        "Unconfigured Tables": "Mesas no configuradas",
        "Tables played within:": "Mesas jugadas hace menos de:",
        "Tables not played within:": "Mesas sin jugar desde hace:",
        "Tables added within:": "Mesas añadidas hace menos de:",
        "Tables added more than:": "Mesas añadidas hace más de:",
        "A week": "Una semana",
        "A month": "Un mes",
        "A year": "Un año",
        "A week ago": "Una semana",
        "A month ago": "Un mes",
        "A year ago": "Un año",
        "Never played": "Nunca jugadas",
        "Batch Capture Step 2: Select the media types you'd like to capture for the selected games.  (You'll be able to say what to do about existing files in the next step.)": "Captura por lotes, paso 2: selecciona los tipos de medios que quieres capturar para las mesas elegidas. (En el siguiente paso podrás indicar qué hacer con los archivos existentes.)",
        "Batch Capture Step 3: For each type, indicate if you'd like to capture the item for EVERY game, even for games that already have existing media of the same type, or if you'd only like to capture missing items.": "Captura por lotes, paso 3: para cada tipo, indica si quieres capturarlo para TODAS las mesas, incluso las que ya tienen un medio de ese tipo, o solo para las que no lo tienen.",
        "Next Step": "Siguiente paso",
        "Missing only": "Solo los que faltan",
        "Capture all": "Capturar todo",
        "View Capture List": "Ver la lista de captura",
        "Please select the system to use to launch this table:": "Selecciona el sistema con el que lanzar esta mesa:",
        "Yes, run as Admin": "Sí, ejecutar como administrador",
        "No, cancel": "No, cancelar",
        "Allow (this session only)": "Permitir (solo esta sesión)",
        "Allow (always)": "Permitir (siempre)",
        "Yes, delete it": "Sí, eliminar",
    },

    // Labels for the media-capture screen's "Item: Action" lines
    // (e.g. "Playfield Image: Skip"), combined via dynamicLabelBuilders.captureItemAction.
    mediaCaptureItemLabels: {
        "Backglass Image": "Imagen del backglass",
        "Backglass Video": "Vídeo del backglass",
        "Flyer Image": "Imagen del cartel",
        "Instruction Card": "Tarjeta de instrucciones",
        "Playfield Image": "Imagen del campo de juego",
        "Playfield Video": "Vídeo del campo de juego",
        "Table Audio": "Audio de la mesa",
        "Wheel Image": "Imagen de la rueda",
        "DMD Image": "Imagen del DMD",
        "DMD Video": "Vídeo del DMD",
        "Topper Image": "Imagen del topper",
        "Topper Video": "Vídeo del topper",
        "Launch Audio": "Audio de lanzamiento",
        "Real DMD Image": "Imagen del DMD real",
        "Real DMD Video": "Vídeo del DMD real",
        "Real RGB DMD Image": "Imagen del DMD RGB real",
        "Real RGB DMD Video": "Vídeo del DMD RGB real",
    },
    mediaCaptureActionLabels: {
        "Add": "Añadir",
        "Capture": "Capturar",
        "Capture Silent": "Capturar sin sonido",
        "Capture w/Audio": "Capturar con audio",
        "Keep Existing": "Conservar el existente",
        "Replace Existing": "Reemplazar el existente",
        "Skip": "Omitir",
    },

    // Status text shown in PinballY's launch overlay, keyed by the
    // language-independent event id (see the "launchoverlaymessage" event).
    launchOverlayMessages: {
        "after": "",
        "capturing": "Capturando...",
        "gameover": "Game Over",
        "init": "",
        "launching": "Cargando...",
        "running": "Iniciando la mesa...",
        "terminating": "Volviendo a la lista de juegos...",
    },

    // The step under way, written in gold beneath the Loader while a
    // table launches or closes (Seamless Launch Overlay).
    launchSteps: {
        loading: "Cargando…",
        closing: "Volviendo a las mesas…",
        capturing: "Capturando…",
    },

    // Functions that build translated titles for PinballY's dynamically
    // generated menu text (category names, star ratings, etc.).
    dynamicLabelBuilders: {
        captureInstructions: (seconds) => {
            const plural = seconds === "1" ? "" : "s";
            return `Selecciona los elementos que quieras capturar y, a continuación, haz clic en Iniciar captura. Esto iniciará el juego, capturará las imágenes de la pantalla y cerrará automáticamente el juego al finalizar. El proceso tardará aproximadamente ${seconds} segundo${plural}. (!) significa que se reemplazará un elemento existente.`;
        },
        captureInstructionsOneMinute: () =>
            "Selecciona los elementos que quieras capturar y, a continuación, haz clic en Iniciar captura. Esto iniciará el juego, capturará las imágenes de la pantalla y cerrará automáticamente el juego al finalizar. El proceso tardará aproximadamente 1 minuto. (!) significa que se reemplazará un elemento existente.",
        captureItemAction: (item, action) => `${item}: ${action}`,
        decadeTables: (decade) => `Mesas de los años ${decade}`,
        genericTables: (name) => `Mesas ${name}`,
        mediaGameMismatchWarning: (draggedGame, currentGame) =>
            `Parece que algunos de los archivos multimedia que estás añadiendo podrían estar destinados a otra mesa, "${draggedGame}". Los archivos multimedia siempre se añaden a la mesa seleccionada en la rueda, actualmente "${currentGame}". ¿Deseas añadir estos elementos multimedia a la mesa actual?`,
        mediaGameMismatchWarningMultiple: (gameList, currentGame) =>
            `Parece que algunos de los archivos multimedia que estás añadiendo podrían estar destinados a otras mesas: ${gameList}. Los archivos multimedia siempre se añaden a la mesa seleccionada en la rueda, actualmente "${currentGame}". ¿Deseas añadir estos elementos multimedia a la mesa actual?`,
        mediaReadyToAdd: (gameName) =>
            `Los siguientes elementos multimedia están listos para añadirse a ${gameName}. Selecciona los elementos que deseas añadir o reemplazar.`,
        starTables: (count) => `Mesas con ${count} estrella${count > 1 ? "s" : ""}`,
        startDelay: (seconds) => `Ajustar el retraso de inicio (${seconds} s)`,
        unratedTables: () => "Mesas sin valorar",
        batchCaptureReady: (count, duration) => `¡La captura por lotes está lista! Se incluirán ${count} mesa(s) en este proceso, que tardará aproximadamente ${duration}.`,
        confirmDeleteGameDetails: (title) => `¿Seguro que quieres eliminar los detalles de la mesa ${title}? (Solo se elimina la información bibliográfica, no los archivos de la mesa ni sus medios.)`,
        showCustomView: (name) => `Mostrar ${name}`,
        durationSeconds: (count) => `${count} segundo${count === 1 ? "" : "s"}`,
        durationMinutes: (count) => `${count} minuto${count === 1 ? "" : "s"}`,
        durationHours: (hours, minutes) => (minutes > 0 ? `${hours} h ${minutes} min` : `${hours} hora${hours === 1 ? "" : "s"}`),
    },

    ratingPrompt: {
        title: "Valorar esta mesa",
        message: (tableTitle, minutes) =>
            `¡Has jugado a "${tableTitle}" durante más de ${minutes} minutos! ¿Quieres valorarla ahora?`,
        rateNow: "Valorar ahora",
        notNow: "Más tarde",
    },

    // The Button Hints at the foot of every drawn screen and the Exit
    // Button's tooltip (see GLOSSARY.md). The key caps and the footer's
    // words are shown in capitals.
    buttonHints: {
        // PinballY's button names, as on the cabinet's key caps.
        keyCaps: { next: "Next", prev: "Prev", select: "Select", exit: "Exit" },
        browse: "Explorar",
        // The flippers on a High Score Board longer than the window.
        scroll: "Mover",
        choose: "Elegir",
        // Exit's word and the Exit Button's tooltip: Back where Exit brings
        // back a screen or a menu, Close where it leaves the bare wheel.
        back: "Volver",
        close: "Cerrar",
    },

    welcomeScreen: {
        greetings: { morning: "Buenos días", afternoon: "Buenas tardes", evening: "Buenas noches", night: "Todavía en pie" },
        // Spanish opens the exclamation too.
        greetingWithName: (greeting, name) => [`¡${greeting}, `, name, "!"],
        greetingAlone: (greeting) => `¡${greeting}!`,
        stayOn: (tableTitle) => `Seguir en ${tableTitle}`,
        stayOnWheel: "Seguir en la rueda",
        randomTable: "Lanzar una mesa al azar",
        menuEntry: "Bienvenida",
        // The active Profile's Daily Streak under the greeting, from 2 days
        // on, its count shown in a square before the text.
        cabinetStreak: {
            notYetToday: "días seguidos en la máquina: ¡sigue así!",
            playedToday: "días seguidos en la máquina",
        },
        lostRecord: (taker, tableTitle) => `${taker} te quitó el récord en ${tableTitle}`,
        lostRecords: (records, moreCount) => {
            const named = records.map(record => `${record.tableTitle} (${record.taker})`);
            return moreCount > 0
                ? `Récords perdidos: ${named.join(", ")} y ${moreCount} más`
                : `Récords perdidos: ${named.slice(0, -1).join(", ")} y ${named[named.length - 1]}`;
        },
        // One card per Period Table; its grey line says it was played this
        // Period, or else the Streak of the daily or weekly rendezvous, its
        // count shown in a square before the text.
        periodCards: {
            day: {
                period: "MESA DEL DÍA",
                played: "Jugada hoy",
                streak: "días seguidos en la mesa del día: ¡sigue así!",
            },
            week: {
                period: "MESA DE LA SEMANA",
                played: "Jugada esta semana",
                streak: "semanas seguidas en la mesa de la semana: ¡sigue así!",
            },
            challenge: {
                period: "UNA MESA DEL DESAFÍO",
                progress: (title, value, target) => `${title} · ${value}/${target}`,
                lastStep: "¡Una partida más para superar el desafío!",
            },
            go: "Ir",
        },
    },

    // Lower status line text for the currently selected table.
    // [Filter.Count], [Game.Year], etc. are PinballY placeholders — keep them as-is.
    tableInfoStatusLines: {
        manufacturer: (position) => `Mesa ${position}/[Filter.Count] - fabricada por [Game.Manuf].`,
        manufacturerFictional: (position) => `Mesa ${position}/[Filter.Count] - Flíper ficticio.`,
        playCount: (position, count) => `Mesa ${position}/[Filter.Count] - iniciada ${count} veces.`,
        playTime: (position, hours, minutes) => `Mesa ${position}/[Filter.Count] - jugada durante ${formatPlayTime(hours, minutes)}.`,
        year: (position) => `Mesa ${position}/[Filter.Count] - publicada en [Game.Year].`,
    },

    // Upper status line messages, after the player's own from PinballY's options.
    // [Filter.Count] is a PinballY placeholder — keep it as-is.
    upperStatusLines: {
        welcome: name => `¡Te damos la bienvenida, ${name}!`,
        tablesAvailable: "¡[Filter.Count] mesas disponibles!",
        launchHint: "Botón de lanzamiento para iniciar una mesa.",
        browseHint: "Flippers izquierdo/derecho para pasar las mesas.",
        signOff: "¡Que te diviertas!",
    },

    // Labels for menu items this project adds itself (see custom_menu_commands.js, random_game.js, custom_filter.js, hall_of_fame.js and tables_to_discover.js).
    customMenuLabels: {
        challengeTables: "Mesas del reto",
        hallOfFameFilter: "Hall of Fame",
        myHighScoresFilter: "Mis puntuaciones",
        hiddenTablesFilter: "Mesas ocultas",
        tablesToDiscoverFilter: "Mesas por descubrir",
        originalTablesFilter: "Mesas originales",
        tableSetup: "Configuración de la mesa",
        // The Random Game's main menu entry, worded as welcomeScreen.randomTable.
        randomTable: "Lanzar una mesa al azar",
        tableScores: "Puntuaciones",
        filterPickerBack: "Volver",
        activeFilter: (name) => `Filtro activo: ${name}`,
        // The Drawn main menu's "Change Filter" entry, and its footer's label before the Active Filter.
        changeFilter: "Cambiar filtro",
        activeFilterLabel: "Filtro activo:",
    },

    achievements: {
        dailyFirstPlayTitle: () => "¡Hola, mesa del día!",
        dailyFirstPlayDescription: () => "Iniciar la mesa del día por primera vez.",
        weeklyFirstPlayTitle: () => "Cita semanal",
        weeklyFirstPlayDescription: () => "Iniciar la mesa de la semana por primera vez.",
        dailyPeriodsPlayedTitles: {
            10: "Explorador de domingo",
            25: "Explorador curioso",
            50: "Explorador veterano",
            100: "Indiana Flippers",
        },
        dailyPeriodsPlayedDescription: (days) => `Iniciar la mesa del día ${days} días distintos.`,
        weeklyPeriodsPlayedTitles: {
            4: "Un mes de citas",
            10: "Habitual de la semana",
            26: "Seis meses de fidelidad",
            52: "Un año sin una arruga",
        },
        weeklyPeriodsPlayedDescription: (weeks) => `Iniciar la mesa de la semana ${weeks} semanas distintas.`,
        dailyStreakTitles: {
            3: "No hay dos sin tres",
            7: "Semana perfecta",
            14: "Quincena de hierro",
            30: "Monje del pinball",
        },
        dailyStreakDescription: (days) => `Iniciar la mesa del día ${days} días seguidos.`,
        weeklyStreakTitles: {
            4: "Un mes sin fallos",
            12: "Suscriptor fiel",
        },
        weeklyStreakDescription: (weeks) => `Iniciar la mesa de la semana ${weeks} semanas seguidas.`,
        manufacturerCompletionTitle: (manufacturer) => `Fan absoluto de ${manufacturer}`,
        manufacturerCompletionDescription: (manufacturer, count) => `Jugar al menos una vez las ${count} mesas de ${manufacturer}.`,
        firstTableTitle: () => "Primeros pasos",
        firstTableDescription: () => "Jugar tu primera mesa.",
        collectionPercentTitles: {
            10: "El sabor del metal",
            25: "Coleccionista en ciernes",
            50: "Medio tiempo",
            75: "Casi todo visto",
            100: "Nada se me escapa",
        },
        collectionPercentDescription: (percent, playedCount, totalCount) => `Jugar ${playedCount} mesas de ${totalCount} (${percent} % de tu colección).`,
        worldTourTitle: () => "La vuelta al mundo",
        worldTourDescription: () => "Recorrer todas las mesas de la rueda de una sola vez, sin lanzar ninguna.",
        playTimeMilestoneTitles: {
            1: "Calentando",
            5: "Esto va en serio",
            10: "Adicto al pinball",
            50: "Pinball en la sangre",
            100: "Leyenda del tilt",
        },
        playTimeMilestoneDescription: (hours) => `Acumular más de ${hours} hora${hours > 1 ? "s" : ""} de juego.`,
        decadeCompletionTitle: (decadeStartYear) => `Viaje a los años ${decadeStartYear}`,
        decadeCompletionDescription: (decadeStartYear, count) => `Jugar al menos una vez las ${count} mesas de los años ${decadeStartYear}.`,
        categoryCompletionTitle: (category) => `Maestro de ${category}`,
        categoryCompletionDescription: (category, count) => `Jugar al menos una vez las ${count} mesas "${category}".`,
        marathonTitles: {
            30: "Pequeño maratón",
            60: "Maratonista",
        },
        marathonDescription: (minutes) => `Jugar una sola sesión de más de ${minutes} minutos.`,
        cabinetStreakTitles: {
            3: "Vuelvo por más",
            7: "Una semana en la máquina",
            15: "Fiel a la máquina",
            30: "Parte del mobiliario",
        },
        cabinetStreakDescription: (days) => `Jugar en la máquina ${days} días seguidos, en cualquier mesa.`,
        rageQuitTitle: () => "¡¿Abandono por rabia?!",
        rageQuitDescription: (minSeconds, maxSeconds) => `Salir de una mesa tras apenas ${minSeconds} a ${maxSeconds} segundos...`,
        grandReturnTitle: () => "El gran regreso",
        grandReturnDescription: (days) => `Volver a jugar una mesa tras ${days} días o más sin tocarla.`,
        // A Secret Achievement's hint, shown instead of its description while it is missing.
        rageQuitHint: () => "Hay días en que una mesa simplemente no sale...",
        grandReturnHint: () => "Los viejos amigos siempre se alegran de un reencuentro...",
        worldTourHint: () => "Algunos viajes se hacen sin pulsar nunca Start...",
        nightOwlTitle: () => "Ave nocturna",
        nightOwlDescription: (from, to) => `Iniciar una partida entre las ${from} y las ${to}.`,
        nightOwlHint: () => "El pinball nunca duerme...",
        fullMoonNightTitle: () => "Noche de luna llena",
        fullMoonNightDescription: (from, to, percent) => `Iniciar una partida entre las ${from} y las ${to} con la luna iluminada al menos al ${percent} %.`,
        fullMoonNightHint: () => "Algunas noches, hasta los hombres lobo juegan al pinball...",
        fridayThe13thTitle: () => "Viernes 13",
        fridayThe13thDescription: () => "Iniciar una partida un viernes 13.",
        fridayThe13thHint: () => "Algunos días, mejor no pasar bajo una escalera...",
        lunchBreakTitle: () => "Hora de comer",
        lunchBreakDescription: (from, to) => `Iniciar una partida entre las ${from} y las ${to}, de lunes a viernes.`,
        lunchBreakHint: () => "El bocadillo en una mano, el flipper en la otra...",
        mirrorHourTitle: () => "Hora espejo",
        mirrorHourDescription: () => "Iniciar una partida a una hora cuyas horas coincidan con los minutos, como las 11:11.",
        mirrorHourHint: () => "Pide un deseo...",
        fourSeasonsTitle: () => "Cuatro estaciones",
        fourSeasonsDescription: (count) => `Jugar al menos una vez en cada una de las ${count} estaciones.`,
        fourSeasonsHint: () => "El pinball es para todo el año...",
        oneMoreGameTitle: () => "¡Una partida más!",
        oneMoreGameDescription: (count) => `Jugar la misma mesa ${count} veces seguidas.`,
        oneMoreGameHint: () => "Cuando se ama, no se cuenta...",
        timeTravelTitle: () => "Viaje temporal",
        timeTravelDescription: (count) => `Jugar ${count} partidas seguidas, cada una en una mesa de una década más antigua que la anterior.`,
        timeTravelHint: () => "¿Y si viajáramos al pasado...?",
        snackTimeTitle: () => "Merienda",
        snackTimeDescription: () => "Iniciar una partida entre las 4 y las 5 de la tarde.",
        snackTimeHint: () => "Solo una partida antes de los deberes...",
        wednesdayOffTitle: () => "Miércoles libre",
        wednesdayOffDescription: () => "Iniciar una partida un miércoles por la tarde.",
        wednesdayOffHint: () => "Esta tarde no hay cole...",
        grownUpRecordTakenTitle: () => "Más que los mayores",
        grownUpRecordTakenDescription: () => "Quitarle un récord de mesa a un adulto.",
        randomGamesTitles: {
            10: "¿Y por qué no?",
            25: "Cara o cruz",
            50: "Jugador de dados",
            100: "Me encaaaanta el azar",
        },
        randomGamesDescription: (count) => `Jugar ${count} mesas al azar.`,
        challengesCompletedTitles: {
            1: "Primer desafío",
            5: "Aficionado a los desafíos",
            10: "Buscador de desafíos",
            25: "Cazador de desafíos",
            50: "Maestro de los desafíos",
            100: "Leyenda de la semana",
        },
        challengesCompletedDescription: (count) => (count === 1 ? "Superar un desafío." : `Superar ${count} desafíos.`),
        highScoreTablesTitles: {
            1: "Iniciales en piedra",
            3: "Tres estandartes alzados",
            5: "Señor de los cinco tableros",
            10: "El Kwisatz Hiscorach",
        },
        highScoreTablesDescription: (count) => (count === 1 ? "Conseguir una mejor puntuación en una mesa." : `Conseguir mejores puntuaciones en ${count} mesas distintas.`),
        tableRecordTablesTitles: {
            1: "Un récord para gobernarlos a todos",
            3: "Caudillo de tres mundos",
        },
        tableRecordTablesDescription: (count) => (count === 1 ? "Establecer un récord de mesa." : `Establecer récords de mesa en ${count} mesas distintas.`),
        tableRecordTakenTitle: "El usurpador",
        tableRecordTakenDescription: "Quitarle un récord de mesa a otro perfil.",
        dayManufacturersTitles: {
            3: "Vuelta al mundo exprés",
            5: "Mariposa del pinball",
            8: "Infiel en serie",
            10: "Casanova del pinball",
        },
        dayManufacturersDescription: (count) => `Jugar mesas de ${count} fabricantes distintos el mismo día.`,
        // Header of the Achievement Toast card.
        toastHeader: "Logro desbloqueado",
    },

    achievementList: {
        menuEntry: "Mis logros",
        // The header's title and the section titles are shown in capitals.
        title: "Lista de logros",
        totalLine: (unlockedCount, totalCount, percent) => `${unlockedCount} / ${totalCount} logros desbloqueados (${percent} %)`,
        unlockedSection: "Logros desbloqueados",
        missingSection: "Logros por conseguir",
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
        menuEntry: "Mi perfil",
        // The buttons at the card's foot.
        buttons: {
            achievements: "Logros",
            frame: "Marcos de avatar",
            mostPlayedTables: "Mesas más jugadas",
            tablesToDiscover: "Mesas por descubrir",
            household: "Estadísticas de casa",
        },
        // The Household Stats opened from the Household button: the title and
        // the line labels the stats above do not have.
        household: {
            title: "Estadísticas de casa",
            lines: {
                playerLevel: "Nivel de jugador",
                collectionMastery: "Maestría de la colección",
                achievementsUnlocked: "Logros desbloqueados",
                dailyStreak: "Días seguidos",
            },
        },
        // The Avatar Frame list opened from the Frame button: its title, the
        // "no frame" row, the worn row's mark and a locked frame's condition.
        frameList: {
            title: "Marcos de avatar",
            none: "Ninguno",
            worn: "Puesto",
            unlockCondition: (tier) => `Rango de colección ${tier}`,
        },
        // The card's Player Level: its title over the big digits, then the
        // points so far and those of the next level, thousands separated.
        playerLevel: {
            title: "NIVEL",
            current: (points, nextLevelPoints) => `Actual: ${points} / ${nextLevelPoints}`,
        },
        collectionTitle: "MAESTRÍA DE LA COLECCIÓN",
        sections: {
            game: "JUEGO",
            progression: "PROGRESO",
            tastes: "GUSTOS",
        },
        // The stats' labels, over their values.
        stats: {
            gamesPlayed: "Partidas jugadas",
            totalTime: "Tiempo total",
            averageDuration: "Partida media",
            collection: "Colección",
            challengesCompleted: "Retos superados",
            highScoresHeld: "Mejores puntuaciones",
            tableRecordsHeld: "Récords de mesa",
            cabinetStreak: "Días seguidos",
            dayStreak: "Racha mesa del día",
            weekStreak: "Racha mesa de la semana",
            favouriteManufacturer: "Fabricante favorito",
            favouriteDecade: "Década favorita",
            favouriteTable: "Mesa más jugada",
            firstTablePlayed: "Primera mesa jugada",
            lastTablePlayed: "Última mesa jugada",
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
        record: (longest) => `Récord: ${longest}`,
        // A favourite's play time, in a pill; its hours and minutes given.
        playTime: (time) => `${time} de juego`,
        // The favourite decade, by its start year: 1990 for 1990 to 1999.
        decade: (decadeStartYear) => `Años ${decadeStartYear}`,
        // The first or last table played's date, day and month on two digits.
        playedOn: (day, month, year) => `el ${day}/${month}/${year}`,
        // A stat without a value, such as the average before any Play.
        none: "—",
    },

    // Profiles. Guest's folder name is never shown: this is its name.
    profiles: {
        menuEntry: "Cambiar de jugador",
        pickerTitle: "¿Quién juega?",
        pickerHint: "Flippers: cambiar · Start: elegir · Exit: cancelar",
        guestName: "Invitado",
        // The Profile picker's last slot, and the screen it opens.
        newProfile: "Nuevo perfil",
        nameEntry: {
            title: "Ponle nombre a tu perfil",
            lines: [
                "12 caracteres como máximo.",
                "Para un nombre más largo o con acentos, cambia el nombre de la carpeta en Windows antes de jugar.",
            ],
            ok: "OK",
        },
        greeting: name => `¡Hola ${name}!`,
    },

    // A Drawn Menu shown natively: a line that cannot be used, with its reason.
    drawnMenu: {
        disabledLine: (label, reason) => `${label} (${reason})`,
    },

    // Manage profiles, in PinballY's Exit menu for an Admin Profile: the
    // marks and the Profile Reset.
    profileReset: {
        menuEntry: "Gestionar perfiles",
        listTitle: "¿Qué perfil?",
        adminLine: isAdmin => `Admin: ${isAdmin ? "sí" : "no"}`,
        childLine: isChild => `Niño: ${isChild ? "sí" : "no"}`,
        reset: "Reiniciar",
        back: "Volver",
        becomeAdmin: "Hacerse admin",
        // Why a mark line is greyed out, by the mark rules' refusal.
        refusals: {
            guestNeverMarked: "Invitado nunca se marca",
            removeAdminMarkFirst: "Quita primero la marca de admin",
            removeChildMarkFirst: "Quita primero la marca de niño",
            lastAdmin: "Último admin",
        },
        marksFailed: name => `No se pudieron cambiar las marcas de ${name}. Consulta el registro para más detalles.`,
        confirm: name => `¿Reiniciar ${name}? Se borrarán todas sus partidas, rachas, retos y logros.`,
        yes: "Sí, reiniciar",
        no: "No",
        cancel: "Cancelar",
        done: name => `${name} empieza de cero.`,
        failed: name => `No se pudo reiniciar ${name}. Consulta el registro para más detalles.`,
        ok: "OK",
        everyProfile: "Reiniciar todos los perfiles",
        confirmEvery: count => `¿Reiniciar los ${count} perfiles? Se borrarán todas sus partidas, rachas, retos y logros.`,
        everyDone: count => `Los ${count} perfiles empiezan de cero.`,
        everyFailed: (count, names) => `Perfiles reiniciados: ${count}. No se pudo reiniciar: ${names.join(", ")}. Consulta el registro para más detalles.`,
    },

    // Discord Rich Presence on the cabinet's Discord account (addons/discord_rich_presence.js).
    discordRichPresence: {
        choosingTable: "Eligiendo una mesa",
        tableOfTheDay: "Mesa del día",
        tableOfTheWeek: "Mesa de la semana",
        warningTitle: "Discord Rich Presence",
        warning: "Discord no encontrado: la mesa jugada no aparecerá en Discord. Inicia Discord antes de PinballY.",
    },
    warningToast: {
        header: "Advertencia",
    },

    // The clock at the top left of the wheel screen.
    clock: {
        time: (hours, minutes) => `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    },

    // The Challenge Card, at the top right of the wheel screen (see common/challenges/challenge_card.js).
    challenges: {
        cardHeader: "Reto de la semana",
        titles: {
            differentTables: (target) => `Jugar ${target} mesas distintas`,
            manufacturerTables: (target, manufacturer) => `Jugar ${target} mesas distintas de ${manufacturer}`,
            decadeTables: (target, decade) => `Jugar ${target} mesas distintas de los años ${decade}`,
            differentManufacturers: (target) => `Jugar mesas de ${target} fabricantes distintos`,
            differentDecades: (target) => `Jugar mesas de ${target} décadas distintas`,
            neverPlayedTables: (target) => `Jugar ${target} mesas nunca jugadas`,
            dustyTables: (target) => `Jugar ${target} mesas sin jugar desde hace seis meses`,
            tableOfTheDayDays: (target) => `Jugar la mesa del día ${target} días distintos`,
            tableOfTheWeekGames: (target) => `Jugar ${target} partidas en la mesa de la semana`,
            activeDays: (target) => `Jugar ${target} días distintos`,
            endurance: (target) => `Jugar ${target} minutos en una misma mesa`,
            marathon: (target) => `Jugar ${target} minutos en total`,
            randomGames: (target) => `Jugar ${target} partidas al azar`,
            sameTableGames: (target) => `Jugar ${target} partidas en una misma mesa`,
        },
        progress: (value, target, daysText) => `${value}/${target} · ${daysText}`,
        daysLeft: (days) => `quedan ${days} días`,
        lastDay: "último día",
        completed: "¡Desafío superado!",
        verdictHeader: "Reto anterior",
        missed: (reached, target) => `Fallado · ${reached}/${target}`,
        toastHeader: "Desafío superado",
        toastDescription: (count) => (count === 1 ? "Primer desafío superado" : `${count} desafíos superados`),
    },

    // The Mastery Bar, under the Challenge Card (see common/mastery/mastery_bar.js), and the
    // Collection Mastery's texts.
    tableMastery: {
        // Collection Mastery: the goal toward the next Collection Tier
        // (that many tables at the level of that name), how many tables
        // already reach it, or, at the last tier, that all of them did.
        collection: {
            goal: (count, levelName) => `Objetivo: ${count} ${count === 1 ? "mesa" : "mesas"} en ${levelName}`,
            current: (reached, needed) => `Actual: ${reached}/${needed}`,
            allTables: (levelName) => `Todas tus mesas: ${levelName}`,
        },
        levelNames: ["Novato", "Aprendiz", "Habitual", "Diestro", "Especialista", "As", "Virtuoso", "Prodigio", "Leyenda", "Mago del pinball"],
        toDiscover: "Por descubrir",
        toastHeader: "Maestría de mesa",
        toastTitle: (name, level) => `${name} (${level})`,
        collectionToastHeader: "Maestría de la colección",
        collectionToastTitle: (tier, name) => `Rango ${tier}: ${name}`,
        collectionToastDescription: (count, name) => `${count} ${count === 1 ? "mesa" : "mesas"} en ${name} o más`,
    },
    profileRewards: {
        // The Avatar Frames' names, from Collection Tier 1 to 10.
        frameNames: [
            "Bosque encantado", "Vapor y engranajes", "Neón arcade", "Escarcha eterna", "Especia de Arrakis",
            "Grimorio arcano", "Estación orbital", "Aliento de dragón", "Pinball real", "Leyenda celestial",
        ],
        // The Mastery Toast's extra line, naming the frames its Collection
        // Tier unlocks (more than one when a Play raised it by several tiers).
        toastLine: (names) => `${names.length === 1 ? "Nuevo marco" : "Nuevos marcos"}: ${names.join(", ")}`,
        toastHeader: "Marco festivo",
        holidays: {
            newYear: { name: "Año Nuevo", condition: "Una partida el 1 de enero" },
            chineseNewYear: { name: "Año Nuevo chino", condition: "Una partida en el Año Nuevo chino, entre el 21 de enero y el 20 de febrero" },
            valentine: { name: "San Valentín", condition: "Una partida el 14 de febrero" },
            mardiGras: { name: "Martes de Carnaval", condition: "Una partida el Martes de Carnaval, 47 días antes de Pascua" },
            stPatrick: { name: "San Patricio", condition: "Una partida el 17 de marzo" },
            easter: { name: "Pascua", condition: "Una partida el Domingo de Pascua" },
            musicDay: { name: "Fiesta de la Música", condition: "Una partida el 21 de junio" },
            halloween: { name: "Halloween", condition: "Una partida el 31 de octubre" },
            deadDay: { name: "Día de los Muertos", condition: "Una partida el 1 o el 2 de noviembre" },
            thanksgiving: { name: "Acción de Gracias", condition: "Una partida en Acción de Gracias, el cuarto jueves de noviembre" },
            christmas: { name: "Navidad", condition: "Una partida el 24 o el 25 de diciembre" },
        },
        // The Reward Prompt, after a Profile's first frame: the frame's name,
        // then the main menu entry and the Profile Stats button to equip it from.
        prompt: {
            title: "Nuevo marco de avatar",
            message: (name, menuEntry, button) => `¡Has ganado el marco de avatar "${name}"! Póntelo desde "${menuEntry}" y luego "${button}".`,
            goEquip: "Ponérmelo",
            gotIt: "Vale",
        },
    },
    playerLevel: {
        toastHeader: "Nuevo nivel",
        toastTitle: (level) => `Nivel ${level}`,
        toastDescription: "Tus logros te han llevado a un nuevo nivel.",
    },
    highScores: {
        toastHeader: "Mejor puntuación",
        toastTitle: (table, place) => `Mejor puntuación en ${table}: ${place}.º puesto`,
        tableRecordTitle: (table) => `¡Récord de mesa en ${table}!`,
        toastScore: (score) => `${score} puntos`,
        takenFrom: (profile) => `arrebatado a ${profile}`,
        // The High Score Board.
        board: {
            menuEntry: "Mejores puntuaciones",
            record: "Récord",
            // In place of a place's owner when it belongs to no Profile.
            defaultScore: "Por defecto",
            // In place of the initials when none were typed.
            noInitials: "\u2014",
            noScore: "Aún sin puntuación",
            // While PINemHi reads the board, as a message or a note over the last known one.
            reading: "Leyendo\u2026",
            // Over the last known board when the fresh read failed.
            notRefreshed: "No se pudieron actualizar estas puntuaciones",
            notSupported: "Las puntuaciones de esta mesa no son compatibles",
            // A table without a ROM whose VPReg.stg section or text file is not learned yet.
            notLearned: "Juega una partida para ver las puntuaciones de esta mesa",
        },
    },

    // The language names stay each in its own language.
    expansionPackSettings: {
        menuEntry: "Ajustes del pack",
        on: "Sí",
        off: "No",
        addOnLine: (name, state) => `${name}: ${state}`,
        languageLine: (languageName) => `Idioma: ${languageName}`,
        startupScreenLine: (screenName) => `Pantalla de inicio: ${screenName}`,
        startupScreenNames: { welcome: "Bienvenida", profilePicker: "Selector de perfil", wheel: "Rueda" },
        offlineMode: "Modo sin conexión",
        updateCheckLine: (state) => `Buscar actualizaciones del pack: ${state}`,
        offerVpxtoolLine: (state) => `Ofrecer vpxtool: ${state}`,
        updateTo: (version) => `Actualizar a v${version}`,
        installVpxtool: (version) => `Instalar vpxtool v${version}`,
        updateVpxtool: (installed, version) => `Actualizar vpxtool (v${installed} → v${version})`,
        vpxtoolUpToDateLine: "Actualizar vpxtool",
        vpxtoolUpToDate: (installed) => `vpxtool v${installed} está al día`,
        back: "Volver",
        groups: {
            playersAndProgress: "Jugadores y progreso",
            wheelScreen: "La rueda",
            menusAndFilters: "Menús y filtros",
            launchingAndPlaying: "Lanzar y jugar una mesa",
            debugging: "Depuración",
        },
        onRestart: (state) => `${state} (al reiniciar)`,
        whenOnLabel: "Sí:",
        whenOffLabel: "No:",
        save: "Guardar",
        cancel: "Cancelar",
        notSaved: "Ajuste no guardado",
        ok: "OK",
        restartQuestion: "Los ajustes guardados se aplican al reiniciar PinballY.",
        restartNow: "Reiniciar ya",
        later: "Más tarde",
        restartFailedTitle: "No se puede reiniciar",
        restartFailed: "Los ajustes se aplicarán en el próximo inicio.",
        addOns: {
            profilePicker: {
                name: "Selector de perfil",
                whenOn: "Cambiar de jugador en el menú principal, para elegir quién juega.",
                whenOff: "Todos juegan como Invitado; sin avatar ni saludo en la pantalla de bienvenida.",
            },
            startupChoicePrompt: {
                name: "Bienvenida",
                whenOn: "Al iniciar y tras Cambiar de jugador: elegir una mesa para jugar, o cambiar de jugador.",
                whenOff: "El selector de perfil solo saluda al jugador.",
            },
            achievements: {
                name: "Logros",
                whenOn: "Logros conseguidos al jugar, cada uno anunciado con un aviso.",
                whenOff: "Sin nivel de jugador.",
            },
            sessionStatsTracker: {
                name: "Sesiones",
                whenOn: "Cuenta cada sesión, para los logros de sesión.",
                whenOff: "Sin logros de sesión.",
            },
            challenges: {
                name: "Retos",
                whenOn: "Un reto cada semana, bajo la insignia del perfil.",
                whenOff: "Sin logros ni estadísticas de retos.",
            },
            tableMastery: {
                name: "Maestría de mesa",
                whenOn: "Un nivel de maestría en cada mesa, para cada jugador.",
                whenOff: "Sin rangos de colección ni sus marcos de avatar.",
            },
            highScores: {
                name: "Puntuaciones",
                whenOn: "Cada nueva mejor puntuación se atribuye al jugador que la hizo.",
                whenOff: "Sin logros de mejores puntuaciones ni récords de mesa; vuelven las mejores puntuaciones propias de PinballY.",
            },
            statusLineInfo: {
                name: "Línea de estado",
                whenOn: "El año, el fabricante, las partidas y el tiempo de juego de la mesa en la línea de estado.",
                whenOff: "No cambia nada más.",
            },
            clock: {
                name: "Reloj",
                whenOn: "La hora arriba a la izquierda de la pantalla.",
                whenOff: "No cambia nada más.",
            },
            statusIcons: {
                name: "Iconos de estado",
                whenOn: "Junto al reloj, una flecha dorada mientras espera una actualización del pack, una flecha tachada mientras la búsqueda de actualizaciones está desactivada.",
                whenOff: "No cambia nada más.",
            },
            wheelArc: {
                name: "Arco dorado",
                whenOn: "Un arco dorado bajo la rueda, salvo si usas tu propio fondo.",
                whenOff: "No cambia nada más.",
            },
            uiTranslation: {
                name: "Traducción de PinballY",
                whenOn: "Los menús y mensajes de PinballY en el idioma del pack.",
                whenOff: "No cambia nada más.",
            },
            drawnMenus: {
                name: "Menús dibujados",
                whenOn: "Los menús de PinballY dibujados al estilo del pack.",
                whenOff: "Vuelven los menús sencillos de PinballY, salvo para estos ajustes.",
            },
            customMenuCommands: {
                name: "Comandos de menú",
                whenOn: "Configuración de la mesa en el menú principal.",
                whenOff: "No cambia nada más.",
            },
            randomGame: {
                name: "Mesa al azar",
                whenOn: "Lanzar una mesa al azar desde el menú principal, bajo Jugar.",
                whenOff: "La mesa al azar sigue en la bienvenida; con ella también desactivada, sin logros de partidas al azar.",
            },
            hallOfFame: {
                name: "Hall of Fame",
                whenOn: "Un filtro con tus diez mesas más jugadas.",
                whenOff: "Sin el botón Mesas más jugadas en Mi perfil.",
            },
            tablesToDiscover: {
                name: "Mesas por descubrir",
                whenOn: "Un filtro con las mesas que nunca has jugado.",
                whenOff: "Sin el botón Mesas por descubrir en Mi perfil.",
            },
            hiddenTables: {
                name: "Mesas ocultas",
                whenOn: "Un filtro con las mesas ocultas.",
                whenOff: "No cambia nada más.",
            },
            customFilter: {
                name: "Mesas originales",
                whenOn: "Un filtro Mesas originales, en Filtrar por fabricante.",
                whenOff: "No cambia nada más.",
            },
            menuCleanup: {
                name: "Menús limpios",
                whenOn: "Menús más cortos, sin entradas poco usadas como Ayuda, Acerca de o Cartel.",
                whenOff: "No cambia nada más.",
            },
            forceBackglass: {
                name: "Backglass",
                whenOn: "El backglass se muestra al iniciar y se oculta durante la partida.",
                whenOff: "No cambia nada más.",
            },
            backglassClock: {
                name: "Reloj del backglass",
                whenOn: "La hora en un pequeño recuadro en la pantalla del backglass durante la partida.",
                whenOff: "No cambia nada más.",
            },
            discordRichPresence: {
                name: "Discord Rich Presence",
                whenOn: "Tu cuenta de Discord muestra públicamente la mesa jugada y desde cuándo; abre Discord antes que PinballY.",
                whenOff: "No cambia nada más.",
            },
            seamlessLaunchOverlay: {
                name: "Pantalla de carga",
                whenOn: "Sin destello negro mientras carga una mesa.",
                whenOff: "No cambia nada más.",
            },
            playLaunchSound: {
                name: "Sonido al lanzar",
                whenOn: "Un sonido al lanzar una mesa.",
                whenOff: "No cambia nada más.",
            },
            ratingPrompt: {
                name: "Valoración",
                whenOn: "Te pide valorar una mesa tras un rato jugándola.",
                whenOff: "No cambia nada más.",
            },
            tableRoms: {
                name: "ROM de mesas",
                whenOn: "Encuentra sola la ROM de cada mesa (requiere vpxtool).",
                whenOff: "No cambia nada más.",
            },
            launchEventsTrace: {
                name: "Traza de lanzamiento",
                whenOn: "Registra los eventos de lanzamiento, para diagnosticar problemas (con LOG_LAUNCH_EVENTS=true).",
                whenOff: "No cambia nada más.",
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
        promptTitle: "Actualización disponible",
        prompt: (version) => `eXpansion Pack v${version} está disponible.`,
        updateNow: "Actualizar ya",
        later: "Más tarde",
        updateFailedTitle: "No se puede actualizar",
        updateFailed: "El eXpansion Pack se queda como está.",
        // Under the Loader while the Pack Update helper gets ready.
        downloadingUpdate: "Descargando la actualización…",
        ok: "OK",
        updatedTitle: "Actualización completada",
        updated: (version) => `eXpansion Pack actualizado a v${version}`,
        toastTitle: "eXpansion Pack",
    },
    scriptReader: {
        dialogTitle: (version) => `vpxtool v${version}`,
        dialog: "vpxtool lee el script de cada mesa para que su ROM se rellene sola. Escrito por Francis De Brabandere, con licencia Apache-2.0, descargado de github.com/francisdb/vpxtool.",
        install: "Instalar",
        noThanks: "No, gracias",
        later: "También puedes instalarlo más tarde desde los Ajustes del pack, o a mano.",
        downloading: "Descargando…",
        ok: "OK",
        installedTitle: "vpxtool instalado",
        installed: (version) => `vpxtool v${version} está instalado: la ROM de cada mesa ahora se rellena sola.`,
        failedTitle: "Instalación imposible",
        failed: "No se pudo instalar vpxtool; nada ha cambiado. Puedes volver a intentarlo desde los Ajustes del pack.",
        updateTitle: (installed, version) => `vpxtool v${installed} → v${version}`,
        update: "Actualizar",
        updateLater: "También puedes actualizarlo más tarde desde los Ajustes del pack, o a mano.",
        updatedTitle: "vpxtool actualizado",
        updated: (version) => `vpxtool está actualizado a la v${version}.`,
        updateFailedTitle: "Actualización imposible",
        updateFailed: "No se pudo actualizar vpxtool; nada ha cambiado. Puedes volver a intentarlo desde los Ajustes del pack.",
    },
    errorToast: {
        header: "Problema",
        playNotSaved: "No se pudo guardar esta partida: no contará en tus estadísticas.",
        playNotInPlayLog: "Esta partida se contó, pero falta en tu historial de partidas.",
        packUpdateFailed: (version, logPath) => `La actualización a v${version} ha fallado: la versión anterior sigue en su sitio. Detalles en ${logPath}`,
    },
    releaseHighlights: {
        "1.1.0": [
            "Lanza una mesa al azar directamente desde el menú principal.",
            "Durante una partida, la hora aparece ahora en la pantalla del backglass.",
        ],
        "1.0.0": [
            "Versión 1.0: la primera versión pública del eXpansion Pack.",
            "Los menús y los mensajes se leen mejor y caben en la pantalla desde el primer segundo.",
            "Tras cada actualización, este mensaje te muestra ahora las novedades.",
        ],
    },
};

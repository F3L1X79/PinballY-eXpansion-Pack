// ============================================================
// Portuguese translations for PinballY's UI.
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
        "About PinballY": "Sobre o PinballY",
        "Add Media": "Adicionar mídia",
        "Add to Favorites": "Adicionar aos favoritos",
        "Adjust Audio Volume": "Ajustar volume do áudio",
        "All Games": "Todas as mesas",
        "All Tables": "Todas as mesas",
        "Batch Capture": "Captura em lote",
        "Batch Capture lets you capture screen shot images and videos for multiple games.  Step 1: select which games to include in the capture process:": "A captura em lote permite capturar capturas de tela e vídeos para várias mesas. Etapa 1: selecione as mesas a incluir no processo de captura:",
        "Begin Capture": "Iniciar captura",
        "Cancel": "Cancelar",
        "Capture images & videos": "Capturar imagens e vídeos",
        "Confirm Power Off": "Confirmar desligamento",
        "Delete game details": "Excluir detalhes da mesa",
        "Edit category names...": "Editar nomes das categorias...",
        "Edit game details...": "Editar detalhes da mesa...",
        "Enable Videos": "Ativar vídeos",
        "Exit": "Sair",
        "Exit PinballY": "Sair do PinballY",
        "Favorites": "Favoritos",
        "Filter by Category": "Filtrar por categoria",
        "Filter by Date Added": "Filtrar por data de adição",
        "Filter by Era": "Filtrar por época",
        "Filter by Last Played": "Filtrar pela última partida",
        "Filter by Manufacturer": "Filtrar por fabricante",
        "Filter by Rating": "Filtrar por avaliação",
        "Filter by System": "Filtrar por sistema",
        "Find game media online": "Procurar mídias online",
        "Games marked for batch capture": "Mesas marcadas para captura em lote",
        "Game Setup": "Configuração da mesa",
        "Help": "Ajuda",
        "Hide this game": "Ocultar esta mesa",
        "High Scores": "Melhores pontuações",
        "In Favorites": "Nos favoritos",
        "Information": "Informações",
        "Instruction Card": "Cartão de instruções",
        "Mark for Batch Capture": "Marcar para captura em lote",
        "Marked for Batch Capture": "Marcada para captura em lote",
        "Mute Attract Mode": "Silenciar o modo de atração",
        "Mute Buttons": "Silenciar os botões",
        "Mute Table Audio": "Silenciar o áudio da mesa",
        "Mute Videos": "Silenciar os vídeos",
        "Operator Menu": "Menu do operador",
        "Options": "Opções",
        "PinballY Options...": "Opções...",
        "Play": "Jogar",
        "Play Game": "Iniciar partida",
        "Power Off": "Desligar o computador",
        "Proceed": "Continuar",
        "Rate Table": "Avaliar a mesa",
        "Reset Coins/Credits": "Redefinir moedas/créditos",
        "Resume Game": "Retomar partida",
        "Return": "Voltar",
        "Save": "Salvar",
        "Search": "Pesquisar",
        "Select categories": "Selecionar categorias",
        "Show Hidden Games": "Mostrar mesas ocultas",
        "Show Media Files": "Mostrar arquivos de mídia",
        "Show Unconfigured Games": "Mostrar mesas não configuradas",
        "Skip this message next time": "Não mostrar esta mensagem novamente",
        "Terminate Game": "Encerrar partida",
        "The capture process records the exact same areas of the screen where your PinballY windows are located.  Before proceeding, make sure that your PinballY window layout matches the screen layout of the game you're about to record.  For example, if the game's playfield is full-screen, make sure PinballY's playfield window is full-screen.": "O processo de captura grava exatamente as mesmas áreas da tela onde as janelas do PinballY estão localizadas. Antes de continuar, certifique-se de que a disposição das janelas do PinballY corresponda à disposição da tela do jogo que você está prestes a gravar. Por exemplo, se o campo de jogo estiver em tela cheia, certifique-se de que a janela do campo de jogo do PinballY também esteja em tela cheia.",
        "This will launch a Web browser window to search for media files for this game.  Look for a \"HyperPin Media Pack\" file.  Download the file and drag it onto this window to install it.\n\nNote that you can drop a Media Pack file onto this window at any time to install media for the currently selected game.  This menu step isn't required to install media; it's just a convenience for launching a Web search.": "Isso abrirá uma janela do navegador da Web para procurar arquivos de mídia para esta mesa. Procure um arquivo \"HyperPin Media Pack\". Baixe o arquivo e arraste-o para esta janela para instalá-lo.\n\nObserve que você pode soltar um arquivo Media Pack nesta janela a qualquer momento para instalar mídias para a mesa atualmente selecionada. Esta etapa do menu não é necessária para instalar mídias; ela serve apenas como uma maneira prática de iniciar uma pesquisa na Web.",
        "Uncategorized": "Sem categoria",
        "Yes, add to current game": "Sim, adicionar à mesa atual",
        "You must enter the game's bibliographic information (title, system, etc.) before adding media files for the game.  The game information is used to determine the folder locations and file names for the game's media files, so it has to be entered before media files can be added to the game.": "Você deve inserir as informações bibliográficas da mesa (título, sistema, etc.) antes de adicionar arquivos de mídia para a mesa. Essas informações são usadas para determinar os locais das pastas e os nomes de arquivo das mídias da mesa, portanto, elas precisam ser inseridas antes que os arquivos de mídia possam ser adicionados.",
        "Flyer": "Cartaz",
        "Pinscape Night Mode": "Modo noturno do Pinscape",
        "Hidden Tables": "Mesas ocultas",
        "Unconfigured Tables": "Mesas não configuradas",
        "Tables played within:": "Mesas jogadas há menos de:",
        "Tables not played within:": "Mesas não jogadas há:",
        "Tables added within:": "Mesas adicionadas há menos de:",
        "Tables added more than:": "Mesas adicionadas há mais de:",
        "A week": "Uma semana",
        "A month": "Um mês",
        "A year": "Um ano",
        "A week ago": "Uma semana",
        "A month ago": "Um mês",
        "A year ago": "Um ano",
        "Never played": "Nunca jogadas",
        "Batch Capture Step 2: Select the media types you'd like to capture for the selected games.  (You'll be able to say what to do about existing files in the next step.)": "Captura em lote, passo 2: selecione os tipos de mídia que deseja capturar para as mesas escolhidas. (No próximo passo, você poderá indicar o que fazer com os arquivos existentes.)",
        "Batch Capture Step 3: For each type, indicate if you'd like to capture the item for EVERY game, even for games that already have existing media of the same type, or if you'd only like to capture missing items.": "Captura em lote, passo 3: para cada tipo, indique se deseja capturá-lo para TODAS as mesas, mesmo as que já têm uma mídia desse tipo, ou somente para as que não a têm.",
        "Next Step": "Próximo passo",
        "Missing only": "Somente os ausentes",
        "Capture all": "Capturar tudo",
        "View Capture List": "Ver lista de captura",
        "Please select the system to use to launch this table:": "Selecione o sistema para iniciar esta mesa:",
        "Yes, run as Admin": "Sim, executar como administrador",
        "No, cancel": "Não, cancelar",
        "Allow (this session only)": "Permitir (somente nesta sessão)",
        "Allow (always)": "Permitir (sempre)",
        "Yes, delete it": "Sim, excluir",
    },

    // Labels for the media-capture screen's "Item: Action" lines
    // (e.g. "Playfield Image: Skip"), combined via dynamicLabelBuilders.captureItemAction.
    mediaCaptureItemLabels: {
        "Backglass Image": "Imagem do backglass",
        "Backglass Video": "Vídeo do backglass",
        "Flyer Image": "Imagem do cartaz",
        "Instruction Card": "Cartão de instruções",
        "Playfield Image": "Imagem do campo de jogo",
        "Playfield Video": "Vídeo do campo de jogo",
        "Table Audio": "Áudio da mesa",
        "Wheel Image": "Imagem da roleta",
        "DMD Image": "Imagem do DMD",
        "DMD Video": "Vídeo do DMD",
        "Topper Image": "Imagem do topper",
        "Topper Video": "Vídeo do topper",
        "Launch Audio": "Áudio de inicialização",
        "Real DMD Image": "Imagem do DMD real",
        "Real DMD Video": "Vídeo do DMD real",
        "Real RGB DMD Image": "Imagem do DMD RGB real",
        "Real RGB DMD Video": "Vídeo do DMD RGB real",
    },
    mediaCaptureActionLabels: {
        "Add": "Adicionar",
        "Capture": "Capturar",
        "Capture Silent": "Capturar sem som",
        "Capture w/Audio": "Capturar com áudio",
        "Keep Existing": "Manter o existente",
        "Replace Existing": "Substituir o existente",
        "Skip": "Ignorar",
    },

    // Status text shown in PinballY's launch overlay, keyed by the
    // language-independent event id (see the "launchoverlaymessage" event).
    launchOverlayMessages: {
        "after": "",
        "capturing": "Capturando...",
        "gameover": "Game Over",
        "init": "",
        "launching": "Carregando...",
        "running": "Iniciando a mesa...",
        "terminating": "Voltando para a lista de jogos...",
    },

    // The step under way, written in gold beneath the Loader while a
    // table launches or closes (Seamless Launch Overlay).
    launchSteps: {
        loading: "Carregando…",
        closing: "Voltando às mesas…",
        capturing: "Capturando…",
    },

    // Functions that build translated titles for PinballY's dynamically
    // generated menu text (category names, star ratings, etc.).
    dynamicLabelBuilders: {
        captureInstructions: (seconds) => {
            const plural = seconds === "1" ? "" : "s";
            return `Selecione os elementos a serem capturados e clique em Iniciar captura. Isso iniciará o jogo, capturará as imagens da tela e encerrará automaticamente o jogo quando terminar. O processo levará aproximadamente ${seconds} segundo${plural}. (!) significa que um elemento existente será substituído.`;
        },
        captureInstructionsOneMinute: () =>
            "Selecione os elementos a serem capturados e clique em Iniciar captura. Isso iniciará o jogo, capturará as imagens da tela e encerrará automaticamente o jogo quando terminar. O processo levará aproximadamente 1 minuto. (!) significa que um elemento existente será substituído.",
        captureItemAction: (item, action) => `${item}: ${action}`,
        decadeTables: (decade) => `Mesas dos anos ${decade}`,
        genericTables: (name) => `Mesas ${name}`,
        mediaGameMismatchWarning: (draggedGame, currentGame) =>
            `Parece que alguns dos arquivos de mídia que você está adicionando podem ser destinados a uma mesa diferente, "${draggedGame}". Os arquivos de mídia são sempre adicionados à mesa selecionada na roleta, atualmente "${currentGame}". Deseja adicionar esses itens de mídia à mesa atual?`,
        mediaGameMismatchWarningMultiple: (gameList, currentGame) =>
            `Parece que alguns dos arquivos de mídia que você está adicionando podem ser destinados a outras mesas: ${gameList}. Os arquivos de mídia são sempre adicionados à mesa selecionada na roleta, atualmente "${currentGame}". Deseja adicionar esses itens de mídia à mesa atual?`,
        mediaReadyToAdd: (gameName) =>
            `Os seguintes itens de mídia estão prontos para serem adicionados a ${gameName}. Selecione os itens que deseja adicionar ou substituir.`,
        starTables: (count) => `Mesas com ${count} estrela${count > 1 ? "s" : ""}`,
        startDelay: (seconds) => `Ajustar atraso de inicialização (${seconds} s)`,
        unratedTables: () => "Mesas sem avaliação",
        batchCaptureReady: (count, duration) => `A captura em lote está pronta! ${count} mesa(s) serão incluídas neste processo, que levará cerca de ${duration}.`,
        confirmDeleteGameDetails: (title) => `Deseja realmente excluir os detalhes da mesa ${title}? (Somente as informações bibliográficas são excluídas, não os arquivos da mesa nem suas mídias.)`,
        showCustomView: (name) => `Mostrar ${name}`,
        durationSeconds: (count) => `${count} segundo${count === 1 ? "" : "s"}`,
        durationMinutes: (count) => `${count} minuto${count === 1 ? "" : "s"}`,
        durationHours: (hours, minutes) => (minutes > 0 ? `${hours} h ${minutes} min` : `${hours} hora${hours === 1 ? "" : "s"}`),
    },

    ratingPrompt: {
        title: "Avaliar esta mesa",
        message: (tableTitle, minutes) =>
            `Você jogou "${tableTitle}" por mais de ${minutes} minutos! Deseja avaliá-la agora?`,
        rateNow: "Avaliar agora",
        notNow: "Mais tarde",
    },

    // The Button Hints at the foot of every drawn screen and the Exit
    // Button's tooltip (see GLOSSARY.md). The key caps and the footer's
    // words are shown in capitals.
    buttonHints: {
        // PinballY's button names, as on the cabinet's key caps.
        keyCaps: { next: "Next", prev: "Prev", select: "Select", exit: "Exit" },
        browse: "Navegar",
        // The flippers on a High Score Board longer than the window.
        scroll: "Rolar",
        choose: "Escolher",
        // Exit's word and the Exit Button's tooltip: Back where Exit brings
        // back a screen or a menu, Close where it leaves the bare wheel.
        back: "Voltar",
        close: "Fechar",
    },

    welcomeScreen: {
        greetings: { morning: "Bom dia", afternoon: "Boa tarde", evening: "Boa noite", night: "Ainda por aqui" },
        greetingWithName: (greeting, name) => [`${greeting}, `, name, "!"],
        greetingAlone: (greeting) => `${greeting}!`,
        stayOn: (tableTitle) => `Ficar em ${tableTitle}`,
        stayOnWheel: "Ficar na roleta",
        randomTable: "Iniciar uma mesa aleatória",
        menuEntry: "Boas-vindas",
        // The active Profile's Daily Streak under the greeting, from 2 days
        // on, its count shown in a square before the text.
        cabinetStreak: {
            notYetToday: "dias seguidos na máquina: continue assim!",
            playedToday: "dias seguidos na máquina",
        },
        lostRecord: (taker, tableTitle) => `${taker} tirou seu recorde em ${tableTitle}`,
        lostRecords: (records, moreCount) => {
            const named = records.map(record => `${record.tableTitle} (${record.taker})`);
            return moreCount > 0
                ? `Recordes perdidos: ${named.join(", ")} e mais ${moreCount}`
                : `Recordes perdidos: ${named.slice(0, -1).join(", ")} e ${named[named.length - 1]}`;
        },
        // One card per Period Table; its grey line says it was played this
        // Period, or else the Streak of the daily or weekly rendezvous, its
        // count shown in a square before the text.
        periodCards: {
            day: {
                period: "MESA DO DIA",
                played: "Jogada hoje",
                streak: "dias seguidos na mesa do dia: continue assim!",
            },
            week: {
                period: "MESA DA SEMANA",
                played: "Jogada esta semana",
                streak: "semanas seguidas na mesa da semana: continue assim!",
            },
            challenge: {
                period: "UMA MESA DO DESAFIO",
                progress: (title, value, target) => `${title} · ${value}/${target}`,
                lastStep: "Mais uma partida para concluir o desafio!",
            },
            go: "Ir",
        },
    },

    // Lower status line text for the currently selected table.
    // [Filter.Count], [Game.Year], etc. are PinballY placeholders — keep them as-is.
    tableInfoStatusLines: {
        manufacturer: (position) => `Mesa ${position}/[Filter.Count] - fabricada por [Game.Manuf].`,
        manufacturerFictional: (position) => `Mesa ${position}/[Filter.Count] - Fliperama fictício.`,
        playCount: (position, count) => `Mesa ${position}/[Filter.Count] - iniciada ${count} vezes.`,
        playTime: (position, hours, minutes) => `Mesa ${position}/[Filter.Count] - jogada por ${formatPlayTime(hours, minutes)}.`,
        year: (position) => `Mesa ${position}/[Filter.Count] - lançada em [Game.Year].`,
    },

    // Upper status line messages, after the player's own from PinballY's options.
    // [Filter.Count] is a PinballY placeholder — keep it as-is.
    upperStatusLines: {
        welcome: name => `Boas-vindas, ${name}!`,
        tablesAvailable: "[Filter.Count] mesas disponíveis!",
        launchHint: "Botão de lançamento para iniciar uma mesa.",
        browseHint: "Flippers esquerdo/direito para passar as mesas.",
        signOff: "Divirta-se!",
    },

    // Labels for menu items this project adds itself (see custom_menu_commands.js, random_game.js, custom_filter.js, hall_of_fame.js and tables_to_discover.js).
    customMenuLabels: {
        challengeTables: "Mesas do desafio",
        hallOfFameFilter: "Hall of Fame",
        myHighScoresFilter: "Minhas pontuações",
        hiddenTablesFilter: "Mesas ocultas",
        tablesToDiscoverFilter: "Mesas a descobrir",
        originalTablesFilter: "Mesas originais",
        tableSetup: "Configuração da mesa",
        // The Random Game's main menu entry, worded as welcomeScreen.randomTable.
        randomTable: "Iniciar uma mesa aleatória",
        tableScores: "Pontuações",
        filterPickerBack: "Voltar",
        activeFilter: (name) => `Filtro ativo: ${name}`,
        // The Drawn main menu's "Change Filter" entry, and its footer's label before the Active Filter.
        changeFilter: "Trocar filtro",
        activeFilterLabel: "Filtro ativo:",
    },

    achievements: {
        dailyFirstPlayTitle: () => "Olá, mesa do dia!",
        dailyFirstPlayDescription: () => "Iniciar a mesa do dia pela primeira vez.",
        weeklyFirstPlayTitle: () => "Encontro semanal",
        weeklyFirstPlayDescription: () => "Iniciar a mesa da semana pela primeira vez.",
        dailyPeriodsPlayedTitles: {
            10: "Explorador de domingo",
            25: "Explorador curioso",
            50: "Explorador experiente",
            100: "Indiana Flippers",
        },
        dailyPeriodsPlayedDescription: (days) => `Iniciar a mesa do dia em ${days} dias diferentes.`,
        weeklyPeriodsPlayedTitles: {
            4: "Um mês de encontros",
            10: "Frequentador da semana",
            26: "Seis meses de fidelidade",
            52: "Um ano sem uma ruga",
        },
        weeklyPeriodsPlayedDescription: (weeks) => `Iniciar a mesa da semana em ${weeks} semanas diferentes.`,
        dailyStreakTitles: {
            3: "Não há dois sem três",
            7: "Semana perfeita",
            14: "Quinzena de ferro",
            30: "Monge do pinball",
        },
        dailyStreakDescription: (days) => `Iniciar a mesa do dia ${days} dias seguidos.`,
        weeklyStreakTitles: {
            4: "Um mês sem falhas",
            12: "Assinante fiel",
        },
        weeklyStreakDescription: (weeks) => `Iniciar a mesa da semana ${weeks} semanas seguidas.`,
        manufacturerCompletionTitle: (manufacturer) => `Fã absoluto de ${manufacturer}`,
        manufacturerCompletionDescription: (manufacturer, count) => `Jogar pelo menos uma vez as ${count} mesas da ${manufacturer}.`,
        firstTableTitle: () => "Primeiros passos",
        firstTableDescription: () => "Jogar sua primeiríssima mesa.",
        collectionPercentTitles: {
            10: "O gosto do metal",
            25: "Colecionador iniciante",
            50: "Meio tempo",
            75: "Quase tudo visto",
            100: "Nada me escapa",
        },
        collectionPercentDescription: (percent, playedCount, totalCount) => `Jogar ${playedCount} de ${totalCount} mesas (${percent}% da sua coleção).`,
        worldTourTitle: () => "Volta ao mundo",
        worldTourDescription: () => "Percorrer todas as mesas da roda de uma só vez, sem iniciar nenhuma.",
        playTimeMilestoneTitles: {
            1: "Aquecimento",
            5: "A coisa ficou séria",
            10: "Viciado em pinball",
            50: "Pinball no sangue",
            100: "Lenda do tilt",
        },
        playTimeMilestoneDescription: (hours) => `Acumular mais de ${hours} hora${hours > 1 ? "s" : ""} de jogo.`,
        decadeCompletionTitle: (decadeStartYear) => `Viagem aos anos ${decadeStartYear}`,
        decadeCompletionDescription: (decadeStartYear, count) => `Jogar pelo menos uma vez as ${count} mesas dos anos ${decadeStartYear}.`,
        categoryCompletionTitle: (category) => `Mestre em ${category}`,
        categoryCompletionDescription: (category, count) => `Jogar pelo menos uma vez as ${count} mesas "${category}".`,
        marathonTitles: {
            30: "Pequena maratona",
            60: "Maratonista",
        },
        marathonDescription: (minutes) => `Jogar uma única sessão de mais de ${minutes} minutos.`,
        cabinetStreakTitles: {
            3: "Tomei gosto",
            7: "Uma semana na máquina",
            15: "Cliente da casa",
            30: "Parte da mobília",
        },
        cabinetStreakDescription: (days) => `Jogar na máquina ${days} dias seguidos, em qualquer mesa.`,
        rageQuitTitle: () => "Desistência por raiva?!",
        rageQuitDescription: (minSeconds, maxSeconds) => `Sair de uma mesa após apenas ${minSeconds} a ${maxSeconds} segundos...`,
        grandReturnTitle: () => "O grande retorno",
        grandReturnDescription: (days) => `Voltar a jogar uma mesa depois de ${days} dias ou mais.`,
        // A Secret Achievement's hint, shown instead of its description while it is missing.
        rageQuitHint: () => "Há dias em que uma mesa simplesmente não colabora...",
        grandReturnHint: () => "Velhos amigos sempre ficam felizes com um reencontro...",
        worldTourHint: () => "Algumas viagens se fazem sem nunca apertar Start...",
        nightOwlTitle: () => "Coruja da noite",
        nightOwlDescription: (from, to) => `Iniciar uma partida entre ${from} e ${to}.`,
        nightOwlHint: () => "O pinball nunca dorme...",
        fullMoonNightTitle: () => "Noite de lua cheia",
        fullMoonNightDescription: (from, to, percent) => `Iniciar uma partida entre ${from} e ${to} com a lua pelo menos ${percent}% iluminada.`,
        fullMoonNightHint: () => "Em certas noites, até os lobisomens jogam pinball...",
        fridayThe13thTitle: () => "Sexta-feira 13",
        fridayThe13thDescription: () => "Iniciar uma partida numa sexta-feira 13.",
        fridayThe13thHint: () => "Em certos dias, melhor não passar debaixo de uma escada...",
        lunchBreakTitle: () => "Hora do almoço",
        lunchBreakDescription: (from, to) => `Iniciar uma partida entre ${from} e ${to}, de segunda a sexta.`,
        lunchBreakHint: () => "O sanduíche numa mão, o flipper na outra...",
        mirrorHourTitle: () => "Hora espelhada",
        mirrorHourDescription: () => "Iniciar uma partida num horário em que as horas e os minutos são iguais, como 11:11.",
        mirrorHourHint: () => "Faça um pedido...",
        fourSeasonsTitle: () => "Quatro estações",
        fourSeasonsDescription: (count) => `Jogar pelo menos uma vez em cada uma das ${count} estações.`,
        fourSeasonsHint: () => "Pinball é o ano inteiro...",
        oneMoreGameTitle: () => "Só mais uma!",
        oneMoreGameDescription: (count) => `Jogar a mesma mesa ${count} vezes seguidas.`,
        oneMoreGameHint: () => "Quem ama não conta...",
        timeTravelTitle: () => "Viagem no tempo",
        timeTravelDescription: (count) => `Jogar ${count} partidas seguidas, cada uma numa mesa de uma década mais antiga que a anterior.`,
        timeTravelHint: () => "E se voltássemos no tempo...",
        snackTimeTitle: () => "Hora do lanche",
        snackTimeDescription: () => "Iniciar uma partida entre 16h e 17h.",
        snackTimeHint: () => "Só uma partida antes da lição de casa...",
        wednesdayOffTitle: () => "Quarta-feira livre",
        wednesdayOffDescription: () => "Iniciar uma partida numa quarta-feira à tarde.",
        wednesdayOffHint: () => "Sem aula hoje à tarde...",
        grownUpRecordTakenTitle: () => "Mais forte que os adultos",
        grownUpRecordTakenDescription: () => "Tirar um recorde da mesa de um adulto.",
        randomGamesTitles: {
            10: "E por que não?",
            25: "Cara ou coroa",
            50: "Jogador de dados",
            100: "Eu adoooooro o acaso",
        },
        randomGamesDescription: (count) => `Jogar ${count} mesas aleatórias.`,
        challengesCompletedTitles: {
            1: "Primeiro desafio",
            5: "Amante de desafios",
            10: "Buscador de desafios",
            25: "Caçador de desafios",
            50: "Mestre dos desafios",
            100: "Lenda da semana",
        },
        challengesCompletedDescription: (count) => (count === 1 ? "Concluir um desafio." : `Concluir ${count} desafios.`),
        highScoreTablesTitles: {
            1: "Iniciais na pedra",
            3: "Três estandartes erguidos",
            5: "Senhor dos cinco placares",
            10: "O Kwisatz Hiscorach",
        },
        highScoreTablesDescription: (count) => (count === 1 ? "Obter uma melhor pontuação numa mesa." : `Obter melhores pontuações em ${count} mesas diferentes.`),
        tableRecordTablesTitles: {
            1: "Um recorde para a todos governar",
            3: "Senhor da guerra de três mundos",
        },
        tableRecordTablesDescription: (count) => (count === 1 ? "Estabelecer um recorde da mesa." : `Estabelecer recordes da mesa em ${count} mesas diferentes.`),
        tableRecordTakenTitle: "O usurpador",
        tableRecordTakenDescription: "Tirar um recorde da mesa de outro perfil.",
        dayManufacturersTitles: {
            3: "Volta ao mundo expressa",
            5: "Borboleta do pinball",
            8: "Infiel em série",
            10: "Casanova do pinball",
        },
        dayManufacturersDescription: (count) => `Jogar mesas de ${count} fabricantes diferentes no mesmo dia.`,
        // Header of the Achievement Toast card.
        toastHeader: "Conquista desbloqueada",
    },

    achievementList: {
        menuEntry: "Minhas conquistas",
        // The header's title and the section titles are shown in capitals.
        title: "Lista de conquistas",
        totalLine: (unlockedCount, totalCount, percent) => `${unlockedCount} / ${totalCount} conquistas desbloqueadas (${percent}%)`,
        unlockedSection: "Conquistas desbloqueadas",
        missingSection: "Conquistas a obter",
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
        menuEntry: "Meu perfil",
        // The buttons at the card's foot.
        buttons: {
            achievements: "Conquistas",
            frame: "Molduras",
            mostPlayedTables: "Mesas mais jogadas",
            tablesToDiscover: "Mesas a descobrir",
            household: "Estatísticas da casa",
        },
        // The Household Stats opened from the Household button: the title and
        // the line labels the stats above do not have.
        household: {
            title: "Estatísticas da casa",
            lines: {
                playerLevel: "Nível do jogador",
                collectionMastery: "Maestria da coleção",
                achievementsUnlocked: "Conquistas desbloqueadas",
                dailyStreak: "Sequência diária",
            },
        },
        // The Avatar Frame list opened from the Frame button: its title, the
        // "no frame" row, the worn row's mark and a locked frame's condition.
        frameList: {
            title: "Molduras de avatar",
            none: "Nenhuma",
            worn: "Em uso",
            unlockCondition: (tier) => `Grau da coleção ${tier}`,
        },
        // The card's Player Level: its title over the big digits, then the
        // points so far and those of the next level, thousands separated.
        playerLevel: {
            title: "NÍVEL",
            current: (points, nextLevelPoints) => `Atual: ${points} / ${nextLevelPoints}`,
        },
        collectionTitle: "MAESTRIA DA COLEÇÃO",
        sections: {
            game: "JOGO",
            progression: "PROGRESSÃO",
            tastes: "GOSTOS",
        },
        // The stats' labels, over their values.
        stats: {
            gamesPlayed: "Partidas jogadas",
            totalTime: "Tempo total",
            averageDuration: "Partida média",
            collection: "Coleção",
            challengesCompleted: "Desafios concluídos",
            highScoresHeld: "Melhores pontuações",
            tableRecordsHeld: "Recordes da mesa",
            cabinetStreak: "Dias seguidos na máquina",
            dayStreak: "Sequência da mesa do dia",
            weekStreak: "Sequência da mesa da semana",
            favouriteManufacturer: "Fabricante favorito",
            favouriteDecade: "Década favorita",
            favouriteTable: "Mesa mais jogada",
            firstTablePlayed: "Primeira mesa jogada",
            lastTablePlayed: "Última mesa jogada",
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
        record: (longest) => `Recorde: ${longest}`,
        // A favourite's play time, in a pill; its hours and minutes given.
        playTime: (time) => `${time} de jogo`,
        // The favourite decade, by its start year: 1990 for 1990 to 1999.
        decade: (decadeStartYear) => `Anos ${decadeStartYear}`,
        // The first or last table played's date, day and month on two digits.
        playedOn: (day, month, year) => `em ${day}/${month}/${year}`,
        // A stat without a value, such as the average before any Play.
        none: "—",
    },

    // Profiles. Guest's folder name is never shown: this is its name.
    profiles: {
        menuEntry: "Trocar de jogador",
        pickerTitle: "Quem joga?",
        pickerHint: "Flippers: mudar · Start: escolher · Exit: cancelar",
        guestName: "Convidado",
        // The Profile picker's last slot, and the screen it opens.
        newProfile: "Novo perfil",
        nameEntry: {
            title: "Dê um nome ao seu perfil",
            lines: [
                "No máximo 12 caracteres.",
                "Para um nome mais longo ou com acentos, renomeie a pasta no Windows antes de jogar.",
            ],
            ok: "OK",
        },
        greeting: name => `Olá ${name}!`,
    },

    // A Drawn Menu shown natively: a line that cannot be used, with its reason.
    drawnMenu: {
        disabledLine: (label, reason) => `${label} (${reason})`,
    },

    // Manage profiles, in PinballY's Exit menu for an Admin Profile: the
    // marks and the Profile Reset.
    profileReset: {
        menuEntry: "Gerenciar perfis",
        listTitle: "Qual perfil?",
        adminLine: isAdmin => `Admin: ${isAdmin ? "sim" : "não"}`,
        childLine: isChild => `Criança: ${isChild ? "sim" : "não"}`,
        reset: "Redefinir",
        back: "Voltar",
        becomeAdmin: "Tornar-se admin",
        // Why a mark line is greyed out, by the mark rules' refusal.
        refusals: {
            guestNeverMarked: "Convidado nunca é marcado",
            removeAdminMarkFirst: "Remova primeiro a marca de admin",
            removeChildMarkFirst: "Remova primeiro a marca de criança",
            lastAdmin: "Último admin",
        },
        marksFailed: name => `Não foi possível alterar as marcas de ${name}. Consulte o log para mais detalhes.`,
        confirm: name => `Redefinir ${name}? Todas as suas partidas, sequências, desafios e conquistas serão apagados.`,
        yes: "Sim, redefinir",
        no: "Não",
        cancel: "Cancelar",
        done: name => `${name} recomeça do zero.`,
        failed: name => `Não foi possível redefinir ${name}. Consulte o log para mais detalhes.`,
        ok: "OK",
        everyProfile: "Redefinir todos os perfis",
        confirmEvery: count => `Redefinir todos os ${count} perfis? Todas as suas partidas, sequências, desafios e conquistas serão apagados.`,
        everyDone: count => `Todos os ${count} perfis recomeçam do zero.`,
        everyFailed: (count, names) => `Perfis redefinidos: ${count}. Não foi possível redefinir: ${names.join(", ")}. Consulte o log para mais detalhes.`,
    },

    // Discord Rich Presence on the cabinet's Discord account (addons/discord_rich_presence.js).
    discordRichPresence: {
        choosingTable: "Escolhendo uma mesa",
    },

    // The clock at the top left of the wheel screen.
    clock: {
        time: (hours, minutes) => `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    },

    // The Challenge Card, at the top right of the wheel screen (see common/challenges/challenge_card.js).
    challenges: {
        cardHeader: "Desafio da semana",
        titles: {
            differentTables: (target) => `Jogar ${target} mesas diferentes`,
            manufacturerTables: (target, manufacturer) => `Jogar ${target} mesas diferentes da ${manufacturer}`,
            decadeTables: (target, decade) => `Jogar ${target} mesas diferentes dos anos ${decade}`,
            differentManufacturers: (target) => `Jogar mesas de ${target} fabricantes diferentes`,
            differentDecades: (target) => `Jogar mesas de ${target} décadas diferentes`,
            neverPlayedTables: (target) => `Jogar ${target} mesas nunca jogadas`,
            dustyTables: (target) => `Jogar ${target} mesas não jogadas há seis meses`,
            tableOfTheDayDays: (target) => `Jogar a mesa do dia em ${target} dias diferentes`,
            tableOfTheWeekGames: (target) => `Jogar ${target} partidas na mesa da semana`,
            activeDays: (target) => `Jogar em ${target} dias diferentes`,
            endurance: (target) => `Jogar ${target} minutos numa mesma mesa`,
            marathon: (target) => `Jogar ${target} minutos no total`,
            randomGames: (target) => `Jogar ${target} partidas aleatórias`,
            sameTableGames: (target) => `Jogar ${target} partidas numa mesma mesa`,
        },
        progress: (value, target, daysText) => `${value}/${target} · ${daysText}`,
        daysLeft: (days) => `faltam ${days} dias`,
        lastDay: "último dia",
        completed: "Desafio concluído!",
        verdictHeader: "Desafio anterior",
        missed: (reached, target) => `Falhado · ${reached}/${target}`,
        toastHeader: "Desafio concluído",
        toastDescription: (count) => (count === 1 ? "Primeiro desafio concluído" : `${count} desafios concluídos`),
    },

    // The Mastery Bar, under the Challenge Card (see common/mastery/mastery_bar.js), and the
    // Collection Mastery's texts.
    tableMastery: {
        // Collection Mastery: the goal toward the next Collection Tier
        // (that many tables at the level of that name), how many tables
        // already reach it, or, at the last tier, that all of them did.
        collection: {
            goal: (count, levelName) => `Meta: ${count} ${count === 1 ? "mesa" : "mesas"} em ${levelName}`,
            current: (reached, needed) => `Atual: ${reached}/${needed}`,
            allTables: (levelName) => `Todas as suas mesas: ${levelName}`,
        },
        levelNames: ["Novato", "Aprendiz", "Frequentador", "Habilidoso", "Especialista", "Ás", "Virtuoso", "Prodígio", "Lenda", "Mago do pinball"],
        toDiscover: "A descobrir",
        toastHeader: "Maestria da mesa",
        toastTitle: (name, level) => `${name} (${level})`,
        collectionToastHeader: "Maestria da coleção",
        collectionToastTitle: (tier, name) => `Grau ${tier}: ${name}`,
        collectionToastDescription: (count, name) => `${count} ${count === 1 ? "mesa" : "mesas"} em ${name} ou acima`,
    },
    profileRewards: {
        // The Avatar Frames' names, from Collection Tier 1 to 10.
        frameNames: [
            "Floresta encantada", "Vapor e engrenagens", "Neon arcade", "Gelo eterno", "Especiaria de Arrakis",
            "Grimório arcano", "Estação orbital", "Sopro do dragão", "Pinball real", "Lenda celeste",
        ],
        // The Mastery Toast's extra line, naming the frames its Collection
        // Tier unlocks (more than one when a Play raised it by several tiers).
        toastLine: (names) => `${names.length === 1 ? "Nova moldura" : "Novas molduras"}: ${names.join(", ")}`,
        toastHeader: "Moldura festiva",
        holidays: {
            newYear: { name: "Ano-Novo", condition: "Uma partida em 1º de janeiro" },
            chineseNewYear: { name: "Ano-Novo chinês", condition: "Uma partida no Ano-Novo chinês, entre 21 de janeiro e 20 de fevereiro" },
            valentine: { name: "Dia dos Namorados", condition: "Uma partida em 14 de fevereiro" },
            mardiGras: { name: "Carnaval", condition: "Uma partida na terça-feira de Carnaval, 47 dias antes da Páscoa" },
            stPatrick: { name: "Dia de São Patrício", condition: "Uma partida em 17 de março" },
            easter: { name: "Páscoa", condition: "Uma partida no domingo de Páscoa" },
            musicDay: { name: "Festa da Música", condition: "Uma partida em 21 de junho" },
            halloween: { name: "Halloween", condition: "Uma partida em 31 de outubro" },
            deadDay: { name: "Día de los Muertos", condition: "Uma partida em 1º ou 2 de novembro" },
            thanksgiving: { name: "Ação de Graças", condition: "Uma partida no Dia de Ação de Graças, a quarta quinta-feira de novembro" },
            christmas: { name: "Natal", condition: "Uma partida em 24 ou 25 de dezembro" },
        },
        // The Reward Prompt, after a Profile's first frame: the frame's name,
        // then the main menu entry and the Profile Stats button to equip it from.
        prompt: {
            title: "Nova moldura de avatar",
            message: (name, menuEntry, button) => `Você ganhou a moldura de avatar "${name}"! Use-a em "${menuEntry}", depois "${button}".`,
            goEquip: "Usar agora",
            gotIt: "Entendi",
        },
    },
    playerLevel: {
        toastHeader: "Novo nível",
        toastTitle: (level) => `Nível ${level}`,
        toastDescription: "Suas conquistas levaram você a um novo nível.",
    },
    highScores: {
        toastHeader: "Melhor pontuação",
        toastTitle: (table, place) => `Melhor pontuação em ${table}: ${place}º lugar`,
        tableRecordTitle: (table) => `Recorde da mesa em ${table}!`,
        toastScore: (score) => `${score} pontos`,
        takenFrom: (profile) => `tirado de ${profile}`,
        // The High Score Board.
        board: {
            menuEntry: "Melhores pontuações",
            record: "Recorde",
            // In place of a place's owner when it belongs to no Profile.
            defaultScore: "Pontuação padrão",
            // In place of the initials when none were typed.
            noInitials: "\u2014",
            noScore: "Nenhuma pontuação",
            // While PINemHi reads the board, as a message or a note over the last known one.
            reading: "Lendo\u2026",
            // Over the last known board when the fresh read failed.
            notRefreshed: "Não foi possível atualizar estas pontuações",
            notSupported: "As pontuações desta mesa não são suportadas",
            // A table without a ROM whose VPReg.stg section or text file is not learned yet.
            notLearned: "Jogue uma partida para ver as pontuações desta mesa",
        },
    },

    // The language names stay each in its own language.
    expansionPackSettings: {
        menuEntry: "Configurações do pack",
        on: "Sim",
        off: "Não",
        addOnLine: (name, state) => `${name}: ${state}`,
        languageLine: (languageName) => `Idioma: ${languageName}`,
        startupScreenLine: (screenName) => `Tela inicial: ${screenName}`,
        startupScreenNames: { welcome: "Boas-vindas", profilePicker: "Escolha do perfil", wheel: "Roleta" },
        offlineMode: "Modo offline",
        updateCheckLine: (state) => `Procurar atualizações do pack: ${state}`,
        offerVpxtoolLine: (state) => `Oferecer vpxtool: ${state}`,
        updateTo: (version) => `Atualizar para v${version}`,
        installVpxtool: (version) => `Instalar vpxtool v${version}`,
        updateVpxtool: (installed, version) => `Atualizar vpxtool (v${installed} → v${version})`,
        vpxtoolUpToDateLine: "Atualizar vpxtool",
        vpxtoolUpToDate: (installed) => `vpxtool v${installed} está atualizado`,
        back: "Voltar",
        groups: {
            playersAndProgress: "Jogadores e progresso",
            wheelScreen: "A roleta",
            menusAndFilters: "Menus e filtros",
            launchingAndPlaying: "Iniciar e jogar uma mesa",
            debugging: "Depuração",
        },
        onRestart: (state) => `${state} (ao reiniciar)`,
        whenOnLabel: "Sim:",
        whenOffLabel: "Não:",
        save: "Salvar",
        cancel: "Cancelar",
        notSaved: "Configuração não salva",
        ok: "OK",
        restartQuestion: "As configurações salvas se aplicam quando o PinballY reiniciar.",
        restartNow: "Reiniciar agora",
        later: "Mais tarde",
        restartFailedTitle: "Não é possível reiniciar",
        restartFailed: "As configurações se aplicarão na próxima inicialização.",
        addOns: {
            profilePicker: {
                name: "Escolha do perfil",
                whenOn: "Trocar de jogador no menu principal, para escolher quem joga.",
                whenOff: "Todos jogam como Convidado; sem avatar nem saudação nas Boas-vindas.",
            },
            startupChoicePrompt: {
                name: "Boas-vindas",
                whenOn: "Na inicialização e após Trocar de jogador: escolha uma mesa para jogar ou troque de jogador.",
                whenOff: "A escolha do perfil só cumprimenta o jogador.",
            },
            achievements: {
                name: "Conquistas",
                whenOn: "Conquistas obtidas jogando, cada uma anunciada por um aviso.",
                whenOff: "Sem nível do jogador.",
            },
            sessionStatsTracker: {
                name: "Sessões",
                whenOn: "Conta cada sessão, para as conquistas de sessão.",
                whenOff: "Sem conquistas de sessão.",
            },
            challenges: {
                name: "Desafios",
                whenOn: "Um desafio por semana, sob o emblema do perfil.",
                whenOff: "Sem conquistas nem estatísticas de desafios.",
            },
            tableMastery: {
                name: "Maestria da mesa",
                whenOn: "Um nível de maestria em cada mesa, para cada jogador.",
                whenOff: "Sem graus da coleção nem suas molduras de avatar.",
            },
            highScores: {
                name: "Melhores pontuações",
                whenOn: "Cada nova melhor pontuação atribuída ao jogador que a fez.",
                whenOff: "Sem conquistas de pontuação nem recordes da mesa; as melhores pontuações do PinballY voltam.",
            },
            statusLineInfo: {
                name: "Linha de status",
                whenOn: "Ano, fabricante, partidas e tempo de jogo da mesa na linha de status.",
                whenOff: "Nada mais muda.",
            },
            clock: {
                name: "Relógio",
                whenOn: "A hora no canto superior esquerdo da tela.",
                whenOff: "Nada mais muda.",
            },
            statusIcons: {
                name: "Ícones de estado",
                whenOn: "Ao lado do relógio, uma seta dourada enquanto uma atualização do pack espera, uma seta riscada enquanto a busca de atualizações está desativada.",
                whenOff: "Nada mais muda.",
            },
            wheelArc: {
                name: "Arco dourado",
                whenOn: "Um arco dourado sob a roleta, a menos que você use seu próprio fundo.",
                whenOff: "Nada mais muda.",
            },
            uiTranslation: {
                name: "Tradução do PinballY",
                whenOn: "Os menus e mensagens do PinballY no idioma do pack.",
                whenOff: "Nada mais muda.",
            },
            drawnMenus: {
                name: "Menus desenhados",
                whenOn: "Os menus do PinballY desenhados no estilo do pack.",
                whenOff: "Os menus simples do PinballY voltam, exceto nestas configurações.",
            },
            customMenuCommands: {
                name: "Comandos de menu",
                whenOn: "Configuração da mesa no menu principal.",
                whenOff: "Nada mais muda.",
            },
            randomGame: {
                name: "Mesa aleatória",
                whenOn: "Iniciar uma mesa aleatória pelo menu principal, sob Jogar.",
                whenOff: "A mesa aleatória continua nas Boas-vindas; com elas também desativadas, sem conquistas de mesas aleatórias.",
            },
            hallOfFame: {
                name: "Hall of Fame",
                whenOn: "Um filtro das suas dez mesas mais jogadas.",
                whenOff: "Sem o botão Mesas mais jogadas em Meu perfil.",
            },
            tablesToDiscover: {
                name: "Mesas a descobrir",
                whenOn: "Um filtro das mesas que você nunca jogou.",
                whenOff: "Sem o botão Mesas a descobrir em Meu perfil.",
            },
            hiddenTables: {
                name: "Mesas ocultas",
                whenOn: "Um filtro das mesas ocultas.",
                whenOff: "Nada mais muda.",
            },
            customFilter: {
                name: "Mesas originais",
                whenOn: "Um filtro Mesas originais, em Filtrar por fabricante.",
                whenOff: "Nada mais muda.",
            },
            menuCleanup: {
                name: "Menus enxutos",
                whenOn: "Menus mais curtos, sem entradas pouco usadas como Ajuda, Sobre ou Cartaz.",
                whenOff: "Nada mais muda.",
            },
            forceBackglass: {
                name: "Backglass",
                whenOn: "O backglass exibido na inicialização, oculto durante a partida.",
                whenOff: "Nada mais muda.",
            },
            backglassClock: {
                name: "Relógio do backglass",
                whenOn: "A hora em um pequeno quadro na tela do backglass durante a partida.",
                whenOff: "Nada mais muda.",
            },
            discordRichPresence: {
                name: "Discord Rich Presence",
                whenOn: "Sua conta do Discord mostra publicamente a mesa jogada e há quanto tempo; abra o Discord antes do PinballY.",
                whenOff: "Nada mais muda.",
            },
            seamlessLaunchOverlay: {
                name: "Overlay de início",
                whenOn: "Sem tela preta enquanto uma mesa carrega.",
                whenOff: "Nada mais muda.",
            },
            playLaunchSound: {
                name: "Som de início",
                whenOn: "Um som quando uma mesa é iniciada.",
                whenOff: "Nada mais muda.",
            },
            ratingPrompt: {
                name: "Avaliação",
                whenOn: "Pede para você avaliar uma mesa depois de jogá-la por um tempo.",
                whenOff: "Nada mais muda.",
            },
            tableRoms: {
                name: "ROMs das mesas",
                whenOn: "Encontra sozinho a ROM de cada mesa (requer vpxtool).",
                whenOff: "Nada mais muda.",
            },
            launchEventsTrace: {
                name: "Rastreio de início",
                whenOn: "Registra os eventos de início, para solução de problemas (com LOG_LAUNCH_EVENTS=true).",
                whenOff: "Nada mais muda.",
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
        promptTitle: "Atualização disponível",
        prompt: (version) => `eXpansion Pack v${version} está disponível.`,
        updateNow: "Atualizar agora",
        later: "Mais tarde",
        updateFailedTitle: "Não é possível atualizar",
        updateFailed: "O eXpansion Pack fica como está.",
        // Under the Loader while the Pack Update helper gets ready.
        downloadingUpdate: "Baixando a atualização…",
        ok: "OK",
        updatedTitle: "Atualização concluída",
        updated: (version) => `eXpansion Pack atualizado para v${version}`,
        toastTitle: "eXpansion Pack",
    },
    scriptReader: {
        dialogTitle: (version) => `vpxtool v${version}`,
        dialog: "O vpxtool lê o script de cada mesa para que a sua ROM seja preenchida sozinha. Escrito por Francis De Brabandere, sob a licença Apache-2.0, baixado de github.com/francisdb/vpxtool.",
        install: "Instalar",
        noThanks: "Não, obrigado",
        later: "Você também pode instalá-lo mais tarde nas Configurações do pack, ou à mão.",
        downloading: "Baixando…",
        ok: "OK",
        installedTitle: "vpxtool instalado",
        installed: (version) => `O vpxtool v${version} está instalado: a ROM de cada mesa agora é preenchida sozinha.`,
        failedTitle: "Instalação impossível",
        failed: "Não foi possível instalar o vpxtool; nada mudou. Você pode tentar de novo nas Configurações do pack.",
        updateTitle: (installed, version) => `vpxtool v${installed} → v${version}`,
        update: "Atualizar",
        updateLater: "Você também pode atualizá-lo mais tarde nas Configurações do pack, ou à mão.",
        updatedTitle: "vpxtool atualizado",
        updated: (version) => `O vpxtool está atualizado para a v${version}.`,
        updateFailedTitle: "Atualização impossível",
        updateFailed: "Não foi possível atualizar o vpxtool; nada mudou. Você pode tentar de novo nas Configurações do pack.",
    },
    errorToast: {
        header: "Problema",
        playNotSaved: "Não foi possível salvar esta partida: ela não contará nas suas estatísticas.",
        playNotInPlayLog: "Esta partida foi contada, mas não está no seu histórico de partidas.",
        packUpdateFailed: (version, logPath) => `A atualização para v${version} falhou: a versão anterior continua no lugar. Detalhes em ${logPath}`,
    },
    releaseHighlights: {
        "1.1.0": [
            "Inicie uma mesa aleatória direto do menu principal.",
            "Durante uma partida, a hora agora aparece na tela do backglass.",
        ],
        "1.0.0": [
            "Versão 1.0: a primeira versão pública do eXpansion Pack.",
            "Os menus e as mensagens estão mais legíveis e cabem na tela desde o primeiro segundo.",
            "Após cada atualização, esta mensagem agora mostra as novidades.",
        ],
    },
};

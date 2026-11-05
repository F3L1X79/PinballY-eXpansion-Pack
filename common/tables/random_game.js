// ============================================================
// Random Game: draws a table from the current wheel selection, animates the
// wheel to it and launches it. Shared through getRandomGame(); counts
// "randomGames" on the Play announcement.
// - Never the Last Played Table unless it is the only one.
// - Calls made while an animation runs are ignored.
// ============================================================

import { animateWheelTo, sleep } from "./wheel_navigator.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { safeHandler } from "../core/safe_handler.js";
import { getProfileStore } from "../profiles/profile_store.js";
import config from "../core/config.js";

const SCRIPT_NAME = "RandomGame";

// Base speed (ms) of the "wheel of fortune" animation.
const ANIMATION_BASE_SPEED_MS = 200;
// Probability (0-1) of intentionally stopping one table before the drawn one.
const STOP_EARLY_PROBABILITY = 0.5;
// Use NextPage-based jumps for long distances.
const USE_PAGE_JUMP_OPTIMIZATION = true;
// Delay after the wheel animation before launching the selected game.
const POST_ANIMATION_DELAY_MS = 1000;

const randomIndex = length => Math.floor(Math.random() * length);

export function createRandomGame(host, profileStore, { animateTo, skipAnimation = config.skipRandomGameAnimation }) {
    // The active Profile's most recently played visible table, or null when
    // it never played one. Its lastPlayed times are local ISO strings, which
    // sort as text. Unconfigured tables included: a wheel can show them, and
    // the one just played must not be drawn again.
    const lastPlayedOf = game => profileStore.getPlay(game.configId).lastPlayed;
    function findLastPlayedTable() {
        return host.getAllTables()
            .filter(game => !game.isHidden && lastPlayedOf(game))
            .reduce((latest, game) => (!latest || lastPlayedOf(game) > lastPlayedOf(latest) ? game : latest), null);
    }

    let launchInProgress = false;
    // The table this module just launched, until it starts or fails to launch.
    let pendingConfigId = null;
    // Whether the last game that started is a Random Game, for the modules
    // whose "gamestarted" listeners run after this one's.
    let startedGameIsRandom = false;
    // The tables started as Random Games, until their Play or their next start.
    const startedRandomConfigIds = new Set();

    function playGame(game) {
        pendingConfigId = game.configId;
        host.playGame(game);
    }

    async function launch() {
        if (launchInProgress) return;

        const tables = host.getWheelTables();
        if (!Array.isArray(tables) || tables.length === 0) return;

        launchInProgress = true;
        try {
            const lastPlayedTable = findLastPlayedTable();
            const isLastPlayed = index =>
                lastPlayedTable !== null && tables[index].configId === lastPlayedTable.configId;

            const allIndexes = tables.map((_, index) => index);
            const candidates = allIndexes.filter(index => !isLastPlayed(index));
            const pool = candidates.length > 0 ? candidates : allIndexes;
            const drawnIndex = pool[randomIndex(pool.length)];

            if (skipAnimation) {
                playGame(tables[drawnIndex]);
                return;
            }

            // The suspense "one table early" stop may land on neither the
            // current table (index 0, never animated away from) nor the Last
            // Played Table: then the wheel goes on to the drawn table.
            const canStopEarly = drawnIndex > 0 && !isLastPlayed(drawnIndex - 1);
            const landingIndex = canStopEarly && Math.random() < STOP_EARLY_PROBABILITY
                ? drawnIndex - 1
                : drawnIndex;

            await animateTo(tables, landingIndex);
            playGame(tables[landingIndex]);
        } finally {
            launchInProgress = false;
        }
    }

    function getRandomGamesPlayed() {
        return profileStore.getProfileData().randomGames;
    }

    // Fires when a launched table's first window opens. Only one table runs
    // at a time, so any start settles the pending Random Game: noted if it
    // is that table, forgotten otherwise.
    host.on("gamestarted", safeHandler(SCRIPT_NAME, ev => {
        const isRandomGame = pendingConfigId !== null && ev.game && ev.game.configId === pendingConfigId;
        pendingConfigId = null;
        startedGameIsRandom = isRandomGame;
        if (!ev.game) return;
        if (isRandomGame) {
            startedRandomConfigIds.add(ev.game.configId);
        } else {
            startedRandomConfigIds.delete(ev.game.configId);
        }
    }));

    // Fires on "gameover" for a Play only; a shorter Random Game stays noted
    // until that table's next "gamestarted" settles it again.
    profileStore.onPlay(safeHandler(SCRIPT_NAME, ({ profileName, configId }) => {
        if (!startedRandomConfigIds.delete(configId)) return;
        profileStore.updateProfileData(data => { data.randomGames += 1; }, profileName);
    }));

    // Fires instead of "gamestarted" when the launch fails.
    host.on("launcherror", safeHandler(SCRIPT_NAME, () => {
        pendingConfigId = null;
    }));

    return { launch, getRandomGamesPlayed, getLastPlayedTable: findLastPlayedTable, isStartedGameRandom: () => startedGameIsRandom };
}

async function animateWheelThenPause(tables, index) {
    await animateWheelTo(tables, index, {
        baseSpeedMs: ANIMATION_BASE_SPEED_MS,
        usePageJumpOptimization: USE_PAGE_JUMP_OPTIMIZATION,
    });
    await sleep(POST_ANIMATION_DELAY_MS);
}

let sharedRandomGame = null;

// One instance for every add-on, so a Random Game requested from the menu
// while the Welcome Screen's one is animating is ignored.
export function getRandomGame() {
    if (!sharedRandomGame) {
        sharedRandomGame = createRandomGame(createPinballYHost(), getProfileStore(), { animateTo: animateWheelThenPause });
    }
    return sharedRandomGame;
}

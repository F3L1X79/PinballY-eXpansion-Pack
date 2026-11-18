// ============================================================
// Play Settlement on its own: the fake host with a real Launch Bracket,
// NVRAM watch, vpxtool runner, Profile store (Alice active) and High Score
// store, what it announces, and a Play of a table. Never loaded by PinballY.
// - watchLate / playLate reverse the two orders Play Settlement must not rely on.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { createLaunchBracket } from "../../common/core/launch_bracket.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createHighScoreStore } from "../../common/high_scores/high_score_store.js";
import { createNvramWatch } from "../../common/vpxtool/nvram_watch.js";
import { createVpxtoolRunner } from "../../common/vpxtool/vpxtool_runner.js";
import { createPlaySettlement } from "../../common/high_scores/play_settlement.js";
import { TABLES, PROFILES_FOLDER, NVRAM_FOLDER, VPXTOOL, GAME_MS, nvFileOf } from "./high_scores_scenario.js";

export const NOW = new Date(2026, 10, 18, 20, 0, 0);
const NVRAM_REGISTRY_KEY = "HKCU\\Software\\Freeware\\Visual PinMame\\globals\\nvram_directory";

// files: { path: content } seeded first; vpxtool: installed, printing back
// the .nv's text; nvFiles: { rom: lastGame(...) } in the NVRAM folder.
// watchLate: the NVRAM watch hears the launch's end after Play Settlement;
// playLate: the Profile store's Play reaches Play Settlement only once
// deliverPlays() is called (play()'s afterEnd).
export function startSettlement({ tables = TABLES, files = {}, vpxtool = false, nvFiles = {}, watchLate = false, playLate = false } = {}) {
    const fake = createFakePinballYHost({ now: NOW, tables });
    for (const [path, content] of Object.entries(files)) fake.addFile(path, content);
    fake.addFile(`${PROFILES_FOLDER}\\Alice\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [] }));
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    if (vpxtool || Object.keys(nvFiles).length > 0) {
        fake.setRegistryValue(NVRAM_REGISTRY_KEY, NVRAM_FOLDER);
        fake.addFolder(NVRAM_FOLDER);
        for (const table of tables) if (table.gameFile) fake.addFile(table.gameFile, "vpx");
    }
    for (const [rom, text] of Object.entries(nvFiles)) fake.addFile(nvFileOf(rom), text, { modified: new Date(2026, 0, 1) });
    if (vpxtool) fake.addProgram(VPXTOOL, args => ({ output: fake.readFile(args[2]) ?? "" }));

    const launchBracket = createLaunchBracket(fake);
    const profileStore = createProfileStore(fake);
    const highScores = createHighScoreStore(fake, profileStore);
    const vpxtoolRunner = createVpxtoolRunner(fake, { launchBracket });
    // A late watch subscribes to the bracket only after Play Settlement.
    let subscribeWatch = () => {};
    const watchBracket = watchLate
        ? { ...launchBracket, subscribe: (name, handlers) => { subscribeWatch = () => launchBracket.subscribe(name, handlers); } }
        : launchBracket;
    const nvramWatch = createNvramWatch(fake, watchBracket);
    const latePlays = [];
    const playListeners = [];
    if (playLate) profileStore.onPlay(play => latePlays.push(play));
    const playsFrom = playLate ? { onPlay: listener => playListeners.push(listener) } : profileStore;

    const announced = [];
    const create = () => createPlaySettlement(fake, {
        highScores, launchBracket, profileStore: playsFrom, nvramWatch, vpxtool: vpxtoolRunner,
        scriptName: "HighScores", scoreText: String, announce: announcement => announced.push(announcement),
    });
    const settlement = create();
    subscribeWatch();
    const deliverPlays = () => {
        for (const play of latePlays.splice(0)) for (const listener of playListeners) listener(play);
    };
    const log = () => fake.logLines().filter(line => line.startsWith("[HighScores]"));
    return { fake, highScores, settlement, announced, log, deliverPlays, createAgain: create };
}

// A second at a time, so each read's answer settles before its deadline.
export async function finishReads(fake, seconds = 15) {
    for (let step = 0; step < seconds; step++) {
        await settle();
        fake.advanceTime(1000);
    }
    await settle();
}

// Plays the table for durationMs; after() changes what the game saved, just
// before it ends; afterEnd() runs right after "postlaunch".
export async function play(fake, configId, { after = () => {}, afterEnd = () => {}, durationMs = GAME_MS } = {}) {
    const game = fake.getGameInfo(configId);
    fake.playGame(game);
    await settle();
    fake.gameStarted(game);
    await finishReads(fake);
    fake.advanceTime(Math.max(durationMs - 15000, 0));
    await settle();
    after();
    fake.gameOver(game);
    afterEnd();
    await finishReads(fake);
}

// An announced place as [rank, initials].
export const placeOf = announcement => [announcement.place.rank, announcement.place.initials];

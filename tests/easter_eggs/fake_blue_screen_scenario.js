// ============================================================
// Fake Blue Screen tests' scenario: main.js on the fake globals, the Fake
// Blue Screen's draw always won, a table played from the wheel and back,
// and what the player sees of the screen.
// Never loaded by PinballY; one start per test file, as main.js loads once
// per process.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { winTheDrawOf } from "./winning_draw.js";

const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
export const BLUE_SCREEN_SOUND = `${PACK}\\assets\\sounds\\easter_eggs\\blue_screen.wav`;
export const profileFile = name => `${PACK}\\profiles\\${name}\\profile.json`;
export const TABLES = ["Medieval Madness", "Attack from Mars"].map((title, index) => ({
    id: index + 1, configId: title, title, manufacturer: "", year: 0, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, audioVolume: 80,
}));
// The table falls silent first; the screen shows this much later, for 10 s.
export const SILENCE_LEAD_MS = 200;
export const SCREEN_MS = 10000;
export const BLUE = 0xFF0000AA;
export const GREY = 0xFFAAAAAA;
const SCREEN_Z = { first: 7600, last: 7601 };

// wins: the Easter Egg whose draw wins; files: which files exist; addOns: those on;
// layoutSize: the window's.
export async function startBlueScreenScenario({
    wins = "fakeBlueScreen", addOns = ["achievements", "sessionStatsTracker"], files = [BLUE_SCREEN_SOUND],
    layoutSize = { width: 1080, height: 1920 },
} = {}) {
    const fake = createFakePinballYHost({ tables: TABLES, now: new Date(2026, 10, 10, 20, 0, 0), layoutSize });
    fake.setWheelTables(TABLES.map(table => table.configId));
    for (const path of files) fake.addFile(path);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = addOns.includes(key);
    config.language = "en";
    config.startupScreen = "wheel";

    const { default: lang } = await import("../../common/core/i18n.js");
    await winTheDrawOf(wins);
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    // Past the startup and the sounds' loading.
    fake.advanceTime(2000);
    await settle();
    return { fake, lang, store: getProfileStore(), table: fake.getGameInfo(TABLES[0].configId) };
}

// A table played from the wheel until it closes on its own, or by Exit Game.
// Under a minute: no Play, so no Achievement Toast keeps the wheel busy.
export async function playTable(fake, table, { exitGame = false } = {}) {
    fake.playGame(table);
    fake.gameStarted(table);
    fake.advanceTime(1000);
    if (exitGame) fake.runCommand(fake.getBuiltInCommand("KillGame"));
    fake.gameOver(table);
    await settle();
}

export const screenLayers = fake => fake.drawingLayers().filter(layer => layer.zIndex >= SCREEN_Z.first && layer.zIndex <= SCREEN_Z.last);
export const isScreenShown = fake => screenLayers(fake).some(layer => layer.alpha > 0);
export const shownTexts = fake => screenLayers(fake).filter(layer => layer.alpha > 0).flatMap(layer => layer.texts());
// The full window layer, with the text.
export const textLayer = fake => screenLayers(fake).find(layer => layer.zIndex === SCREEN_Z.first);
export const blueScreenSounds = fake => fake.soundsPlayed().filter(path => path === BLUE_SCREEN_SOUND);
export const volumeWrites = (fake, table) => fake.gameUpdates()
    .filter(update => update.configId === table.configId && "audioVolume" in update.changes)
    .map(update => update.changes.audioVolume);

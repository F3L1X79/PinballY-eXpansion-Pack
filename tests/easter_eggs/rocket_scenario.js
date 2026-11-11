// ============================================================
// Rocket tests' scenario: main.js on the fake globals, the Rocket's draw
// always won, a launch from the wheel, and what the player sees of the game.
// Never loaded by PinballY; one start per test file, as main.js loads once
// per process.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { winTheDrawOf } from "./winning_draw.js";

const PACK = "C:\\PinballY\\Scripts\\ExpansionPack";
const IMAGES = `${PACK}\\assets\\images\\easter_eggs`;
export const SHIP_IMAGE = `${IMAGES}\\rocket_ship.png`;
export const SPLASH_IMAGE = `${IMAGES}\\rocket_splash.png`;
export const ASTEROID_IMAGE = `${IMAGES}\\rocket_break_1.png`;
export const ROCKET_IMAGES = [
    "rocket_ship", "rocket_splash", ...[1, 2, 3, 4, 5].map(index => `rocket_flame_${index}`),
    ...[1, 2, 3, 4, 5].map(index => `rocket_break_${index}`), ...[1, 2, 3, 4].map(index => `rocket_explosion_${index}`),
].map(name => `${IMAGES}\\${name}.png`);
export const NAVIGATION_SOUND = "C:\\PinballY\\Assets\\Button Sounds\\Next.wav";
// As config.js resolves the shipped music; tests set config.rocketMusicFile to it.
export const MUSIC_FILE = `${PACK}\\assets\\sounds\\easter_eggs\\rocket_music.wav`;
export const profileFile = name => `${PACK}\\profiles\\${name}\\profile.json`;
export const TABLES = ["Medieval Madness", "Attack from Mars", "Theatre of Magic"].map((title, index) => ({
    id: index + 1, configId: title, title, manufacturer: "", year: 0, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, audioVolume: 80,
}));
// From the launch to the game: a tick, the backdrop's paint, then the opening word.
export const BACKDROP_PAINT_MS = 50;
export const SPLASH_MS = 1900;
export const LEAVING_MS = 120;
export const SCORE_MS = 2000;
// Long enough for the Achievement's toast to show and go.
export const TOAST_GONE_MS = 30000;
export const BACKDROP_Z_INDEX = 7500;
export const TEXT_Z_INDEX = 7580;

// wins: the Easter Egg whose draw wins; files: which images exist; addOns: those on.
export async function startRocketScenario({
    wins = "rocket", addOns = ["achievements", "sessionStatsTracker", "backglassClock", "highScores"], files = ROCKET_IMAGES,
} = {}) {
    const fake = createFakePinballYHost({ tables: TABLES, now: new Date(2026, 10, 9, 20, 0, 0) });
    fake.setWheelTables(TABLES.map(table => table.configId));
    for (const path of [...files, NAVIGATION_SOUND, NAVIGATION_SOUND.replace("Next.wav", "Prev.wav")]) fake.addFile(path);
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
    fake.advanceTime(100);
    return { fake, lang, store: getProfileStore(), table: fake.getGameInfo(TABLES[0].configId) };
}

// The Rocket again: once a Profile and once a day, so the next day for another Profile.
export function nextDayForAnotherProfile(fake, store, name) {
    fake.addFolder(`${PACK}\\profiles\\${name}`);
    store.switchTo(name);
    fake.setNow(new Date(fake.now().getTime() + 24 * 60 * 60 * 1000));
}

// Layers already there at the launch, such as the Confetti Shower's at the same z.
let layersBefore = new Set();

// The player's launch from the wheel, as PinballY's PlayGame command makes it.
export function launchFromWheel(fake, table) {
    layersBefore = new Set(fake.drawingLayers());
    fake.playGame(table);
}

// Up to the game itself: the backdrop, every layer drawn, the opening word gone.
export async function untilPlaying(fake) {
    await settle();
    fake.advanceTime(BACKDROP_PAINT_MS + SPLASH_MS + 16);
}

// Shown or not; none once the game is over.
export const rocketLayers = fake => fake.drawingLayers()
    .filter(layer => !layersBefore.has(layer) && layer.zIndex >= BACKDROP_Z_INDEX && layer.zIndex < 7600);
export const isRocketShown = fake => rocketLayers(fake).some(layer => layer.alpha > 0);
export const shownTexts = fake => rocketLayers(fake).filter(layer => layer.alpha > 0).flatMap(layer => layer.texts());
export const shownImages = fake => rocketLayers(fake).filter(layer => layer.alpha > 0).flatMap(layer => layer.images());
export const shipLayer = fake => rocketLayers(fake).find(layer => layer.alpha > 0 && layer.images().includes(SHIP_IMAGE));
// The score panel's number, once the game has crashed; null before.
export function finalScore(fake, lang) {
    const panel = rocketLayers(fake).find(layer => layer.zIndex === TEXT_Z_INDEX && layer.alpha > 0 && layer.texts()[0] === lang.rocket.score);
    return panel ? panel.texts()[1] : null;
}

// Until the score panel shows, at most maxMs of play; returns the time it took.
export function untilCrash(fake, lang, maxMs = 120000) {
    let elapsed = 0;
    while (finalScore(fake, lang) === null && elapsed < maxMs) {
        fake.advanceTime(16);
        elapsed += 16;
    }
    return elapsed;
}

export const volumeWrites = (fake, table) => fake.gameUpdates()
    .filter(update => update.configId === table.configId && "audioVolume" in update.changes)
    .map(update => update.changes.audioVolume);

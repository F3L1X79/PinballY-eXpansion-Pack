// ============================================================
// Ratings family tests' scenario: main.js on the fake globals with Ratings
// per Profile, session stats and Achievements, Guest, Alice and Bob (a Child
// Profile), each with its ratings.json, the active one's on PinballY's
// columns. Rates tables, plays, switches, reads the toasts and the list.
// Never loaded by PinballY.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { toastDrawings } from "./achievement_toast_reader.js";
import { readRows, press, untilListShown } from "./achievement_list_reader.js";
import config from "../../common/core/config.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const PLAY_MS = 5 * 60 * 1000;
// Longer than an Achievement Toast's whole life (rise, hold, fade).
const TOAST_MS = 6000;

const table = (id, title, categories = []) => ({
    id, configId: title, title, manufacturer: "", year: 0, categories,
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isFavorite: false, isHidden: false,
});
export const MEDIEVAL = table(1, "Medieval Madness");
export const MARS = table(2, "Attack from Mars");
export const THEATRE = table(3, "Theatre of Magic");
// In the default Adult Category: kept off a Child Profile's wheel.
export const ADULT_TABLE = table(4, "Playboy", ["NSFW"]);
export const TABLES = [MEDIEVAL, MARS, THEATRE, ADULT_TABLE];
// Config IDs of tables no longer in the game list.
export const GONE_TABLES = ["Gone Table 1", "Gone Table 2", "Gone Table 3", "Gone Table 4"];

// ratings: { profileName: { configId: rating } }, the active Profile's put
// on PinballY's columns; active: the active Profile at startup; addOns:
// the Add-ons on, Ratings per Profile included by default.
export async function startRatingsScenario({ ratings = {}, active = "guest", addOns = ["profileRatings"] } = {}) {
    const activeRatings = ratings[active] || {};
    const tables = TABLES.map(game => ({ ...game, rating: activeRatings[game.configId] ?? -1 }));
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 7, 20, 0, 0), tables });
    const marks = { guest: {}, Alice: {}, Bob: { isChild: true } };
    for (const [name, mark] of Object.entries(marks)) {
        fake.addFile(`${PROFILES}\\${name}\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [], ...mark }));
        fake.addFile(`${PROFILES}\\${name}\\ratings.json`, JSON.stringify({ version: 1, ratings: ratings[name] || {}, favorites: [] }));
    }
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: active }));
    fake.addFile(`${PROFILES}\\profile_ratings.json`, JSON.stringify({ version: 1, columnsProfile: active }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        // Without the Profile picker, startup always switches to Guest.
        config.addOns[key] = ["sessionStatsTracker", "achievements", "profilePicker", ...addOns].includes(key);
    }
    config.language = "en";
    // Straight to the wheel, where the toasts show.
    config.startupScreen = "wheel";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const { getAllAchievements } = await import("../../addons/achievements_engine.js");
    const TEXT = lang.achievements;
    const LIST_TEXT = lang.achievementList;
    await import("../../main.js");
    await settle();
    const store = getProfileStore();
    let readToasts = 0;

    // The texts of the toasts shown since the last call, once every waiting
    // toast has shown, one after the other.
    async function newToastTexts() {
        for (let guard = 0; guard < 100; guard++) {
            const shownCount = toastDrawings(fake).length;
            fake.advanceTime(TOAST_MS);
            await settle();
            if (toastDrawings(fake).length === shownCount) break;
        }
        const drawings = toastDrawings(fake);
        const texts = drawings.slice(readToasts).flatMap(drawing => drawing.texts);
        readToasts = drawings.length;
        return texts;
    }

    // The player gives the table that Rating in PinballY's dialog (-1: none).
    const rate = (game, rating) => fake.getGameInfo(game.configId).update({ rating });

    async function play(game = MEDIEVAL) {
        fake.gameStarted(game);
        await settle();
        fake.advanceTime(PLAY_MS);
        fake.gameOver(game);
        await settle();
    }

    function listRows() {
        fake.openMenu("main", [{ title: "Play", cmd: globalThis.command.PlayGame }]);
        fake.selectMenuItem(LIST_TEXT.menuEntry);
        untilListShown(fake);
        const rows = readRows(fake, LIST_TEXT);
        press(fake, "Exit");
        return rows;
    }

    async function switchTo(name) {
        store.switchTo(name);
        await settle();
    }

    // The family's titles, from the first step.
    const titles = [1, 5, 10, 25].map(count => TEXT.ratingsTitles[count]);
    // The family's toasts among these texts, in order.
    const familyToasts = texts => texts.filter(text => titles.includes(text));

    return { fake, store, TEXT, LIST_TEXT, titles, familyToasts, getAllAchievements, newToastTexts, rate, play, listRows, switchTo };
}

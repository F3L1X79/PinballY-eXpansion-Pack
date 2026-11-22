// ============================================================
// Household family and frame tests' scenario: main.js on the fake globals
// with Achievements, session stats, the Profile picker and the Household
// Challenge, Alice and Bob, this week's Household Challenge already locked
// in cabinet.json. Plays, switches, reads the toasts. Never loaded by PinballY.
// ============================================================

import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { toastDrawings } from "./achievement_toast_reader.js";
import { getWeekKey } from "../../common/tables/period_table.js";
import config from "../../common/core/config.js";

export const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const FRAMES = "C:\\PinballY\\Scripts\\ExpansionPack\\assets\\images\\avatar_frames";
// Monday 21 September 2026, 20:00.
const NOW = new Date(2026, 8, 21, 20, 0, 0);
const PLAY_MS = 5 * 60 * 1000;
// Longer than an Achievement Toast's whole life (rise, hold, fade).
const TOAST_MS = 6000;

const table = (id, title) => ({
    id, configId: title, title, manufacturer: "Williams", year: 1992, categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isFavorite: false, isHidden: false,
});
export const TABLES = [table(1, "Medieval Madness"), table(2, "Attack from Mars"), table(3, "Theatre of Magic")];

// profiles: { name: profile.json fields }; target: the week's Household
// Challenge target, on different tables; addOns: the Add-ons on besides
// Achievements, session stats and the Profile picker.
export async function startHouseholdScenario({ profiles, active = "Alice", target = 2, addOns = ["householdChallenge"] }) {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    for (const size of ["384", "192", "192_locked"]) fake.addFile(`${FRAMES}\\frame_household_${size}.png`);
    for (const [name, data] of Object.entries(profiles)) {
        // Already prompted: only the toasts are looked at here.
        fake.addFile(`${PROFILES}\\${name}\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [], avatarFrame: null, ...data }));
    }
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({
        version: 1,
        activeProfile: active,
        householdChallenge: { current: { week: getWeekKey(NOW), template: "differentTables", param: null, target, games: [] }, previous: null },
    }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = ["sessionStatsTracker", "achievements", "profilePicker", ...addOns].includes(key);
    }
    config.language = "en";
    // Straight to the wheel, where the toasts show.
    config.startupScreen = "wheel";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const { getProfileRewards } = await import("../../common/avatar_frames/profile_rewards.js");
    const { getAllAchievements } = await import("../../addons/achievements_engine.js");
    await import("../../main.js");
    await settle();
    const store = getProfileStore();
    let readToasts = 0;

    // The toasts shown since the last call, once every waiting one has
    // shown, each one's texts joined by " | ".
    async function newToasts() {
        for (let guard = 0; guard < 100; guard++) {
            const shownCount = toastDrawings(fake).length;
            fake.advanceTime(TOAST_MS);
            await settle();
            if (toastDrawings(fake).length === shownCount) break;
        }
        const drawings = toastDrawings(fake);
        const texts = drawings.slice(readToasts).map(drawing => drawing.texts.join(" | "));
        readToasts = drawings.length;
        return texts;
    }

    async function play(game) {
        fake.gameStarted(game);
        await settle();
        fake.advanceTime(PLAY_MS);
        fake.gameOver(game);
        await settle();
    }

    async function switchTo(name) {
        store.switchTo(name);
        await settle();
    }

    const TEXT = lang.achievements;
    // The family's toasts among these, by their step, in order.
    const familySteps = toasts => toasts.flatMap(toast => [1, 5, 15, 30].filter(count =>
        toast.includes(`| ${TEXT.householdCompletedTitles[count]} | ${TEXT.householdCompletedDescription(count)}`)));
    // Whether a toast is a Household Challenge Toast.
    const isHouseholdToast = toast => toast.startsWith(lang.householdChallenge.toastHeader.toLocaleUpperCase());

    return { fake, store, lang, familySteps, isHouseholdToast, getAllAchievements, profileRewards: getProfileRewards(), newToasts, play, switchTo };
}

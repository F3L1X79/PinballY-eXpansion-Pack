// ============================================================
// History Import silence tests' scenario: main.js on the fake globals with
// the native menus, Table Mastery and the Achievements on, an Admin Profile
// Alice and a Profile Bob, every table with years of PinballY History.
// Imports through Manage profiles; reads every toast and Reward Prompt.
// Never loaded by PinballY.
// ============================================================

import { settle } from "../support/fake_pinbally_host.js";
import { startScenario, pickLastTables, TABLES, ALL_TOASTS_MS } from "../mastery/mastery_bar_scenario.js";

export { allToasts, collectionToasts, savedCollectionTier, play, TABLES, MINUTE } from "../mastery/mastery_bar_scenario.js";
export { rewardPrompts } from "../reward_prompt/reward_prompt_reader.js";

// 2.4 hours a table: Mastery Level 4 everywhere (Collection Tier 4) and
// 9.6 hours in all, half an hour short of the 10-hour Achievement.
const HISTORY_SECONDS = 8640;
const WITH_HISTORY = TABLES.map(game => ({ ...game, playCount: 10, playTime: HISTORY_SECONDS, lastPlayed: new Date(2026, 7, 1, 20, 0, 0) }));

// What half an hour on Medieval Madness after the import reaches by itself:
// Mastery Level 5 there, 10 hours in all, its first Play as Table of the
// Day, and the Player Level those two Achievements bring.
export const PLAY_OWN_TOASTS = [
    "5 | TABLE MASTERY | Specialist (5) | Medieval Madness",
    "ACHIEVEMENT UNLOCKED | Hooked on Pinball | Play for more than 10 hours in total.",
    "ACHIEVEMENT UNLOCKED | Hello, Table of the Day! | Play the table of the day for the first time.",
    "5 | LEVEL UP | Level 5 | Your Achievements took you to a new level.",
];

// Alice active once started: with the Profile Picker off, startup is Guest's.
export async function startWithHistory() {
    // The same Table of the Day on every run.
    pickLastTables();
    const fake = await startScenario({
        addOns: ["tableMastery", "achievements", "customMenuCommands"],
        profiles: { Alice: { isAdmin: true }, Bob: {} },
        tables: WITH_HISTORY,
    });
    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const store = getProfileStore();
    store.switchTo("Alice");
    await waitForToasts(fake);
    return { fake, lang, store };
}

// Every toast submitted so far has had its time on screen.
export async function waitForToasts(fake) {
    await settle();
    fake.advanceTime(ALL_TOASTS_MS);
    await settle();
}

// Alice, the Admin Profile, hands the history to that Profile from Manage profiles.
export function importHistoryInto(fake, lang, name) {
    const TEXT = lang.profileReset;
    fake.openOperatorMenu();
    fake.selectMenuItem(TEXT.menuEntry);
    fake.selectMenuItem(name);
    fake.selectMenuItem(TEXT.historyLine);
    fake.selectMenuItem(TEXT.historyYes);
    fake.selectMenuItem(TEXT.ok);
}

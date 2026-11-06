// ============================================================
// Profile Reset of the active Profile: it starts over at once, keeps its
// Admin mark, no toast replays its old Achievements, the card and lists show
// fresh data, and its next game earns them again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

// Wednesday 30 September 2026: its week is keyed "2026-09-28".
const NOW = new Date(2026, 8, 30, 21, 0, 0);
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
const CARD_Z_INDEX = 4500;
// Longer than a toast's whole life (rise, hold, fade).
const ONE_TOAST_MS = 6000;

const table = (id, title, manufacturer, year) => ({
    id, configId: title, title, manufacturer, year, categories: ["Fantasy"],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, isConfigured: true,
});
const MEDIEVAL = table(1, "Medieval Madness", "Williams", 1997);
const MARS = table(2, "Attack from Mars", "Bally", 1995);
const ELVIRA = table(3, "Elvira", "Bally", 1989);
const CHALLENGE = { week: "2026-09-28", template: "manufacturerTables", param: "Bally", target: 2 };

test("an Admin Profile resetting itself starts over at once, without replaying a toast", async () => {
    const fake = createFakePinballYHost({ now: NOW, tables: [MEDIEVAL, MARS, ELVIRA] });
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({
        version: 1, activeProfile: "guest", challenge: { current: CHALLENGE, previous: null },
    }));
    fake.addFile(profileFile("Alice"), JSON.stringify({ version: 1, isAdmin: true }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = ["customMenuCommands", "achievements", "challenges", "hallOfFame"].includes(key);
    }
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const TEXT = lang.profileReset;
    const CHALLENGES = lang.challenges;
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    getProfileStore().switchTo("Alice");
    await settle();

    const cardShows = text => fake.drawingLayers()
        .some(layer => layer.zIndex === CARD_Z_INDEX && layer.alpha > 0 && layer.texts().includes(text));
    const aliceData = () => JSON.parse(fake.readFile(profileFile("Alice")));
    async function showEveryToast() {
        for (let i = 0; i < 20; i++) fake.advanceTime(ONE_TOAST_MS);
        await settle();
    }
    // Back on the wheel, its first toasts showing and the others waiting.
    async function play(game) {
        fake.gameStarted(game);
        await settle();
        fake.advanceTime(90 * 1000);
        fake.gameOver(game);
        await settle();
        fake.fire("wheelmode");
    }

    await play(MARS);
    assert.ok(cardShows(CHALLENGES.progress(1, 2, CHALLENGES.daysLeft(5))));
    assert.equal(aliceData().notified.length, 1, "her first toast shows, the others wait");
    fake.setCurrentFilter("User.project.HallOfFame");
    assert.deepEqual(fake.getWheelTables().map(game => game.title), ["Attack from Mars"]);
    const toastCount = toastDrawings(fake).length;

    fake.openOperatorMenu();
    fake.selectMenuItem(TEXT.menuEntry);
    fake.selectMenuItem("Alice");
    fake.selectMenuItem(TEXT.reset);
    fake.selectMenuItem(TEXT.yes);
    // PinballY is back on the wheel once the menu closes.
    fake.fire("wheelmode");
    await showEveryToast();

    const data = aliceData();
    assert.equal(data.isAdmin, true, "Alice is still an Admin Profile");
    assert.deepEqual([data.plays, data.notified, data.randomGames], [{}, [], 0]);
    assert.equal(toastDrawings(fake).length, toastCount, "the toasts still waiting never show");
    assert.ok(cardShows(CHALLENGES.progress(0, 2, CHALLENGES.daysLeft(5))), "the Challenge Card starts from zero");
    assert.deepEqual(fake.getWheelTables(), [], "the Most Played Tables are empty");

    await play(MEDIEVAL);
    await showEveryToast();
    assert.ok(aliceData().notified.includes("collectionMilestone:firstTable"), "her first game earns First Steps again");
    assert.ok(toastDrawings(fake).length > toastCount);

    assertNoErrorLogged(fake);
});

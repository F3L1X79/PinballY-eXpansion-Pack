// ============================================================
// Achievements per Profile through main.js: each Profile unlocks and is
// announced its own, once; a toast waiting at a switch stays the unlocker's;
// a switch announces the new Profile's unlocks but no Player Level.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import config from "../../common/core/config.js";
import { readRows } from "../achievements/achievement_list_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const NOW = new Date(2026, 8, 23, 10, 0, 0);
const SECONDS_PER_HOUR = 3600;
// Longer than a toast's whole life (rise, hold, fade).
const ONE_TOAST_MS = 6000;
const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";

// PinballY's own play stats say every table was played for hours: they must
// no longer unlock anything.
function table(id, title, manufacturer, year, categories) {
    return {
        id, configId: `${title} (${manufacturer} ${year})`, title, manufacturer, year, categories,
        playCount: 9, playTime: 200 * SECONDS_PER_HOUR, lastPlayed: new Date(2026, 8, 1), rating: -1, isHidden: false,
    };
}

const MEDIEVAL = table(1, "Medieval Madness", "Williams", 1997, ["Fantasy"]);
const MARS = table(2, "Attack from Mars", "Bally", 1995, ["SciFi"]);
const TABLES = [MEDIEVAL, MARS];

// The IDs of the families read from the play record; the Period Table ones still
// follow the household's shared Streaks.
const PLAY_RECORD_ID_PATTERN = /^(collectionMilestone|playTimeMilestone|manufacturerCompletion|decadeCompletion|categoryCompletion):/;

const profileFile = name => `${PROFILES_FOLDER}\\${name}\\profile.json`;

function allNotifiedOf(fake, name) {
    const text = fake.readFile(profileFile(name));
    return text === undefined ? [] : JSON.parse(text).notified || [];
}

const notifiedOf = (fake, name) => allNotifiedOf(fake, name).filter(id => PLAY_RECORD_ID_PATTERN.test(id)).sort();

async function play(fake, game, seconds) {
    fake.playGame(game);
    fake.gameStarted(game);
    await settle();
    fake.advanceTime(seconds * 1000);
    fake.gameOver(game);
    await settle();
}

// Lets every waiting toast show, one after the other.
async function showEveryToast(fake) {
    for (let guard = 0; guard < 100; guard++) {
        const shownCount = toastDrawings(fake).length;
        fake.advanceTime(ONE_TOAST_MS);
        await settle();
        if (toastDrawings(fake).length === shownCount) break;
    }
}

test("each Profile unlocks and is announced its own Achievements", async () => {
    const fake = createFakePinballYHost({ now: NOW, tables: TABLES });
    fake.addFolder(`${PROFILES_FOLDER}\\Alice`);
    // Bob copied in a profile.json with an hour on Attack from Mars, never announced.
    fake.addFile(profileFile("Bob"), JSON.stringify({
        version: 1,
        plays: { [MARS.configId]: { count: 1, seconds: SECONDS_PER_HOUR, lastPlayed: "2026-09-01T20:00:00" } },
    }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = ["customMenuCommands", "achievements"].includes(key);
    }
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();
    await showEveryToast(fake);
    assert.deepEqual(toastDrawings(fake), [], "PinballY's own play stats unlock nothing");

    const store = getProfileStore();
    store.switchTo("Alice");
    await settle();
    await showEveryToast(fake);
    assert.deepEqual(toastDrawings(fake), [], "Alice has nothing to announce yet");

    // Alice plays Medieval Madness: its toasts start, and she switches to
    // Bob while most of them still wait.
    await play(fake, MEDIEVAL, 90);
    assert.equal(toastDrawings(fake).length, 1, "the first toast shows on the return to the wheel");
    store.switchTo("Bob");
    await settle();
    await showEveryToast(fake);

    const aliceIds = [
        "collectionMilestone:10percent", "collectionMilestone:25percent", "collectionMilestone:50percent",
        "collectionMilestone:firstTable", "manufacturerCompletion:Williams",
    ];
    assert.deepEqual(notifiedOf(fake, "Alice"), aliceIds, "every toast of Alice's game is hers, even after the switch");

    // Bob's hour on Attack from Mars is announced at the switch.
    const bobIds = [
        "collectionMilestone:10percent", "collectionMilestone:25percent", "collectionMilestone:50percent",
        "collectionMilestone:firstTable", "manufacturerCompletion:Bally",
        "playTimeMilestone:1h",
    ];
    assert.deepEqual(notifiedOf(fake, "Bob"), bobIds, "Bob is announced what Alice already had, and his own");
    const isLevelToast = drawing => drawing.texts.includes("LEVEL UP");
    assert.equal(toastDrawings(fake).filter(drawing => !isLevelToast(drawing)).length,
        allNotifiedOf(fake, "Alice").length + allNotifiedOf(fake, "Bob").length, "one toast per Achievement and Profile");
    assert.equal(toastDrawings(fake).filter(isLevelToast).length, 1, "Alice's Play only: a switch announces no level");
    assert.deepEqual(notifiedOf(fake, "guest"), []);

    // The Achievement List shows Bob's Achievements.
    fake.openMenu("main", [{ title: "Play", cmd: globalThis.command.PlayGame }]);
    fake.selectMenuItem(lang.achievementList.menuEntry);
    const manufacturerTitles = ["Williams", "Bally"].map(name => lang.achievements.manufacturerCompletionTitle(name));
    const unlockedManufacturers = readRows(fake, lang.achievementList)
        .filter(row => row.unlocked && manufacturerTitles.includes(row.title))
        .map(row => row.title);
    assert.deepEqual(unlockedManufacturers, [lang.achievements.manufacturerCompletionTitle("Bally")]);

    // No Notified flag is left in PinballY's settings.
    assert.deepEqual([...fake.writtenSettingsKeys()].filter(key => key.startsWith("custom.achievements.")), []);
    assertNoErrorLogged(fake);
});

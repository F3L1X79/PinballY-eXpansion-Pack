// ============================================================
// A Notified Category Achievement whose category drops to one table, through
// main.js on the fake PinballY globals: once a table of the category is
// hidden, the Achievement leaves the Achievement List, its points leave the
// Player Level on the Profile Stats card, and no Level Toast shows.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { startScenario, table, PROFILES_FOLDER } from "./achievement_progress_scenario.js";
import { toastDrawings } from "./achievement_toast_reader.js";
import { openProfileStats, playerLevel, press } from "../stats/profile_stats_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const MEDIEVAL = table(1, "Medieval Madness", "Williams", 1997, ["Fantasy"]);
const TWILIGHT = table(2, "Twilight Zone", "Williams", 1993, ["Fantasy"]);
// Longer than a toast's whole life.
const ONE_TOAST_MS = 6000;

test("a Notified Category Achievement whose category drops to one table is gone, its points too, unannounced", async () => {
    const { fake, lang, listedTitles, showEveryToast } = await startScenario({
        now: new Date(2026, 8, 23, 10, 0, 0),
        tables: [MEDIEVAL, TWILIGHT],
        files: {
            [`${PROFILES_FOLDER}\\guest\\profile.json`]: {
                version: 1,
                plays: {},
                // Bronze 10 + Bronze 10 + Silver 25 + Bronze 10: level 2.
                notified: ["rageQuit", "oneMoreGame", "mirrorHour", "categoryCompletion:Fantasy"],
            },
        },
    });
    const FANTASY = lang.achievements.categoryCompletionTitle("Fantasy");
    const levelShown = () => {
        openProfileStats(fake, lang);
        const shown = playerLevel(fake, lang.profileStats);
        press(fake, "Exit");
        return shown;
    };
    const levelToasts = () => toastDrawings(fake).filter(drawing => drawing.texts.includes(lang.playerLevel.toastDescription));
    await showEveryToast();

    assert.ok(listedTitles().includes(FANTASY));
    assert.deepEqual(levelShown(), { level: "2", current: lang.profileStats.playerLevel.current(55, 125) });

    fake.setTables([MEDIEVAL, { ...TWILIGHT, isHidden: true }]);
    await settle();
    assert.ok(!listedTitles().includes(FANTASY), "one Fantasy table left");
    assert.deepEqual(levelShown(), { level: "1", current: lang.profileStats.playerLevel.current(45, 50) });
    fake.advanceTime(ONE_TOAST_MS);
    await settle();
    assert.deepEqual(levelToasts(), []);

    assertNoErrorLogged(fake);
});

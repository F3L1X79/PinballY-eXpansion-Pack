// ============================================================
// A Category Achievement's two tables are counted per Profile, through
// main.js on the fake PinballY globals and read in the Achievement List: a
// category of one Adult Table and one other table gives no Achievement to a
// Child Profile, and one to a Profile that is not a child.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { startScenario, table, PROFILES_FOLDER } from "./achievement_progress_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const MEDIEVAL = table(1, "Medieval Madness", "Williams", 1997, ["Fantasy"]);
const PLAYBOY = table(2, "Playboy", "Bally", 1978, ["Fantasy", "NSFW"]);

test("a category of one Adult Table and one other table gives an Achievement to an adult only", async () => {
    const { fake, lang, getProfileStore, listedTitles } = await startScenario({
        now: new Date(2026, 8, 23, 10, 0, 0),
        tables: [MEDIEVAL, PLAYBOY],
        files: {
            [`${PROFILES_FOLDER}\\Alice\\profile.json`]: { version: 1, isChild: true },
            [`${PROFILES_FOLDER}\\Bob\\profile.json`]: { version: 1 },
        },
    });
    const FANTASY = lang.achievements.categoryCompletionTitle("Fantasy");

    getProfileStore().switchTo("Alice");
    await settle();
    assert.ok(!listedTitles().includes(FANTASY), "a Child Profile sees one Fantasy table");

    getProfileStore().switchTo("Bob");
    await settle();
    assert.ok(listedTitles().includes(FANTASY), "an adult sees two");

    assertNoErrorLogged(fake);
});

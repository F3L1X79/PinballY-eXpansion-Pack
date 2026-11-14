// ============================================================
// The Hall of Fame filter, through main.js on the fake PinballY globals:
// the wheel shows the active Profile's ranking, never PinballY's own play
// stats, and shows the new Profile's ranking as soon as a switch happens
// while the Hall of Fame is on the wheel.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const NOW = new Date(2026, 9, 1, 20, 0, 0);
const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const HALL_OF_FAME_FILTER_ID = "User.project.HallOfFame";

// PinballY's own play stats put Theatre of Magic first: they must be ignored.
function table(id, title, playTime) {
    return { id, configId: title, title, playCount: 1, playTime, isHidden: false, isConfigured: true };
}

const MEDIEVAL = table(1, "Medieval Madness", 0);
const MARS = table(2, "Attack from Mars", 0);
const THEATRE = table(3, "Theatre of Magic", 900000);

const play = (count, seconds) => ({ count, seconds, lastPlayed: "2026-09-20T20:00:00" });

function seedProfile(fake, name, plays) {
    fake.addFile(`${PROFILES_FOLDER}\\${name}\\profile.json`, JSON.stringify({ version: 1, plays }));
}

const wheelTitles = fake => fake.getWheelTables().map(game => game.title);

test("the Hall of Fame shows the active Profile's ranking and follows a switch", async () => {
    const fake = createFakePinballYHost({ now: NOW, tables: [MEDIEVAL, MARS, THEATRE] });
    seedProfile(fake, "guest", { [MEDIEVAL.configId]: play(2, 3600), [MARS.configId]: play(5, 600) });
    seedProfile(fake, "Alice", { [MARS.configId]: play(1, 7200) });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = key === "hallOfFame";
    }
    config.language = "en";

    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    await import("../../main.js");
    await settle();

    fake.selectFilter(HALL_OF_FAME_FILTER_ID);
    assert.deepEqual(wheelTitles(fake), ["Medieval Madness", "Attack from Mars"], "Guest's ranking");

    getProfileStore().switchTo("Alice");
    await settle();
    assert.deepEqual(wheelTitles(fake), ["Attack from Mars"], "Alice's ranking, at once");

    assertNoErrorLogged(fake);
});

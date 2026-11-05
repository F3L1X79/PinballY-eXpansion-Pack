// ============================================================
// A Play on an unconfigured table, through main.js on the fake PinballY
// globals: launched from a wheel that shows it, or as a Random Game, it is
// recorded in the Profile's plays and raises no error, though PinballY knows
// neither its manufacturer nor its year.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const GUEST_PROFILE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\guest\\profile.json";
const PLAY_MS = 2 * 60 * 1000;

const CONFIGURED = {
    id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", manufacturer: "Williams", year: 1997,
    categories: [], playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, isConfigured: true,
};
const UNCONFIGURED = {
    id: 2, configId: "Backup.Unconfigured", title: "Backup", categories: [],
    playCount: 0, playTime: 0, lastPlayed: null, rating: -1, isHidden: false, isConfigured: false,
};

test("a Play on an unconfigured table is recorded, by hand or as a Random Game, without an error", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 23, 10, 0, 0), tables: [CONFIGURED, UNCONFIGURED] });
    fake.installGlobals();
    // Every Add-on, without the startup screens a player would have to close
    // first and the Table ROMs, which read the table scripts at startup, not Plays.
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = !["startupChoicePrompt", "profilePicker", "tableRoms"].includes(key);
    }
    config.language = "en";
    config.skipRandomGameAnimation = true;

    const { getRandomGame } = await import("../../common/tables/random_game.js");
    await import("../../main.js");
    await settle();

    // PinballY's default: the wheel shows it. The fake's own wheel leaves it out.
    fake.setWheelTables([UNCONFIGURED.configId]);

    const playedCount = () => JSON.parse(fake.readFile(GUEST_PROFILE_FILE)).plays[UNCONFIGURED.configId].count;

    fake.gameStarted(UNCONFIGURED);
    await settle();
    fake.advanceTime(PLAY_MS);
    fake.gameOver(UNCONFIGURED);
    await settle();
    assert.equal(playedCount(), 1, "launched from the wheel");

    await getRandomGame().launch();
    const launched = fake.launches().at(-1);
    assert.equal(launched.configId, UNCONFIGURED.configId);
    fake.gameStarted(launched);
    await settle();
    fake.advanceTime(PLAY_MS);
    fake.gameOver(launched);
    await settle();
    assert.equal(playedCount(), 2, "launched as a Random Game");
    assert.equal(getRandomGame().getRandomGamesPlayed(), 1);

    assertNoErrorLogged(fake);
});

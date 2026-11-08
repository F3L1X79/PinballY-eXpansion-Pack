// ============================================================
// Backglass Clock, through main.js on the fake PinballY globals: the place
// the pack saved wins over an older one PinballY restores, and a place
// the owner drags to during a game holds at the next game.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };
const BACKGLASS_RECT = { left: 1080, top: 172, right: 3640, bottom: 1772 };
// As in the cabinet's Settings.txt: an older place PinballY kept restoring.
const STALE_PLACE = { left: 2240, top: 180, right: 2560, bottom: 380 };
const OWNER_PLACE = { left: 3318, top: 173, right: 3638, bottom: 373 };
const DRAGGED_PLACE = { left: 1100, top: 1500, right: 1420, bottom: 1700 };

test("a Backglass Clock goes back to the place the pack saved, not the one PinballY restores", async () => {
    const fake = createFakePinballYHost({
        tables: [TABLE], monitorCount: 2, backglassWindowRect: BACKGLASS_RECT,
        savedMediaWindowRects: { BackglassClock: STALE_PLACE },
    });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    fake.seedSettings({ "ExpansionPack.BackglassClockPlace": "3318,173,320,200" });
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "backglassClock";
    config.language = "en";

    await import("../../main.js");
    await settle();
    const [clock] = fake.mediaWindows();

    fake.playGame(TABLE);
    fake.gameStarted(TABLE);
    assert.equal(clock.isVisible(), true);
    assert.deepEqual(clock.windowRect(), OWNER_PLACE);

    clock.dragTo(DRAGGED_PLACE);
    fake.gameOver(TABLE);
    assert.equal(fake.storedSettings()["ExpansionPack.BackglassClockPlace"], "1100,1500,320,200", "saved when the game ends");
    fake.playGame(TABLE);
    fake.gameStarted(TABLE);
    assert.deepEqual(clock.windowRect(), DRAGGED_PLACE, "the place it was dragged to holds at the next game");
    assert.ok(!fake.logLines().some(line => line.includes("[BackglassClock]")), "nothing to report");
    assertNoErrorLogged(fake);
});

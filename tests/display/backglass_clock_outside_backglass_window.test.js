// ============================================================
// Backglass Clock, through main.js on the fake PinballY globals: PinballY's
// backglass window can be smaller than the screen it is on, and the owner
// can drag the clock beside it; that place holds at the next game.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };
// PinballY's backglass window, on the left part of a 2560-wide screen.
const BACKGLASS_RECT = { left: 2560, top: 0, right: 4049, bottom: 512 };
// The screen's top right corner, beside that window.
const DRAGGED_PLACE = { left: 4800, top: 0, right: 5120, bottom: 200 };

test("a Backglass Clock dragged beside PinballY's backglass window stays there", async () => {
    const fake = createFakePinballYHost({ tables: [TABLE], monitorCount: 2, backglassWindowRect: BACKGLASS_RECT });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "backglassClock";
    config.language = "en";

    await import("../../main.js");
    await settle();
    const [clock] = fake.mediaWindows();

    fake.playGame(TABLE);
    fake.gameStarted(TABLE);
    clock.dragTo(DRAGGED_PLACE);
    fake.gameOver(TABLE);
    fake.playGame(TABLE);
    fake.gameStarted(TABLE);

    assert.deepEqual(clock.windowRect(), DRAGGED_PLACE, "the place it was dragged to holds at the next game");
    assertNoErrorLogged(fake);
});

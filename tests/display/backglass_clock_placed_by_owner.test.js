// ============================================================
// Backglass Clock, through main.js on the fake PinballY globals: a window
// PinballY restores from its settings elsewhere on the backglass screen, at
// another size, moves to the chosen place at its fixed size at the next game.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };
const BACKGLASS_RECT = { left: 2560, top: 0, right: 4480, bottom: 1080 };
// Bottom right of the backglass screen, larger than the default.
const OWNER_PLACE = { left: 3900, top: 880, right: 4480, bottom: 1080 };
// The default top right: 4480 - 320 - 17, 17 down, 320x200.
const CHOSEN_PLACE = { left: 4143, top: 17, right: 4463, bottom: 217 };

test("a Backglass Clock restored elsewhere on the backglass screen moves to the chosen place at the next game", async () => {
    const fake = createFakePinballYHost({
        tables: [TABLE], monitorCount: 2, backglassWindowRect: BACKGLASS_RECT,
        savedMediaWindowRects: { BackglassClock: OWNER_PLACE },
    });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "backglassClock";
    config.language = "en";

    await import("../../main.js");
    await settle();
    const [clock] = fake.mediaWindows();
    assert.deepEqual(clock.windowRect(), OWNER_PLACE, "restored by PinballY");

    fake.playGame(TABLE);
    fake.gameStarted(TABLE);
    assert.equal(clock.isVisible(), true);
    assert.deepEqual(clock.windowRect(), CHOSEN_PLACE);
    assert.ok(!fake.logLines().some(line => line.includes("[BackglassClock]")), "nothing to report");
    assertNoErrorLogged(fake);
});

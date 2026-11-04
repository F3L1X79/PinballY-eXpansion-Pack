// ============================================================
// Backglass Clock Position, through main.js on the fake PinballY globals:
// each of the six places gives its window rect on a known backglass screen,
// at the next game. Expected values worked out by hand from the spec (#396).
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };
// 1920x1080, right of a 2560-wide playfield. Margin: 30 px at 1920 px high,
// on 1080 px high: 16.875, rounded to 17. The window comes out 320x200.
const BACKGLASS_RECT = { left: 2560, top: 0, right: 4480, bottom: 1080 };
const EXPECTED_RECTS = {
    topLeft: { left: 2577, top: 17, right: 2897, bottom: 217 },
    topCenter: { left: 3360, top: 17, right: 3680, bottom: 217 },
    topRight: { left: 4143, top: 17, right: 4463, bottom: 217 },
    bottomLeft: { left: 2577, top: 863, right: 2897, bottom: 1063 },
    bottomCenter: { left: 3360, top: 863, right: 3680, bottom: 1063 },
    bottomRight: { left: 4143, top: 863, right: 4463, bottom: 1063 },
};

test("each Backglass Clock Position gives its place on the backglass screen", async () => {
    const fake = createFakePinballYHost({ tables: [TABLE], monitorCount: 2, backglassWindowRect: BACKGLASS_RECT });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "backglassClock";
    config.language = "en";

    await import("../../main.js");
    await settle();
    const [clock] = fake.mediaWindows();

    for (const [position, expected] of Object.entries(EXPECTED_RECTS)) {
        config.backglassClockPosition = position;
        fake.playGame(TABLE);
        assert.deepEqual(clock.windowRect(), expected, position);
        fake.gameStarted(TABLE);
        assert.equal(clock.isVisible(), true, `${position}: shown`);
        fake.gameOver(TABLE);
    }
    assert.ok(!fake.logLines().some(line => line.includes("[BackglassClock]")), "nothing to report");
    assertNoErrorLogged(fake);
});

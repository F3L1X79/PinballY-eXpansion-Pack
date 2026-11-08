// ============================================================
// Backglass Clock, through main.js on the fake PinballY globals: with no
// place saved by the pack, an older one PinballY restores gives way to the
// backglass screen's top right corner, which is then saved.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };
const BACKGLASS_RECT = { left: 1080, top: 172, right: 3640, bottom: 1772 };
const STALE_PLACE = { left: 2240, top: 180, right: 2560, bottom: 380 };

test("a Backglass Clock left top middle by PinballY moves once to the top right corner", async () => {
    const fake = createFakePinballYHost({
        tables: [TABLE], monitorCount: 2, backglassWindowRect: BACKGLASS_RECT,
        savedMediaWindowRects: { BackglassClock: STALE_PLACE },
    });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "backglassClock";
    config.language = "en";

    await import("../../main.js");
    await settle();
    const [clock] = fake.mediaWindows();

    fake.playGame(TABLE);
    fake.gameStarted(TABLE);
    assert.deepEqual(clock.windowRect(), { left: 3320, top: 172, right: 3640, bottom: 372 });

    fake.gameOver(TABLE);
    assert.equal(fake.storedSettings()["ExpansionPack.BackglassClockPlace"], "3320,172,320,200");
    assertNoErrorLogged(fake);
});

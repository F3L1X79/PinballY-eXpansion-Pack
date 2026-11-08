// ============================================================
// Backglass Clock, through main.js on the fake PinballY globals: a saved
// place that can't be read is logged and gives way to the top right corner.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };
const BACKGLASS_RECT = { left: 1080, top: 172, right: 3640, bottom: 1772 };

test("an unreadable saved place sends the Backglass Clock to the top right corner", async () => {
    const fake = createFakePinballYHost({ tables: [TABLE], monitorCount: 2, backglassWindowRect: BACKGLASS_RECT });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    fake.seedSettings({ "ExpansionPack.BackglassClockPlace": "here,there" });
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "backglassClock";
    config.language = "en";

    await import("../../main.js");
    await settle();
    const [clock] = fake.mediaWindows();

    fake.playGame(TABLE);
    assert.equal(clock.windowRect().right, BACKGLASS_RECT.right);
    assert.ok(fake.logLines().some(line => line.includes("[BackglassClock]") && line.includes("here,there")), "logged");
});

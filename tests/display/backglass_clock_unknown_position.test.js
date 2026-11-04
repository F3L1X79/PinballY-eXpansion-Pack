// ============================================================
// Backglass Clock Position, through main.js on the fake PinballY globals: an
// unknown value logs one line for the game, never an error, and acts as top right.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLE = { id: 1, configId: "Medieval Madness", title: "Medieval Madness", manufacturer: "Williams", year: 1997 };
const BACKGLASS_RECT = { left: 2560, top: 0, right: 4480, bottom: 1080 };
// 4480 - 320 - 17, 17 down, 320x200.
const TOP_RIGHT = { left: 4143, top: 17, right: 4463, bottom: 217 };

test("an unknown Backglass Clock Position logs one line and acts as top right", async () => {
    const fake = createFakePinballYHost({ tables: [TABLE], monitorCount: 2, backglassWindowRect: BACKGLASS_RECT });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "backglassClock";
    config.language = "en";

    await import("../../main.js");
    await settle();
    const [clock] = fake.mediaWindows();
    const clockLines = () => fake.logLines().filter(line => line.includes("[BackglassClock]"));

    // "constructor" is a property of every object: it must not pass for a place.
    for (const [index, value] of ["middle", "constructor"].entries()) {
        config.backglassClockPosition = value;
        fake.playGame(TABLE);
        assert.deepEqual(clock.windowRect(), TOP_RIGHT, value);
        assert.equal(clock.isVisible(), true, `${value}: still shown`);
        assert.equal(clockLines().length, index + 1, `${value}: one line for this game`);
        assert.ok(clockLines()[index].includes(`"${value}"`), clockLines()[index]);
        fake.gameStarted(TABLE);
        fake.gameOver(TABLE);
    }
    assertNoErrorLogged(fake);
});

// ============================================================
// The Wheel Position through main.js with the Attract Order In Order: hidden
// through attract mode and its moves, back on the table it ended on.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownPosition } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const KEPT_SECONDS = 10;
const STEP_MS = KEPT_SECONDS * 1000;

test("the Wheel Position hides through attract mode and comes back on the table it ended on", async () => {
    const { fake } = await startWheelGuides({
        settings: { attractOrder: "inOrder" }, cabinet: { attractOrderSwitchTime: KEPT_SECONDS },
        pinballYSettings: { "AttractMode.SwitchTime": 86400 },
    });
    assert.equal(shownPosition(fake), "1/5");

    fake.enterAttractMode();
    await settle();
    assert.equal(shownPosition(fake), null);
    fake.advanceTime(STEP_MS);
    assert.equal(fake.getCurrentTable().title, "Black Knight");
    assert.equal(shownPosition(fake), null, "still hidden after a move");

    fake.exitAttractMode();
    assert.equal(shownPosition(fake), "2/5");
    assertNoErrorLogged(fake);
});

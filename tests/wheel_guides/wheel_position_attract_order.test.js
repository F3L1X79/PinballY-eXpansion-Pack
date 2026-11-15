// ============================================================
// The Wheel Position through main.js with the Attract Order In Order: the
// pack's attract moves fire no "gameselect", yet the position follows each.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownPosition } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const KEPT_SECONDS = 10;
const STEP_MS = KEPT_SECONDS * 1000;

test("the Wheel Position follows each move of the Attract Order", async () => {
    const { fake } = await startWheelGuides({
        settings: { attractOrder: "inOrder" }, cabinet: { attractOrderSwitchTime: KEPT_SECONDS },
        pinballYSettings: { "AttractMode.SwitchTime": 86400 },
    });
    assert.equal(shownPosition(fake), "1/5");

    fake.enterAttractMode();
    await settle();
    fake.advanceTime(STEP_MS);
    assert.equal(fake.getCurrentTable().title, "Black Knight");
    assert.equal(shownPosition(fake), "2/5", "shown in attract mode, on the table moved to");

    fake.advanceTime(STEP_MS);
    assert.equal(shownPosition(fake), "3/5");
    assertNoErrorLogged(fake);
});

// ============================================================
// The Wheel Rail through main.js with the Attract Order In Order: the
// pack's attract moves fire no "gameselect", yet the Rail Pill follows each.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const KEPT_SECONDS = 10;
const STEP_MS = KEPT_SECONDS * 1000;

test("the Rail Pill follows each move of the Attract Order", async () => {
    const { fake } = await startWheelGuides({
        settings: { attractOrder: "inOrder" }, cabinet: { attractOrderSwitchTime: KEPT_SECONDS },
        pinballYSettings: { "AttractMode.SwitchTime": 86400 },
    });
    assert.equal(shownRail(fake).pill, "A");

    fake.enterAttractMode();
    await settle();
    fake.advanceTime(STEP_MS);
    assert.equal(fake.getCurrentTable().title, "Black Knight");
    assert.equal(shownRail(fake).pill, "B", "shown in attract mode, on the table moved to");

    fake.advanceTime(STEP_MS);
    assert.equal(shownRail(fake).pill, "C");
    assertNoErrorLogged(fake);
});

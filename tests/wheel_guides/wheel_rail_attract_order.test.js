// ============================================================
// The Wheel Rail through main.js with the Attract Order In Order: hidden
// through attract mode and its moves, back on the table it ended on.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const KEPT_SECONDS = 10;
const STEP_MS = KEPT_SECONDS * 1000;

test("the Wheel Rail hides through attract mode and comes back on the table it ended on", async () => {
    const { fake } = await startWheelGuides({
        settings: { attractOrder: "inOrder" }, cabinet: { attractOrderSwitchTime: KEPT_SECONDS },
        pinballYSettings: { "AttractMode.SwitchTime": 86400 },
    });
    assert.equal(shownRail(fake).pill, "A");

    fake.enterAttractMode();
    await settle();
    assert.equal(shownRail(fake), null);
    fake.advanceTime(STEP_MS);
    assert.equal(fake.getCurrentTable().title, "Black Knight");
    assert.equal(shownRail(fake), null, "still hidden after a move");

    fake.exitAttractMode();
    assert.equal(shownRail(fake).pill, "B");
    assertNoErrorLogged(fake);
});

// ============================================================
// The Startup Screen is the bare wheel, with no Profile picker: the Crow is
// drawn on arriving there, even with the Achievements Add-on off, and it
// still records itself.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startCrowScenario, birds, calls, profileFile } from "./crow_scenario.js";

test("on the bare wheel the Crow flies at once, Achievements Add-on off included", async () => {
    const { fake } = await startCrowScenario({ addOns: [], startupScreen: "wheel", profiles: [] });
    fake.advanceTime(100);
    assert.equal(birds(fake).length, 1);
    assert.equal(calls(fake).length, 1);
    assert.equal(JSON.parse(fake.readFile(profileFile("guest"))).surprises.easterEggs.crow, true);
    assertNoErrorLogged(fake);
});

// ============================================================
// A missing Rocket image means no game and no win: the table launches as
// usual, nothing is spent, and the missing file is logged.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startRocketScenario, launchFromWheel, ROCKET_IMAGES, SHIP_IMAGE } from "./rocket_scenario.js";

test("without one of its images the Rocket does not play, and the table launches", async () => {
    const { fake, store, table } = await startRocketScenario({ files: ROCKET_IMAGES.filter(path => path !== SHIP_IMAGE) });
    launchFromWheel(fake, table);
    assert.deepEqual(fake.launches(), [table]);
    assert.equal(store.getProfileData().surprises, undefined, "nothing spent");
    assert.ok(fake.logLines().some(line => line.startsWith("[Rocket]") && line.includes(SHIP_IMAGE)), "the missing image is logged");
    assertNoErrorLogged(fake);
});

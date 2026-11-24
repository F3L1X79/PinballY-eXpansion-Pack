// ============================================================
// One of the Crow's images is unreadable: logged, no Crow, and nothing is
// won, and the Profile's day stays free.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startCrowScenario, crowLayers, calls, WING_IMAGES, DOT_IMAGE, CALL } from "./crow_scenario.js";

test("an unreadable image is logged, and the Crow neither plays nor records itself", async () => {
    const { fake, store } = await startCrowScenario({
        addOns: [], startupScreen: "wheel", profiles: [], files: [...WING_IMAGES, CALL], seed: host => host.addUnreadableImage(DOT_IMAGE),
    });
    fake.advanceTime(100);
    assert.deepEqual(crowLayers(fake), []);
    assert.deepEqual(calls(fake), []);
    const { easterEggs, easterEggWonDay } = store.getProfileData().surprises;
    assert.equal(easterEggs, undefined, "not won");
    assert.equal(easterEggWonDay, undefined, "the day stays free");
    assert.ok(fake.logLines().some(line => line.startsWith("[Crow]") && line.includes(DOT_IMAGE)));
    assertNoErrorLogged(fake);
});

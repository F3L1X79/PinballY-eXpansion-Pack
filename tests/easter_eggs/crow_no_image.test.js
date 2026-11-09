// ============================================================
// One of the Crow's images is unreadable: logged, no Crow, and nothing is
// spent, neither the Profile's chance nor the cabinet's day.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startCrowScenario, crowLayers, calls, WING_IMAGES, DOT_IMAGE, CALL, DAILY_FILE } from "./crow_scenario.js";

test("an unreadable image is logged, and the Crow neither plays nor records itself", async () => {
    const { fake, store } = await startCrowScenario({
        addOns: [], startupScreen: "wheel", profiles: [], files: [...WING_IMAGES, CALL], seed: host => host.addUnreadableImage(DOT_IMAGE),
    });
    fake.advanceTime(100);
    assert.deepEqual(crowLayers(fake), []);
    assert.deepEqual(calls(fake), []);
    assert.equal(store.getProfileData().surprises, undefined);
    assert.equal(fake.files.fileExists(DAILY_FILE), false);
    assert.ok(fake.logLines().some(line => line.startsWith("[Crow]") && line.includes(DOT_IMAGE)));
    assertNoErrorLogged(fake);
});

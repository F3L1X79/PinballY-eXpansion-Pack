// ============================================================
// One of the Maneki-neko's images is unreadable: logged, no cat, and the
// Profile neither wins it nor uses up its day.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startManekiScenario, moveWheelTimes, catLayers, horns, LEFT_IMAGE, RIGHT_IMAGE, HORN } from "./maneki_neko_scenario.js";

test("an unreadable image is logged, and the cat neither plays nor records itself", async () => {
    const { fake, store } = await startManekiScenario({
        files: [RIGHT_IMAGE, HORN], seed: host => host.addUnreadableImage(LEFT_IMAGE),
    });
    moveWheelTimes(fake, 13);
    fake.advanceTime(100);
    assert.deepEqual(catLayers(fake), []);
    assert.deepEqual(horns(fake), []);
    assert.equal(store.getProfileData().surprises.easterEggs, undefined, "not won");
    assert.ok(fake.logLines().some(line => line.startsWith("[ManekiNeko]") && line.includes(LEFT_IMAGE)));
    assertNoErrorLogged(fake);
});

// ============================================================
// The Maneki-neko's horn is missing: logged, and the cat plays silently.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startManekiScenario, moveWheelTimes, shownCat, horns, LEFT_IMAGE, RIGHT_IMAGE } from "./maneki_neko_scenario.js";

test("without its sound the cat plays silently, and that is logged", async () => {
    const { fake } = await startManekiScenario({ files: [LEFT_IMAGE, RIGHT_IMAGE] });
    moveWheelTimes(fake, 13);
    fake.advanceTime(100);
    assert.ok(shownCat(fake));
    assert.deepEqual(horns(fake), []);
    assert.ok(fake.logLines().some(line => line.startsWith("[ManekiNeko]") && line.includes("silently")));
    assertNoErrorLogged(fake);
});

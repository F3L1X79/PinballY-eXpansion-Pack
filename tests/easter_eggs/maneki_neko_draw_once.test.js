// ============================================================
// The Maneki-neko is drawn at one move only: lost there, it is lost until
// the next start, however lucky the next moves would have been.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startManekiScenario, moveWheelTimes, catLayers, horns } from "./maneki_neko_scenario.js";

test("a draw lost at its move is not tried again before the next start", async () => {
    const { fake } = await startManekiScenario({ forced: "" });
    moveWheelTimes(fake, 13);
    assert.deepEqual(catLayers(fake), [], "0.5 loses the 1 in 100");

    fake.random = () => 0;
    moveWheelTimes(fake, 40);
    assert.deepEqual(catLayers(fake), []);
    assert.deepEqual(horns(fake), []);
    assertNoErrorLogged(fake);
});

// ============================================================
// The Maneki-neko is drawn at one move only: lost there, it is lost until
// the next start, however lucky the next moves would have been.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startManekiScenario, moveWheelTimes, catLayers, horns } from "./maneki_neko_scenario.js";
import { winTheDrawOf } from "./winning_draw.js";

test("a draw lost at its move is not tried again before the next start", async () => {
    const { fake } = await startManekiScenario({ wins: "" });
    moveWheelTimes(fake, 13);
    assert.deepEqual(catLayers(fake), [], "the draw lost");

    await winTheDrawOf("manekiNeko");
    moveWheelTimes(fake, 40);
    assert.deepEqual(catLayers(fake), []);
    assert.deepEqual(horns(fake), []);
    assertNoErrorLogged(fake);
});

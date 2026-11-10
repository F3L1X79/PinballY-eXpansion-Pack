// ============================================================
// The Maneki-neko's latest move: the 20th, with the whole image still inside
// the central 60 % of its edge at the far end of the room left.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startManekiScenario, moveWheelTimes, catLayers, shownCat, OUT_MS } from "./maneki_neko_scenario.js";

const WINDOW_HEIGHT = 1080;

test("the 20th move is the latest, and the cat stays inside the central 60 % of its edge", async () => {
    // The fake's draw: 0.99, the last move and the far end of the room left.
    const { fake } = await startManekiScenario({ random: () => 0.99 });
    moveWheelTimes(fake, 19);
    assert.deepEqual(catLayers(fake), []);
    moveWheelTimes(fake, 1);
    fake.advanceTime(OUT_MS + 16);

    const cat = shownCat(fake);
    const centre = (0.5 - cat.position().y) * WINDOW_HEIGHT;
    const half = cat.scale().ySpan * WINDOW_HEIGHT / 2;
    assert.ok(centre - half >= WINDOW_HEIGHT * 0.2, "below the top fifth");
    assert.ok(centre + half <= WINDOW_HEIGHT * 0.8, `above the bottom fifth: ${centre + half}`);
    assertNoErrorLogged(fake);
});

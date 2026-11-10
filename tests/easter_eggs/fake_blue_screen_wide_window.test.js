// ============================================================
// On a very wide window the Fake Blue Screen's type is limited by the
// height too: every row fits in the window, none overlapping the next, and
// the block stays narrower than on a portrait window.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startBlueScreenScenario, playTable, textLayer, SILENCE_LEAD_MS } from "./fake_blue_screen_scenario.js";

// The fake measures every size alike, 7 px a character: only a window this
// flat needs the height's limit for its 14 rows.
const WINDOW = { width: 2560, height: 160 };

test("on a very wide window the rows fit the height without overlapping", async () => {
    const { fake, table } = await startBlueScreenScenario({ layoutSize: WINDOW });
    await playTable(fake, table);
    fake.advanceTime(SILENCE_LEAD_MS);
    const rows = textLayer(fake).strokes().filter(stroke => "text" in stroke).map(stroke => stroke.rect);
    assert.ok(rows.length >= 8, "every line drawn");
    for (let index = 1; index < rows.length; index++) {
        assert.ok(rows[index].y >= rows[index - 1].y + rows[index - 1].height, `row ${index} below the one before`);
    }
    const last = rows[rows.length - 1];
    assert.ok(rows[0].y >= 0 && last.y + last.height <= WINDOW.height, "inside the window");
    assert.ok(Math.max(...rows.map(row => row.x + row.width)) - Math.min(...rows.map(row => row.x)) < WINDOW.width * 0.66, "narrower than its share of the width");
    assertNoErrorLogged(fake);
});

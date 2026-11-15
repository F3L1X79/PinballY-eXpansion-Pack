// ============================================================
// The Wheel Guides Add-on off, through main.js: no layer of theirs,
// nothing acting on the wheel's moves, and the lower status line keeps its
// "Table n/total" as before the Wheel Guides.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, guideLayers, positionedMessages, railBaseLayers, railPillLayers } from "./wheel_guides_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("with the Wheel Guides off, nothing of them shows and the status line keeps its position", async () => {
    const { fake } = await startWheelGuides({ addOns: ["statusLineInfo", "customMenuCommands", "wheelOrder"] });
    fake.moveWheel(1);
    fake.fire("wheelmode");

    assert.deepEqual(guideLayers(fake), []);
    assert.deepEqual([...railBaseLayers(fake), ...railPillLayers(fake)], [], "no Wheel Rail");
    assert.ok(positionedMessages(fake).includes("Table 2/[Filter.Count] - released in [Game.Year]."));
    assert.equal(positionedMessages(fake).length, fake.lowerStatusLine().length, "every message gives the position");
    assertNoErrorLogged(fake);
});

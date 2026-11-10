// ============================================================
// With High Scores on, the Fake Blue Screen waits for the board read after
// the game to answer before it is drawn, so it never eats a result.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startBlueScreenScenario, playTable, screenLayers, isScreenShown, SILENCE_LEAD_MS } from "./fake_blue_screen_scenario.js";

// PINemHi's run, at the launch and after the game.
const READ_MS = 3000;

test("the Fake Blue Screen waits for the High Scores' read after the game", async () => {
    const { fake, table } = await startBlueScreenScenario({ addOns: ["highScores"] });
    fake.setNvramBoard(table.configId, [], { durationMs: READ_MS });
    await playTable(fake, table);
    fake.advanceTime(READ_MS);
    await settle();
    assert.deepEqual(screenLayers(fake), [], "not while the board is read again");

    let waitedMs = READ_MS;
    while (screenLayers(fake).length === 0 && waitedMs < 30000) {
        fake.advanceTime(100);
        await settle();
        waitedMs += 100;
    }
    assert.ok(waitedMs > READ_MS * 2, "after the read");
    fake.advanceTime(SILENCE_LEAD_MS);
    assert.ok(isScreenShown(fake), "then it shows");
    assertNoErrorLogged(fake);
});

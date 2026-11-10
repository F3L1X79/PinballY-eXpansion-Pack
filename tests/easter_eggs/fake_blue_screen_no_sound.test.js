// ============================================================
// The Fake Blue Screen's sound is missing: logged, and it plays silently.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startBlueScreenScenario, playTable, isScreenShown, blueScreenSounds, SILENCE_LEAD_MS } from "./fake_blue_screen_scenario.js";

test("without its sound the Fake Blue Screen plays silently, and that is logged", async () => {
    const { fake, table } = await startBlueScreenScenario({ files: [] });
    assert.ok(fake.logLines().some(line => line.startsWith("[FakeBlueScreen]") && line.includes("silently")), "known soon after startup");
    await playTable(fake, table);
    fake.advanceTime(SILENCE_LEAD_MS);
    assert.ok(isScreenShown(fake));
    assert.deepEqual(blueScreenSounds(fake), []);
    assertNoErrorLogged(fake);
});

// ============================================================
// LAUNCH_SOUND_VOLUME set in .env.local: the launch sound plays at it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { launchTwice } from "./launch_sound_scenario.js";

test("the launch sound plays at LAUNCH_SOUND_VOLUME", async () => {
    const { fake } = await launchTwice("LAUNCH_SOUND_VOLUME=30\r\n");
    assert.deepEqual(fake.soundVolumes(), [30, 30]);
    assertNoErrorLogged(fake);
});

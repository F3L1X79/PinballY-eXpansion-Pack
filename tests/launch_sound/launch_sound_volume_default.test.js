// ============================================================
// No LAUNCH_SOUND_VOLUME in .env.local: the launch sound plays at the
// default, below Windows Media Player's full volume.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { launchTwice } from "./launch_sound_scenario.js";

test("without LAUNCH_SOUND_VOLUME the launch sound plays at the default, below 100", async () => {
    const { fake, defaultVolume } = await launchTwice("");
    assert.ok(defaultVolume > 0 && defaultVolume < 100);
    assert.deepEqual(fake.soundVolumes(), [defaultVolume, defaultVolume]);
    assertNoErrorLogged(fake);
});

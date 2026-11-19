// ============================================================
// LAUNCH_SOUND_VOLUME that is not a number: the launch sound plays at the
// default, and the Error Log says so once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { launchTwice, volumeErrors } from "./launch_sound_scenario.js";

test("a volume that is not a number falls back to the default, with one Error Log line", async () => {
    const { fake, defaultVolume } = await launchTwice("LAUNCH_SOUND_VOLUME=loud\r\n");
    assert.deepEqual(fake.soundVolumes(), [defaultVolume, defaultVolume]);
    const errors = volumeErrors(fake);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /loud/);
});

// ============================================================
// Avatar Choice through main.js with an AVATAR_CHOICE_SOUND_FILE: the sound
// plays once, as the grid shows after Name Entry's OK, never while the
// screen is still getting ready nor on a move.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import config from "../../common/core/config.js";
import {
    startOnWheel, step, press, openNameEntry, enterName, moveTo, isAvatarChoiceOpen, AVATAR_CHOICE_OPEN_MS,
} from "./name_entry_scenario.js";

const AVATAR_CHOICE_SOUND = "C:\\Sounds\\pick-your-face.mp3";
const avatarChoiceSounds = fake => fake.soundsPlayed().filter(path => path === AVATAR_CHOICE_SOUND);

test("the Avatar Choice sound plays once, as the screen shows", async () => {
    config.avatarChoiceSoundFile = AVATAR_CHOICE_SOUND;
    const { fake, openPicker } = await startOnWheel({ profiles: ["Alice"], activeProfile: "Alice" });
    fake.addFile(AVATAR_CHOICE_SOUND, "sound");

    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    enterName(fake, "Max");
    moveTo(fake, "OK");
    press(fake, "Select");
    assert.equal(isAvatarChoiceOpen(fake), false, "the screen is still getting ready");
    assert.deepEqual(avatarChoiceSounds(fake), [], "silent while it gets ready");

    fake.advanceTime(AVATAR_CHOICE_OPEN_MS);
    assert.equal(isAvatarChoiceOpen(fake), true);
    assert.deepEqual(avatarChoiceSounds(fake), [AVATAR_CHOICE_SOUND]);

    press(fake, "Next");
    press(fake, "Prev");
    assert.deepEqual(avatarChoiceSounds(fake), [AVATAR_CHOICE_SOUND], "a move adds none");
    assertNoErrorLogged(fake);
});

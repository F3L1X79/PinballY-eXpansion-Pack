// ============================================================
// Avatar Choice through main.js with an AVATAR_CHOICE_SOUND_FILE that
// cannot play: the failure is logged under [AvatarChoice] and the screen
// still opens and takes a portrait.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import config from "../../common/core/config.js";
import {
    startOnWheel, step, press, openNameEntry, createThroughNameEntry, isAvatarChoiceOpen, PROFILES_FOLDER,
} from "./name_entry_scenario.js";

test("a missing Avatar Choice sound is logged and the screen still opens", async () => {
    // The file is never added: it is missing.
    config.avatarChoiceSoundFile = "C:\\Sounds\\missing.mp3";
    const { fake, openPicker } = await startOnWheel({ profiles: ["Alice"], activeProfile: "Alice" });

    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Max");
    assert.equal(isAvatarChoiceOpen(fake), true);
    press(fake, "Select");
    assert.equal(fake.files.fileExists(`${PROFILES_FOLDER}\\Max\\avatar.png`), true, "the portrait is still taken");

    const errors = errorLines(fake);
    assert.equal(errors.length, 1);
    assert.ok(errors[0].startsWith("[AvatarChoice] ERROR") && errors[0].includes("missing.mp3"), errors[0]);
});

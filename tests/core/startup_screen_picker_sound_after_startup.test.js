// ============================================================
// Startup Screen "profilePicker" with a PROFILE_PICKER_SOUND_FILE: once
// the startup carousel and the Welcome Screen are left, the carousel
// opened from the main menu plays the Profile picker sound again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { press, openFromMainMenu, isWelcomeScreenOpen, WELCOME_SCREEN_OPEN_MS } from "../welcome_screen/welcome_screen_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnProfilePicker, isCarouselOpen, PICKER_SOUND, pickerSounds, CAROUSEL_OPEN_MS } from "./startup_picker_scenario.js";

const SETTLED_MS = 3000;

test("a carousel opened from the main menu after startup plays the Profile picker sound again", async () => {
    const { fake, lang, settle } = await startOnProfilePicker({ settings: { profilePickerSoundFile: PICKER_SOUND }, files: [PICKER_SOUND] });
    await settle();
    fake.advanceTime(CAROUSEL_OPEN_MS);
    press(fake, "Exit");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.equal(isWelcomeScreenOpen(fake), true);
    press(fake, "Exit");
    await settle();
    fake.advanceTime(SETTLED_MS);
    assert.deepEqual(pickerSounds(fake), [PICKER_SOUND], "the startup one");

    await openFromMainMenu(fake, lang.profiles.menuEntry);
    assert.equal(isCarouselOpen(fake, lang), true);
    assert.deepEqual(pickerSounds(fake), [PICKER_SOUND, PICKER_SOUND], "a second sound");
    assertNoErrorLogged(fake);
});

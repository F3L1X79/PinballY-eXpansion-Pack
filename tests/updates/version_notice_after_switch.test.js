// ============================================================
// PinballY Version Notice through main.js on the fake host, on a cabinet that
// starts on a Child Profile: nothing until the Profile picker's pick makes an
// Admin Profile active, then the Notice ahead of its Welcome Screen.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnProfilePicker, isCarouselOpen, CAROUSEL_OPEN_MS, GLIDE_OVER_MS } from "../core/startup_picker_scenario.js";
import { OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { answer, shownDialog } from "../table_roms/script_reader_prompt_scenario.js";
import { PROFILES_FOLDER } from "../table_roms/table_roms_scenario.js";
import { isWelcomeScreenOpen, press, WELCOME_SCREEN_FADE_IN_MS } from "../welcome_screen/welcome_screen_reader.js";
import { BETA_11 } from "./version_notice_scenario.js";

test("a cabinet started on a Child Profile shows the Notice once an Admin Profile is picked, then the Welcome Screen", async () => {
    const { fake, lang, store, settle } = await startOnProfilePicker({
        addOns: ["startupChoicePrompt", "profilePicker", "drawnMenus"],
        profiles: ["Alice", "Kid"],
        childProfiles: ["Kid"],
        activeProfile: "Kid",
        pinballYVersion: BETA_11,
        seed: f => f.addFile(`${PROFILES_FOLDER}\\Alice\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [], isAdmin: true })),
    });
    await settle();
    fake.advanceTime(CAROUSEL_OPEN_MS);
    assert.equal(isCarouselOpen(fake, lang), true, "the Child Profile goes straight to the picker");
    assert.equal(shownDialog(fake), null);

    press(fake, "Prev");
    fake.advanceTime(GLIDE_OVER_MS);
    press(fake, "Select");
    await settle();
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(store.getActiveProfile().name, "Alice");
    assert.equal(shownDialog(fake).title, "Untested PinballY version");
    assert.equal(isWelcomeScreenOpen(fake), false, "the Welcome Screen waits for the Notice");

    await answer({ fake, settle }, "Got it");
    fake.advanceTime(WELCOME_SCREEN_FADE_IN_MS * 2);
    assert.equal(shownDialog(fake), null);
    assert.equal(isWelcomeScreenOpen(fake), true, "the Welcome Screen follows");
    assertNoErrorLogged(fake);
});

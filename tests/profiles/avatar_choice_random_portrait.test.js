// ============================================================
// Avatar Choice at creation, through Name Entry and main.js: without an
// Own Picture the last place is a "?" with its tooltip; choosing it gives
// a free portrait drawn with host.random(), never one another Profile wears.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    startOnWheel, press, step, openNameEntry, createThroughNameEntry, isAvatarChoiceOpen, currentPortrait, portraitOf, avatarChoiceTooltips,
    sizedPortraitText, PROFILES_FOLDER, RANDOM_PLACE,
} from "./name_entry_scenario.js";

test("the \"?\" in the last place gives a free portrait drawn at random", async () => {
    const { fake, lang, openPicker } = await startOnWheel({ profiles: ["Alice", "Bob"], portraitText: sizedPortraitText });
    fake.addFile(`${PROFILES_FOLDER}\\Alice\\avatar.png`, sizedPortraitText(1));

    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Maxx");
    assert.equal(isAvatarChoiceOpen(fake), true);

    assert.deepEqual(avatarChoiceTooltips(fake), [], "no tooltip on a portrait");
    press(fake, "Prev");
    press(fake, "Prev");
    assert.equal(currentPortrait(fake), RANDOM_PLACE, "the last place, just before the Exit Button");
    assert.deepEqual(avatarChoiceTooltips(fake), [lang.profiles.avatarChoice.randomPortrait]);
    assert.equal(lang.profiles.avatarChoice.randomPortrait, "A random portrait");

    // The lowest draw would give the first portrait, worn by Alice: the first free one instead.
    fake.random = () => 0;
    press(fake, "Select");
    assert.equal(isAvatarChoiceOpen(fake), false, "the \"?\" works as choosing that portrait");
    assert.equal(fake.files.readText(`${PROFILES_FOLDER}\\Maxx\\avatar.png`), sizedPortraitText(2));
    assertNoErrorLogged(fake);
});

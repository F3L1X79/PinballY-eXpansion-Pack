// ============================================================
// Avatar Choice at creation, through Name Entry and main.js: the portraits
// worn by another listed Profile, Guest included, are greyed and the marker
// skips them both ways, held flipper included; a set-aside Profile's
// portrait stays free, and the marker opens on the first free one.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    startOnWheel, press, step, openNameEntry, createThroughNameEntry, isAvatarChoiceOpen, currentPortrait, portraitOf, greyedPortraits,
    sizedPortraitText, PROFILES_FOLDER, PORTRAIT_COUNT,
} from "./name_entry_scenario.js";

test("portraits worn by other listed Profiles are greyed and skipped by the marker", async () => {
    const { fake, openPicker } = await startOnWheel({ profiles: ["Alice", "Bob", "_Old"], portraitText: sizedPortraitText });
    const wear = (name, number) => fake.addFile(`${PROFILES_FOLDER}\\${name}\\avatar.png`, sizedPortraitText(number));
    wear("Alice", 1);
    wear("guest", 3);
    wear("_Old", 4);

    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Maxx");
    assert.equal(isAvatarChoiceOpen(fake), true);

    assert.deepEqual(greyedPortraits(fake).sort(), [portraitOf(1), portraitOf(3)], "Alice's and Guest's, not the set-aside Profile's");
    assert.equal(currentPortrait(fake), portraitOf(2), "the marker opens on the first free portrait");
    press(fake, "Next");
    assert.equal(currentPortrait(fake), portraitOf(4), "Next skips a greyed portrait");
    press(fake, "Prev");
    press(fake, "Prev");
    assert.equal(currentPortrait(fake), "exit", "Prev skips the greyed first portrait to the Exit Button");
    press(fake, "Prev");
    assert.equal(currentPortrait(fake), portraitOf(PORTRAIT_COUNT));
    press(fake, "Next", true);
    press(fake, "Next", true);
    assert.equal(currentPortrait(fake), portraitOf(2), "a held flipper skips them too");

    press(fake, "Select");
    assert.equal(fake.files.readText(`${PROFILES_FOLDER}\\Maxx\\avatar.png`), sizedPortraitText(2));
    assertNoErrorLogged(fake);
});

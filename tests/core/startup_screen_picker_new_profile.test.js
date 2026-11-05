// ============================================================
// The Profile picker as the Startup Screen and its "+": Name Entry, then Avatar
// Choice, open over it with the startup state and the quiet wheel kept. Creating a Profile does
// not leave the startup carousel; picking one afterwards hands over to the
// Welcome Screen as usual. Never opens on the "+".
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { isWelcomeScreenOpen } from "../welcome_screen/welcome_screen_reader.js";
import { startOnProfilePicker, isCarouselOpen, highlightedName, CAROUSEL_OPEN_MS, GLIDE_OVER_MS } from "./startup_picker_scenario.js";
import {
    press, isNameEntryOpen, enterName, enter, passThroughAvatarChoice, portraitOf, NAME_ENTRY_OPEN_MS, PORTRAIT_COUNT,
} from "../profiles/name_entry_scenario.js";

const WELCOME_OVER_MS = 1500;
const TABLES = [{ id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", audioVolume: 90 }];

test("the startup carousel's + opens Name Entry, and the startup state is kept", async () => {
    const { fake, lang, store, settle } = await startOnProfilePicker({ tables: TABLES });
    const lowered = [{ configId: TABLES[0].configId, changes: { audioVolume: 50 } }];
    const names = [lang.profiles.guestName, "Alice", "Bob", "Max", lang.profiles.newProfile];
    for (let number = 1; number <= PORTRAIT_COUNT; number++) fake.addFile(portraitOf(number), `portrait ${number}`);
    await settle();
    fake.advanceTime(CAROUSEL_OPEN_MS);
    assert.equal(isCarouselOpen(fake, lang), true);
    assert.equal(highlightedName(fake, names), "Bob", "opens on the active Profile");

    press(fake, "Next");
    fake.advanceTime(GLIDE_OVER_MS);
    assert.equal(highlightedName(fake, names), lang.profiles.newProfile);
    press(fake, "Select");
    fake.advanceTime(NAME_ENTRY_OPEN_MS);
    assert.equal(isNameEntryOpen(fake), true);
    assert.equal(isWelcomeScreenOpen(fake), false, "the Welcome Screen does not follow yet");

    enterName(fake, "Max");
    enter(fake, "OK");
    passThroughAvatarChoice(fake);
    fake.advanceTime(WELCOME_OVER_MS);
    assert.equal(isCarouselOpen(fake, lang), true, "still the startup carousel");
    assert.equal(highlightedName(fake, names), "Max");
    assert.equal(isWelcomeScreenOpen(fake), false, "the Welcome Screen still waits");
    assert.deepEqual(fake.gameUpdates(), lowered, "the table stays lowered, one drop and no rise");

    press(fake, "Select");
    await settle();
    fake.advanceTime(WELCOME_OVER_MS);
    assert.equal(store.getActiveProfile().name, "Max", "picking it switches");
    assert.equal(isWelcomeScreenOpen(fake), true, "the Welcome Screen follows the pick");
    assertNoErrorLogged(fake);
});

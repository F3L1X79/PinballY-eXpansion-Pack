// ============================================================
// Avatar Choice at creation, through Name Entry and main.js, on a cabinet
// where another Profile wears every portrait: none is greyed, and the
// marker reaches each of them.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    startOnWheel, press, step, openNameEntry, createThroughNameEntry, currentPortrait, portraitOf, greyedPortraits, sizedPortraitText, PROFILES_FOLDER,
} from "./name_entry_scenario.js";

test("when every portrait is taken, none is greyed and all can be chosen", async () => {
    const { fake, openPicker } = await startOnWheel({ profiles: ["Alice", "Bob"], portraits: [1, 2, 3], portraitText: sizedPortraitText });
    const wear = (name, number) => fake.addFile(`${PROFILES_FOLDER}\\${name}\\avatar.png`, sizedPortraitText(number));
    wear("guest", 1);
    wear("Alice", 2);
    wear("Bob", 3);

    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Maxx");

    assert.deepEqual(greyedPortraits(fake), []);
    assert.equal(currentPortrait(fake), portraitOf(1));
    press(fake, "Next");
    assert.equal(currentPortrait(fake), portraitOf(2));
    press(fake, "Next");
    assert.equal(currentPortrait(fake), portraitOf(3));
    press(fake, "Select");
    assert.equal(fake.files.readText(`${PROFILES_FOLDER}\\Maxx\\avatar.png`), sizedPortraitText(3), "a portrait someone wears can be taken");
    assertNoErrorLogged(fake);
});

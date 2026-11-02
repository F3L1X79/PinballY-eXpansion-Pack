// ============================================================
// The Profile picker's "+" slot with no Admin Profile: last of the carousel,
// never where it opens, drawn ahead, and not mistaken for a hand-made folder
// named "+", which stays an ordinary Profile.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheel, highlighted, step, press, isNameEntryOpen, GLIDE_OVER_MS } from "./name_entry_scenario.js";

test("the + is the carousel's last slot, and a folder named + stays a Profile", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({ profiles: ["+", "Bob"], activeProfile: "Bob" });
    const label = lang.profiles.newProfile;
    const names = [lang.profiles.guestName, "+", "Bob", label];

    const drawingsBefore = fake.drawings().length;
    await openPicker();
    assert.equal(highlighted(fake, names), "Bob", "opens on the active Profile, never on the +");
    step(fake, "Next");
    assert.equal(highlighted(fake, names), label, "the + comes after the last Profile");
    assert.equal(fake.drawings().length, drawingsBefore, "the + was drawn ahead with the Profiles");
    step(fake, "Next");
    assert.equal(highlighted(fake, names), lang.profiles.guestName, "it wraps like any other slot");
    step(fake, "Next");
    assert.equal(highlighted(fake, names), "+", "the folder named + has its own slot");

    press(fake, "Select");
    fake.advanceTime(GLIDE_OVER_MS);
    assert.equal(isNameEntryOpen(fake), false, "the folder named + opens no Name Entry");
    assert.equal(store.getActiveProfile().name, "+", "it is picked as a Profile");
    assertNoErrorLogged(fake);
});

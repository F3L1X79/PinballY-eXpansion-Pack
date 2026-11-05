// ============================================================
// The Profile picker's "+" slot for Guest, alone in the Household: it opens
// on Guest, the "+" next to it, and a Profile can be created from there.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheel, highlighted, step, openNameEntry, enterName, enter, passThroughAvatarChoice } from "./name_entry_scenario.js";

test("Guest alone sees the + and creates the first Profile, staying Guest", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({ profiles: [], activeProfile: "guest" });
    const guest = lang.profiles.guestName;
    const label = lang.profiles.newProfile;
    const names = [guest, "Max", label];

    await openPicker();
    assert.equal(highlighted(fake, names), guest);
    step(fake, "Next");
    assert.equal(highlighted(fake, names), label);
    openNameEntry(fake);
    enterName(fake, "Max");
    enter(fake, "OK");
    passThroughAvatarChoice(fake);
    assert.equal(highlighted(fake, names), "Max");
    assert.equal(store.getActiveProfile().isGuest, true);
    assertNoErrorLogged(fake);
});

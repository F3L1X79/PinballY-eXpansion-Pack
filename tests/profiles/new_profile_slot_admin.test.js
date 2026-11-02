// ============================================================
// The Profile picker's "+" slot for an Admin Profile: it sees it, and stays
// itself after creating a Profile.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheel, highlighted, step, openNameEntry, enterName, enter } from "./name_entry_scenario.js";

test("an Admin Profile sees the + and stays active after creating a Profile", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({ profiles: ["Alice", "Bob"], admins: ["Bob"], activeProfile: "Bob" });
    const label = lang.profiles.newProfile;
    const names = [lang.profiles.guestName, "Alice", "Bob", "Kid", label];

    await openPicker();
    step(fake, "Next");
    assert.equal(highlighted(fake, names), label);
    openNameEntry(fake);
    enterName(fake, "Kid");
    enter(fake, "OK");
    assert.equal(highlighted(fake, names), "Kid");
    assert.equal(store.getActiveProfile().name, "Bob");
    assert.equal(store.isAdmin(), true);
    assertNoErrorLogged(fake);
});

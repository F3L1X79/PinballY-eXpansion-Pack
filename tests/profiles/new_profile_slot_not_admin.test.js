// ============================================================
// The Profile picker's "+" slot once the Household has an Admin Profile: a
// Profile that is not one does not see it, and the carousel wraps without it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheel, highlighted, step } from "./name_entry_scenario.js";

test("with an Admin Profile, another Profile has no + in the carousel", async () => {
    const { fake, lang, openPicker } = await startOnWheel({ profiles: ["Alice", "Bob"], admins: ["Alice"], activeProfile: "Bob" });
    const names = [lang.profiles.guestName, "Alice", "Bob", lang.profiles.newProfile];

    await openPicker();
    assert.equal(highlighted(fake, names), "Bob");
    step(fake, "Next");
    assert.equal(highlighted(fake, names), lang.profiles.guestName, "Next wraps from the last Profile to Guest");
    assertNoErrorLogged(fake);
});

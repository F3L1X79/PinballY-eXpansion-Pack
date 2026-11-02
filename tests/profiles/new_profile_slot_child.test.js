// ============================================================
// The Profile picker's "+" slot for a Child Profile with no Admin Profile in
// the Household: it sees the setup entries, so it sees the "+" too.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheel, highlighted, step } from "./name_entry_scenario.js";

test("with no Admin Profile, a Child Profile sees the +", async () => {
    const { fake, lang, openPicker } = await startOnWheel({ profiles: ["Alice", "Bob"], children: ["Bob"], activeProfile: "Bob" });
    const names = [lang.profiles.guestName, "Alice", "Bob", lang.profiles.newProfile];

    await openPicker();
    assert.equal(highlighted(fake, names), "Bob");
    step(fake, "Next");
    assert.equal(highlighted(fake, names), lang.profiles.newProfile);
    assertNoErrorLogged(fake);
});

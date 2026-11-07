// ============================================================
// The Rating Plate follows Change Player, through main.js on the fake
// PinballY globals: the next Profile's Rating of the selected table, no
// plate when it has not rated it, and the first one's back again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, shownRating, TABLES } from "./rating_plate_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const [MEDIEVAL, MARS] = TABLES;

test("Change Player shows the next Profile's Rating on the plate", async () => {
    const fake = await startScenario({
        addOns: ["profilePicker", "profileRatings"],
        ratings: { Alice: { [MEDIEVAL.configId]: 5 }, Bob: { [MEDIEVAL.configId]: 1.5 }, Carol: { [MARS.configId]: 3 } },
        active: "Alice",
    });
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    assert.equal(shownRating(fake), 5);

    getProfileStore().switchTo("Bob");
    await settle();
    assert.equal(shownRating(fake), 1.5, "Bob's Rating");
    getProfileStore().switchTo("Carol");
    await settle();
    assert.equal(shownRating(fake), null, "Carol has not rated it");
    getProfileStore().switchTo("Alice");
    await settle();
    assert.equal(shownRating(fake), 5);
    assertNoErrorLogged(fake);
});

// ============================================================
// The Household family through main.js on the fake PinballY globals: each
// credited Household Challenge is checked right after its toast, for the
// Profile that completed it and for a helper credited on its next arrival.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHouseholdScenario, TABLES } from "./household_family_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("a credit reaching a step announces it after the Household Challenge Toast, for the completer and for a helper on arrival", async () => {
    const { fake, familySteps, isHouseholdToast, newToasts, play, switchTo } = await startHouseholdScenario({
        profiles: { Alice: { notified: ["householdCompleted:1"], householdChallenge: { creditedCount: 4 } }, Bob: {} },
        active: "Bob",
    });
    // Whether the Household Challenge Toast shows before the family's.
    const householdFirst = toasts => toasts.findIndex(isHouseholdToast) !== -1
        && toasts.findIndex(isHouseholdToast) < toasts.findIndex(toast => familySteps([toast]).length > 0);
    await newToasts();
    await play(TABLES[0]);
    await switchTo("Alice");
    await play(TABLES[1]);

    const aliceToasts = await newToasts();
    assert.deepEqual(familySteps(aliceToasts), [5]);
    assert.equal(householdFirst(aliceToasts), true, "the Household Challenge Toast first");

    await switchTo("Bob");
    const bobToasts = await newToasts();
    assert.deepEqual(familySteps(bobToasts), [1]);
    assert.equal(householdFirst(bobToasts), true);
    assertNoErrorLogged(fake);
});

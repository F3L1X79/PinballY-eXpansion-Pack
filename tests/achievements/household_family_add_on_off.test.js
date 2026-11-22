// ============================================================
// With the Household Challenge Add-on off, through main.js on the fake
// PinballY globals: neither the Household family nor the Household frame
// exists, whatever the Profile's credited count.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHouseholdScenario } from "./household_family_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("with the Household Challenge off, the Household family and frame are absent", async () => {
    const { fake, familySteps, getAllAchievements, profileRewards, newToasts } = await startHouseholdScenario({
        profiles: { Alice: { householdChallenge: { creditedCount: 30 } } },
        addOns: [],
    });

    assert.deepEqual(familySteps(await newToasts()), []);
    assert.deepEqual(getAllAchievements().filter(({ id }) => id.startsWith("householdCompleted:")), []);
    assert.deepEqual(profileRewards.framesOf().filter(frame => frame.id === "household"), []);
    assertNoErrorLogged(fake);
});

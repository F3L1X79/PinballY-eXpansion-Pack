// ============================================================
// The Household frame through main.js on the fake PinballY globals: the
// 15th credited Household Challenge toasts the frame after the Household
// Challenge Toast, with its Achievement; it shows unlocked in the frame
// list, and a Profile Reset locks it again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startHouseholdScenario, TABLES } from "../achievements/household_family_scenario.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const FRAME_TOAST = "HOUSEHOLD FRAME | New frame: Household | 15 Household Challenges won together";
const householdFrame = profileRewards => profileRewards.framesOf().find(frame => frame.id === "household");

test("the 15th credit toasts the Household frame and unlocks it; a Profile Reset takes it back", async () => {
    const { fake, store, familySteps, isHouseholdToast, profileRewards, newToasts, play } = await startHouseholdScenario({
        profiles: { Alice: { notified: ["householdCompleted:1", "householdCompleted:5"], householdChallenge: { creditedCount: 14 } } },
        target: 1,
    });
    await newToasts();
    assert.equal(householdFrame(profileRewards).isUnlocked, false, "14 credits");

    await play(TABLES[0]);
    const toasts = await newToasts();
    assert.equal(isHouseholdToast(toasts[0]), true);
    assert.equal(toasts[1], FRAME_TOAST);
    assert.deepEqual(familySteps(toasts), [15]);
    const drawing = toastDrawings(fake).find(candidate => candidate.texts[0] === "HOUSEHOLD FRAME");
    assert.equal(drawing.images.some(path => path.endsWith("\\frame_household_192.png")), true, "the tile shows the frame");
    assert.equal(householdFrame(profileRewards).isUnlocked, true);

    store.resetProfile("Alice");
    assert.equal(householdFrame(profileRewards).isUnlocked, false);
    assertNoErrorLogged(fake);
});

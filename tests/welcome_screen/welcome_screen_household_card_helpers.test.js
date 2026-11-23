// ============================================================
// Welcome Screen Household Challenge card's helpers line: "Helped:" and the
// Avatars of every Profile that moved it forward, in the Household Stats'
// column order (the active Profile, then the Profile picker's), Guest last.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { cardTexts, cardImages } from "./welcome_screen_reader.js";
import { startWithChallenge, householdGame, avatarOf, PROFILES, WEEK, STERN_A, STERN_B, DAY_TABLE } from "./challenge_card_scenario.js";

const GUEST_AVATAR = `${PROFILES}\\Guest\\avatar.png`;

test("the helpers line shows every helper's Avatar in the Household Stats' order, Guest last", async () => {
    const fake = await startWithChallenge({
        household: {
            week: WEEK, template: "activeDays", param: null, target: 4,
            games: [householdGame("Guest", STERN_A), householdGame("Zoe", STERN_B), householdGame("Bob", DAY_TABLE), householdGame("Alice", STERN_A)],
        },
        others: ["Bob", "Zoe", "Carl"],
        files: Object.fromEntries([avatarOf("Alice"), avatarOf("Bob"), avatarOf("Zoe"), avatarOf("Carl"), GUEST_AVATAR].map(path => [path, "png"])),
        addOns: ["startupChoicePrompt", "profilePicker", "householdChallenge"],
    });

    const household = cardTexts(fake)[2];
    assert.equal(household[0], "HOUSEHOLD CHALLENGE");
    assert.equal(household[household.length - 1], "Helped:");
    assert.deepEqual(cardImages(fake)[2], [avatarOf("Alice"), avatarOf("Bob"), avatarOf("Zoe"), GUEST_AVATAR]);
    assertNoErrorLogged(fake);
});

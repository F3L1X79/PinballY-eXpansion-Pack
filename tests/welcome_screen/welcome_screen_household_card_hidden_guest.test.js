// ============================================================
// Welcome Screen Household Challenge card's helpers line with a Hidden
// Guest: hidden from Manage profiles, Guest's Avatar leaves the line while
// its Plays still count for the Household Challenge; shown again, it is back.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { cardTexts, cardImages, press, openFromMainMenu } from "./welcome_screen_reader.js";
import { startWithChallenge, householdGame, avatarOf, PROFILES, WEEK, STERN_A, STERN_B } from "./challenge_card_scenario.js";

const GUEST_AVATAR = `${PROFILES}\\Guest\\avatar.png`;

test("a Hidden Guest leaves the helpers line, its Plays still counted, and comes back once shown", async () => {
    const fake = await startWithChallenge({
        household: {
            week: WEEK, template: "activeDays", param: null, target: 4,
            games: [householdGame("Guest", STERN_A), householdGame("Bob", STERN_B), householdGame("Alice", STERN_A)],
        },
        profile: { isAdmin: true },
        others: ["Bob"],
        files: Object.fromEntries([avatarOf("Alice"), avatarOf("Bob"), GUEST_AVATAR].map(path => [path, "png"])),
        addOns: ["startupChoicePrompt", "profilePicker", "householdChallenge", "customMenuCommands"],
    });
    const { default: lang } = await import("../../common/core/i18n.js");
    const TEXT = lang.profileReset;
    const flipGuestHidden = async isHidden => {
        press(fake, "Exit");
        await settle();
        fake.openOperatorMenu();
        fake.selectMenuItem(TEXT.menuEntry);
        fake.selectMenuItem(lang.profiles.guestName);
        fake.selectMenuItem(TEXT.hiddenLine(!isHidden));
        fake.selectMenuItem(TEXT.back);
        await openFromMainMenu(fake, lang.welcomeScreen.menuEntry);
    };
    const progressBefore = cardTexts(fake)[2];
    assert.deepEqual(cardImages(fake)[2], [avatarOf("Alice"), avatarOf("Bob"), GUEST_AVATAR]);

    await flipGuestHidden(true);
    assert.deepEqual(cardImages(fake)[2], [avatarOf("Alice"), avatarOf("Bob")], "no Hidden Guest among the helpers");
    assert.deepEqual(cardTexts(fake)[2], progressBefore, "its Plays still count");

    await flipGuestHidden(false);
    assert.deepEqual(cardImages(fake)[2], [avatarOf("Alice"), avatarOf("Bob"), GUEST_AVATAR], "back once shown");
    assertNoErrorLogged(fake);
});

// ============================================================
// Avatar Choice from My Profile, through main.js: when the other Profiles
// wear every portrait, the chooser's own among them, none is greyed.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    startOnWheel, press, isAvatarChoiceOpen, currentPortrait, portraitOf, greyedPortraits, sizedPortraitText, PROFILES_FOLDER, AVATAR_CHOICE_OPEN_MS,
} from "./name_entry_scenario.js";
import { openProfileStats, choose } from "../stats/profile_stats_reader.js";

test("when the others wear every portrait, the chooser's own included, none is greyed", async () => {
    const { fake, lang } = await startOnWheel({ addOns: ["profilePicker", "achievements"], portraits: [1, 2], portraitText: sizedPortraitText });
    fake.addFile(`${PROFILES_FOLDER}\\Bob\\avatar.png`, sizedPortraitText(1));
    fake.addFile(`${PROFILES_FOLDER}\\Alice\\avatar.png`, sizedPortraitText(1));
    fake.addFile(`${PROFILES_FOLDER}\\guest\\avatar.png`, sizedPortraitText(2));

    openProfileStats(fake, lang);
    choose(fake, lang.profileStats.changeAvatar);
    fake.advanceTime(AVATAR_CHOICE_OPEN_MS);
    assert.equal(isAvatarChoiceOpen(fake), true);
    assert.deepEqual(greyedPortraits(fake), []);
    assert.equal(currentPortrait(fake), portraitOf(1), "on Bob's own portrait");
    press(fake, "Next");
    assert.equal(currentPortrait(fake), portraitOf(2), "Guest's can be reached");
    assertNoErrorLogged(fake);
});

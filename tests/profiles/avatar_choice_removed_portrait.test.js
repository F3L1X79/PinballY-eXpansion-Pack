// ============================================================
// Avatar Choice from My Profile, through main.js, on a cabinet still
// holding the removed 24th portrait: it is not shown, and a Profile
// wearing it wears no portrait: the marker opens on the first place and
// nothing is greyed for another Profile wearing it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    startOnWheel, isAvatarChoiceOpen, currentPortrait, placesShown, greyedPortraits, portraitOf, sizedPortraitText, PROFILES_FOLDER,
    PORTRAIT_COUNT, RANDOM_PLACE, AVATAR_CHOICE_OPEN_MS,
} from "./name_entry_scenario.js";
import { openProfileStats, choose } from "../stats/profile_stats_reader.js";

const REMOVED = PORTRAIT_COUNT + 1;

test("the removed portrait is not shown, and wearing it is wearing no portrait", async () => {
    const portraits = Array.from({ length: REMOVED }, (_, index) => index + 1);
    const { fake, lang } = await startOnWheel({ addOns: ["profilePicker", "achievements"], portraits, portraitText: sizedPortraitText });
    fake.addFile(`${PROFILES_FOLDER}\\Bob\\avatar.png`, sizedPortraitText(REMOVED));
    fake.addFile(`${PROFILES_FOLDER}\\Alice\\avatar.png`, sizedPortraitText(REMOVED));

    openProfileStats(fake, lang);
    choose(fake, lang.profileStats.changeAvatar);
    fake.advanceTime(AVATAR_CHOICE_OPEN_MS);
    assert.equal(isAvatarChoiceOpen(fake), true);

    assert.equal(placesShown(fake).length, PORTRAIT_COUNT + 1, "24 places");
    assert.equal(placesShown(fake)[PORTRAIT_COUNT], RANDOM_PLACE, "the last one special");
    assert.ok(!placesShown(fake).includes(portraitOf(REMOVED)));
    assert.equal(currentPortrait(fake), portraitOf(1), "the marker on the first place");
    assert.deepEqual(greyedPortraits(fake), []);
    assertNoErrorLogged(fake);
});

// ============================================================
// Avatar Choice from My Profile, through main.js: the Profile's own
// portrait is not greyed even when another Profile wears it too, the
// marker opens on it, and choosing it again leaves the files as they were.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    startOnWheel, press, isAvatarChoiceOpen, currentPortrait, portraitOf, greyedPortraits, sizedPortraitText, PROFILES_FOLDER, AVATAR_CHOICE_OPEN_MS,
} from "./name_entry_scenario.js";
import { openProfileStats, choose, isProfileStatsOpen, PROFILE_STATS_OPEN_MS } from "../stats/profile_stats_reader.js";

const BOB_AVATAR = `${PROFILES_FOLDER}\\Bob\\avatar.png`;

test("the Profile's own portrait is not greyed, opens selected, and choosing it changes nothing", async () => {
    const { fake, lang } = await startOnWheel({ addOns: ["profilePicker", "achievements"], portraitText: sizedPortraitText });
    fake.addFile(BOB_AVATAR, sizedPortraitText(5));
    fake.addFile(`${PROFILES_FOLDER}\\Alice\\avatar.png`, sizedPortraitText(5));
    fake.addFile(`${PROFILES_FOLDER}\\guest\\avatar.png`, sizedPortraitText(6));

    openProfileStats(fake, lang);
    choose(fake, lang.profileStats.changeAvatar);
    fake.advanceTime(AVATAR_CHOICE_OPEN_MS);
    assert.equal(isAvatarChoiceOpen(fake), true);
    assert.deepEqual(greyedPortraits(fake), [portraitOf(6)], "Bob's own portrait stays free, though Alice wears it too");
    assert.equal(currentPortrait(fake), portraitOf(5), "the marker opens on it");
    press(fake, "Next");
    assert.equal(currentPortrait(fake), portraitOf(7), "Guest's is skipped in change mode too");
    press(fake, "Prev");

    const logBefore = fake.logLines().length;
    press(fake, "Select");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.equal(isProfileStatsOpen(fake), true, "back on My Profile");
    assert.equal(fake.files.readText(BOB_AVATAR), sizedPortraitText(5));
    assert.ok(!fake.logLines().slice(logBefore).some(line => line.includes("was given the Avatar")), "no copy is made");
    assertNoErrorLogged(fake);
});

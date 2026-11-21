// ============================================================
// Avatar Choice from My Profile, through main.js, for a Profile whose Own
// Picture is set aside (avatar.jpg.bak): the last place shows it, and
// choosing it renames it back to avatar.jpg, worn again at once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    startOnWheel, press, isAvatarChoiceOpen, currentPortrait, placesShown, portraitOf, sizedPortraitText, PROFILES_FOLDER, PORTRAIT_COUNT,
    AVATAR_CHOICE_OPEN_MS,
} from "./name_entry_scenario.js";
import { openProfileStats, choose, cardImages, isProfileStatsOpen, PROFILE_STATS_OPEN_MS } from "../stats/profile_stats_reader.js";

const BOB = `${PROFILES_FOLDER}\\Bob`;
const BADGE_Z_INDEX = 4500;

test("the set-aside Own Picture chosen in the last place is worn again", async () => {
    const { fake, lang } = await startOnWheel({ addOns: ["profilePicker", "achievements"], portraitText: sizedPortraitText });
    fake.addFile(`${BOB}\\avatar.png`, sizedPortraitText(PORTRAIT_COUNT));
    fake.addFile(`${BOB}\\avatar.jpg.bak`, "Bob's photo");

    openProfileStats(fake, lang);
    choose(fake, lang.profileStats.changeAvatar);
    fake.advanceTime(AVATAR_CHOICE_OPEN_MS);
    assert.equal(isAvatarChoiceOpen(fake), true);
    assert.equal(placesShown(fake)[PORTRAIT_COUNT], `${BOB}\\avatar.jpg.bak`);
    assert.equal(currentPortrait(fake), portraitOf(PORTRAIT_COUNT), "on the portrait worn");

    press(fake, "Next");
    assert.equal(currentPortrait(fake), `${BOB}\\avatar.jpg.bak`);
    const badgeDrawings = fake.drawings().filter(drawing => drawing.zIndex === BADGE_Z_INDEX).length;
    press(fake, "Select");
    assert.equal(fake.files.readText(`${BOB}\\avatar.jpg`), "Bob's photo");
    assert.equal(fake.files.fileExists(`${BOB}\\avatar.jpg.bak`), false);
    const badgeAfter = fake.drawings().filter(drawing => drawing.zIndex === BADGE_Z_INDEX).slice(badgeDrawings);
    assert.ok(badgeAfter.some(drawing => drawing.images.includes(`${BOB}\\avatar.jpg`)), "the Profile Badge wears the photo at once");

    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.equal(isProfileStatsOpen(fake), true);
    assert.ok(cardImages(fake).includes(`${BOB}\\avatar.jpg`), "My Profile shows it");
    assertNoErrorLogged(fake);
});

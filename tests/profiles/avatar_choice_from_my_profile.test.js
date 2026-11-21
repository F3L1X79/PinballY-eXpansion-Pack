// ============================================================
// Avatar Choice opened from My Profile, through main.js: the Avatar comes
// right after the Exit Button with its tooltip, Select opens Avatar Choice
// on the portrait worn (recognised by its size), a portrait taken comes back
// on My Profile wearing it, the marker on the Avatar, and the Profile Badge
// and the Change Player carousel show it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    startOnWheel, press, isAvatarChoiceOpen, currentPortrait, portraitOf, pickerAvatars, PROFILES_FOLDER, AVATAR_CHOICE_OPEN_MS,
} from "./name_entry_scenario.js";
import { openProfileStats, readChoices, highlighted, choose, cardImages, isProfileStatsOpen, PROFILE_STATS_OPEN_MS } from "../stats/profile_stats_reader.js";

const BADGE_Z_INDEX = 4500;
const PICKER_AVATAR_Z_INDEX = 6501;
const BOB_AVATAR = `${PROFILES_FOLDER}\\Bob\\avatar.png`;
// A size of its own for each portrait.
const portraitText = number => `portrait ${"#".repeat(number)}`;
const drawingsAt = (fake, zIndex) => fake.drawings().filter(drawing => drawing.zIndex === zIndex);

test("the Avatar on My Profile opens Avatar Choice, and the portrait taken shows everywhere", async () => {
    const { fake, lang, openPicker } = await startOnWheel({ addOns: ["profilePicker", "achievements"], portraitText });
    fake.addFile(BOB_AVATAR, portraitText(5));
    const TEXT = lang.profileStats;

    openProfileStats(fake, lang);
    const choices = readChoices(fake);
    assert.deepEqual(choices.slice(0, 2), [lang.buttonHints.back, TEXT.changeAvatar], "the Avatar right after the Exit Button");
    assert.ok(choices.includes(TEXT.buttons.achievements), "then the buttons");
    assert.equal(TEXT.changeAvatar, "Change Avatar");

    choose(fake, TEXT.changeAvatar);
    fake.advanceTime(AVATAR_CHOICE_OPEN_MS);
    assert.equal(isProfileStatsOpen(fake), false, "My Profile makes way");
    assert.equal(isAvatarChoiceOpen(fake), true);
    assert.equal(currentPortrait(fake), portraitOf(5), "on the portrait worn");

    const badgeDrawings = drawingsAt(fake, BADGE_Z_INDEX).length;
    press(fake, "Prev");
    press(fake, "Prev");
    press(fake, "Prev");
    assert.equal(currentPortrait(fake), portraitOf(2));
    const carouselDrawings = drawingsAt(fake, PICKER_AVATAR_Z_INDEX).length;
    press(fake, "Select");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.equal(isAvatarChoiceOpen(fake), false);
    assert.equal(fake.files.readText(BOB_AVATAR), portraitText(2), "Bob wears the portrait taken");
    assert.equal(isProfileStatsOpen(fake), true, "back on My Profile");
    assert.equal(highlighted(fake), TEXT.changeAvatar, "the marker on the Avatar");
    assert.ok(cardImages(fake).includes(BOB_AVATAR));
    const badgeAfter = drawingsAt(fake, BADGE_Z_INDEX).slice(badgeDrawings);
    assert.ok(badgeAfter.some(drawing => drawing.images.includes(BOB_AVATAR)), "the Profile Badge is drawn again");

    press(fake, "Exit");
    await openPicker();
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.ok(drawingsAt(fake, PICKER_AVATAR_Z_INDEX).slice(carouselDrawings).some(drawing => drawing.images.includes(BOB_AVATAR)),
        "the carousel draws Bob's new Avatar again");
    assert.ok(pickerAvatars(fake).includes(BOB_AVATAR));

    assertNoErrorLogged(fake);
});

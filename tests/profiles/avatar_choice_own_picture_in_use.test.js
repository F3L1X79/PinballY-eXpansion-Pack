// ============================================================
// Avatar Choice from My Profile, through main.js, for a Profile wearing
// its Own Picture (avatar.jpg): the last place shows it, without tooltip,
// and the marker opens there; choosing it changes nothing, and choosing a
// portrait sets the photo aside as avatar.jpg.bak after the copy.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    startOnWheel, press, isAvatarChoiceOpen, currentPortrait, placesShown, avatarChoiceTooltips, portraitOf, PROFILES_FOLDER, PORTRAIT_COUNT,
    AVATAR_CHOICE_OPEN_MS,
} from "./name_entry_scenario.js";
import { openProfileStats, choose, isProfileStatsOpen, PROFILE_STATS_OPEN_MS } from "../stats/profile_stats_reader.js";

const BOB = `${PROFILES_FOLDER}\\Bob`;

test("the Own Picture in use shows in the last place, and a portrait sets it aside", async () => {
    const { fake, lang } = await startOnWheel({ addOns: ["profilePicker", "achievements"] });
    fake.addFile(`${BOB}\\avatar.jpg`, "Bob's photo");
    const openAvatarChoice = () => {
        choose(fake, lang.profileStats.changeAvatar);
        fake.advanceTime(AVATAR_CHOICE_OPEN_MS);
        assert.equal(isAvatarChoiceOpen(fake), true);
    };

    openProfileStats(fake, lang);
    openAvatarChoice();
    assert.equal(placesShown(fake)[PORTRAIT_COUNT], `${BOB}\\avatar.jpg`, "the last place shows the photo");
    assert.equal(currentPortrait(fake), `${BOB}\\avatar.jpg`, "the marker opens on it");
    assert.deepEqual(avatarChoiceTooltips(fake), [], "no tooltip on the Own Picture");

    const operationsBefore = fake.fileOperations().length;
    press(fake, "Select");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.equal(isProfileStatsOpen(fake), true, "back on My Profile");
    assert.equal(fake.fileOperations().length, operationsBefore, "choosing the Own Picture in use changes nothing");

    openAvatarChoice();
    press(fake, "Next");
    press(fake, "Next");
    assert.equal(currentPortrait(fake), portraitOf(1));
    press(fake, "Select");
    assert.equal(fake.files.readText(`${BOB}\\avatar.png`), "portrait 1");
    assert.equal(fake.files.fileExists(`${BOB}\\avatar.jpg`), false);
    assert.equal(fake.files.readText(`${BOB}\\avatar.jpg.bak`), "Bob's photo", "the photo is set aside, not deleted");

    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    openAvatarChoice();
    assert.equal(placesShown(fake)[PORTRAIT_COUNT], `${BOB}\\avatar.jpg.bak`, "offered back in the last place");
    assert.equal(currentPortrait(fake), portraitOf(1), "the marker on the portrait worn");
    assertNoErrorLogged(fake);
});

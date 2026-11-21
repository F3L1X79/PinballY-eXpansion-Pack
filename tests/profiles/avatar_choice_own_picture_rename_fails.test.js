// ============================================================
// Avatar Choice from My Profile, through main.js, the Own Picture in use
// locked: a portrait chosen cannot set it aside, which is logged, and the
// Profile keeps wearing its photo.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { startOnWheel, press, isAvatarChoiceOpen, currentPortrait, portraitOf, PROFILES_FOLDER, AVATAR_CHOICE_OPEN_MS } from "./name_entry_scenario.js";
import { openProfileStats, choose, isProfileStatsOpen, PROFILE_STATS_OPEN_MS } from "../stats/profile_stats_reader.js";

const OWN_PICTURE = `${PROFILES_FOLDER}\\Bob\\avatar.jpg`;

test("an Own Picture that cannot be set aside is logged and still worn", async () => {
    const { fake, lang, store } = await startOnWheel({ addOns: ["profilePicker", "achievements"] });
    fake.addFile(OWN_PICTURE, "Bob's photo");

    openProfileStats(fake, lang);
    choose(fake, lang.profileStats.changeAvatar);
    fake.advanceTime(AVATAR_CHOICE_OPEN_MS);
    assert.equal(isAvatarChoiceOpen(fake), true);
    press(fake, "Next");
    press(fake, "Next");
    assert.equal(currentPortrait(fake), portraitOf(1));
    fake.lockFile(OWN_PICTURE);
    press(fake, "Select");

    assert.equal(errorLines(fake).length, 1, "the failed rename is logged");
    assert.match(errorLines(fake)[0], /\[AvatarChoice\].*Permission denied/);
    assert.equal(fake.files.readText(OWN_PICTURE), "Bob's photo");
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.equal(isProfileStatsOpen(fake), true);
    assert.equal(store.listProfiles().find(profile => profile.name === "Bob").avatarPath, OWN_PICTURE, "the photo is still worn");
});

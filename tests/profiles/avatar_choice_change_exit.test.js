// ============================================================
// Avatar Choice opened from My Profile by Guest, through main.js: an Avatar
// that is no portrait opens on the first one; Exit, or Select on the Exit
// Button, closes at once without the panel, back on My Profile on the Avatar;
// attract mode closes both; none changes anything. Select gives Guest the portrait.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    startOnWheel, press, isAvatarChoiceOpen, isConfirmationOpen, currentPortrait, portraitOf, PROFILES_FOLDER, AVATAR_CHOICE_OPEN_MS,
} from "./name_entry_scenario.js";
import { openProfileStats, highlighted, choose, isProfileStatsOpen, PROFILE_STATS_OPEN_MS } from "../stats/profile_stats_reader.js";

const GUEST_AVATAR = `${PROFILES_FOLDER}\\Guest\\avatar.png`;

test("from My Profile, Exit leaves Avatar Choice at once and changes nothing", async () => {
    const { fake, lang } = await startOnWheel({ profiles: ["Guest", "Alice"], activeProfile: "Guest", addOns: ["profilePicker", "achievements"] });
    const { changeAvatar } = lang.profileStats;
    const openAvatarChoice = () => {
        choose(fake, changeAvatar);
        fake.advanceTime(AVATAR_CHOICE_OPEN_MS);
        assert.equal(isAvatarChoiceOpen(fake), true);
    };
    const assertBackOnMyProfile = what => {
        assert.equal(isAvatarChoiceOpen(fake), false, what);
        assert.equal(isConfirmationOpen(fake), false, `${what}, without the panel`);
        fake.advanceTime(PROFILE_STATS_OPEN_MS);
        assert.equal(isProfileStatsOpen(fake), true);
        assert.equal(highlighted(fake), changeAvatar, "on the Avatar");
        assert.equal(fake.files.fileExists(GUEST_AVATAR), false, "Guest keeps its Avatar");
    };

    openProfileStats(fake, lang);
    openAvatarChoice();
    assert.equal(currentPortrait(fake), portraitOf(1), "an Avatar that is no portrait: on the first one");
    press(fake, "Exit");
    assertBackOnMyProfile("Exit closes");

    openAvatarChoice();
    press(fake, "Prev");
    assert.equal(currentPortrait(fake), "exit");
    press(fake, "Select");
    assertBackOnMyProfile("the Exit Button closes");

    openAvatarChoice();
    fake.fire("attractmodestart");
    assert.equal(isAvatarChoiceOpen(fake), false);
    fake.advanceTime(PROFILE_STATS_OPEN_MS);
    assert.equal(isProfileStatsOpen(fake), false, "attract mode closes My Profile too");
    assert.equal(fake.files.fileExists(GUEST_AVATAR), false);

    openProfileStats(fake, lang);
    openAvatarChoice();
    press(fake, "Select");
    assert.equal(fake.files.readText(GUEST_AVATAR), "portrait 1", "Guest takes a portrait like any Profile");

    assertNoErrorLogged(fake);
});

// ============================================================
// Avatar Choice opened from My Profile without a readable portrait,
// through main.js: its opening is given up, logged, and My Profile comes
// back on the Avatar, the Profile's Avatar unchanged.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { startOnWheel, isAvatarChoiceOpen, PROFILES_FOLDER } from "./name_entry_scenario.js";
import { openProfileStats, highlighted, choose, isProfileStatsOpen, PROFILE_STATS_OPEN_MS } from "../stats/profile_stats_reader.js";

test("a failed opening of Avatar Choice comes back on My Profile", async () => {
    const { fake, lang } = await startOnWheel({ portraits: [], addOns: ["profilePicker", "achievements"] });
    const { changeAvatar } = lang.profileStats;

    openProfileStats(fake, lang);
    choose(fake, changeAvatar);
    fake.advanceTime(PROFILE_STATS_OPEN_MS);

    assert.equal(isAvatarChoiceOpen(fake), false);
    assert.equal(isProfileStatsOpen(fake), true, "back on My Profile");
    assert.equal(highlighted(fake), changeAvatar, "on the Avatar");
    assert.equal(fake.files.fileExists(`${PROFILES_FOLDER}\\Bob\\avatar.png`), false);
    assert.equal(errorLines(fake).length, 1);
    assert.match(errorLines(fake)[0], /No readable portrait/);
});

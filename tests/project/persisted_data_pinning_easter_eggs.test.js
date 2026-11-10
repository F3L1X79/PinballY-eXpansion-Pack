// ============================================================
// Pinning test of the Easter Eggs: their flags' key in the Profile's
// "surprises" part, their Achievement IDs and the daily file's name. These
// strings are players' saved progress: this test must keep passing
// unchanged. In a file of its own: it installs the fake PinballY globals.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createEasterEggRules } from "../../common/easter_eggs/easter_egg_rules.js";
import { buildEasterEggAchievements } from "../../achievements/easter_eggs.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";

test("the Easter Eggs keep their flags' key, their Achievement IDs and the daily file's name", () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 9, 20, 0, 0) });
    // Never uninstalled: buildEasterEggAchievements reads the shared rules.
    fake.installGlobals();
    const rules = createEasterEggRules(fake, {
        profileStore: createProfileStore(fake),
        wheelDialogs: { isIdle: () => true, isOverlayOpen: () => false },
        achievementToasts: { hasToasts: () => false },
        random: () => 0,
    });
    assert.equal(rules.tryWin("crow"), true);
    assert.equal(JSON.parse(fake.readFile(`${PROFILES}\\easter_egg_day.json`)).day, "2026-11-09");
    // The next day: the cabinet's one a day is free again.
    fake.advanceTime(24 * 60 * 60 * 1000);
    assert.equal(rules.tryWin("menuGlitch"), true);
    fake.advanceTime(24 * 60 * 60 * 1000);
    assert.equal(rules.tryWin("manekiNeko"), true);
    fake.advanceTime(24 * 60 * 60 * 1000);
    assert.equal(rules.tryWin("rocket"), true);
    fake.advanceTime(24 * 60 * 60 * 1000);
    assert.equal(rules.tryWin("fakeBlueScreen"), true);

    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES}\\guest\\profile.json`)).surprises, { easterEggs: { crow: true, menuGlitch: true, manekiNeko: true, rocket: true, fakeBlueScreen: true } });
    assert.deepEqual(buildEasterEggAchievements().map(achievement => achievement.id), ["corvusExMachina", "ghostInTheMachine", "nekomancer", "unauthorizedTakeoff", "kernelPanic"]);
});

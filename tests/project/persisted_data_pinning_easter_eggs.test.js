// ============================================================
// Pinning test of the Easter Eggs: their flags' and days' keys in the
// Profile's "surprises" part and their Achievement IDs. These
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

test("the Easter Eggs keep their flags' and days' keys and their Achievement IDs", () => {
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
    // The next day: the Profile's one a day is free again.
    fake.advanceTime(24 * 60 * 60 * 1000);
    assert.equal(rules.tryWin("menuGlitch"), true);
    fake.advanceTime(24 * 60 * 60 * 1000);
    assert.equal(rules.tryWin("manekiNeko"), true);
    fake.advanceTime(24 * 60 * 60 * 1000);
    assert.equal(rules.tryWin("rocket"), true);
    fake.advanceTime(24 * 60 * 60 * 1000);
    assert.equal(rules.tryWin("fakeBlueScreen"), true);

    assert.deepEqual(JSON.parse(fake.readFile(`${PROFILES}\\guest\\profile.json`)).surprises, {
        easterEggs: { crow: true, menuGlitch: true, manekiNeko: true, rocket: true, fakeBlueScreen: true },
        easterEggDraws: { crow: "2026-11-09", menuGlitch: "2026-11-10", manekiNeko: "2026-11-11", rocket: "2026-11-12", fakeBlueScreen: "2026-11-13" },
        easterEggWonDay: "2026-11-13",
    });
    assert.deepEqual(buildEasterEggAchievements().map(achievement => achievement.id), ["corvusExMachina", "ghostInTheMachine", "nekomancer", "unauthorizedTakeoff", "kernelPanic"]);
});

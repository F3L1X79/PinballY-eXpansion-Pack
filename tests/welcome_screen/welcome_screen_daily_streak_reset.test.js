// ============================================================
// Daily Streak after a Profile Reset, through main.js on the fake
// PinballY globals: an Admin Profile resets Alice from the Operator Menu, her
// Play Log is set aside, and the Welcome Screen that greets her next shows
// no Daily Streak line any more.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { WELCOME_SCREEN_OPEN_MS, press, isWelcomeScreenOpen, dailyStreakLine } from "./welcome_screen_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

// Wednesday 7 October 2026, in the evening.
const NOW = new Date(2026, 9, 7, 20, 0, 0);
const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const CONFIG_ID = "Medieval Madness (Williams 1997)";

test("a Profile Reset brings the Daily Streak back to 0", async () => {
    const fake = createFakePinballYHost({ now: NOW });
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, isAdmin: true }));
    fake.addFile(`${PROFILES}\\Alice\\play-log-2026.json`, JSON.stringify({
        version: 1,
        plays: ["2026-10-05T21:00:00", "2026-10-06T21:00:00", "2026-10-07T18:00:00"].map(start => ({ start, configId: CONFIG_ID, seconds: 600 })),
    }));
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = ["startupChoicePrompt", "profilePicker", "customMenuCommands"].includes(key);
    }
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    const { getProfileStore } = await import("../../common/profiles/profile_store.js");
    const TEXT = lang.profileReset;
    const store = getProfileStore();
    await import("../../main.js");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.equal(dailyStreakLine(fake), `3 ${lang.welcomeScreen.cabinetStreak.playedToday}`);
    press(fake, "Exit");

    fake.openOperatorMenu();
    fake.selectMenuItem(TEXT.menuEntry);
    fake.selectMenuItem("Alice");
    fake.selectMenuItem(TEXT.reset);
    fake.selectMenuItem(TEXT.yes);
    fake.selectMenuItem(TEXT.ok);
    fake.fire("wheelmode");
    await settle();

    store.switchTo("guest");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    press(fake, "Exit");
    store.switchTo("Alice");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.equal(isWelcomeScreenOpen(fake), true);
    assert.equal(dailyStreakLine(fake), null, "her Play Log was set aside");
    assertNoErrorLogged(fake);
});

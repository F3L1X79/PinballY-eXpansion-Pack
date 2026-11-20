// ============================================================
// Welcome Screen late at night: the late-night greeting, and the random
// choice launches a Random Game, never the Last Played Table.
// - Runs with the animation off: the launch comes at once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { WELCOME_SCREEN_OPEN_MS, isWelcomeScreenOpen, greeting, choose } from "./welcome_screen_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const TABLES = [
    { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness" },
    { id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars" },
];

test("late at night, the Welcome Screen's random choice launches a Random Game", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 23, 22, 0, 0), tables: TABLES });
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({
        version: 1, notified: [],
        plays: { [TABLES[0].configId]: { count: 1, seconds: 120, lastPlayed: "2026-09-22T21:00:00" } },
    }));
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["startupChoicePrompt", "profilePicker"].includes(key);
    config.language = "en";
    config.skipRandomGameAnimation = true;

    const { default: lang } = await import("../../common/core/i18n.js");
    const TEXT = lang.welcomeScreen;
    await import("../../main.js");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);

    assert.equal(greeting(fake), TEXT.greetingWithName(TEXT.greetings.night, "Alice").join(""));
    choose(fake, TEXT.randomTable);
    await settle();
    assert.equal(isWelcomeScreenOpen(fake), false);
    assert.deepEqual(fake.launches().map(game => game.configId), [TABLES[1].configId]);
    assertNoErrorLogged(fake);
});

// ============================================================
// Welcome Screen: a Random Game whose launch fails after the screen closed
// (its promise rejected) is logged once, under the screen's name, and the
// press still never reaches the wheel.
// - Runs with the animation off: the fake has no wheel buttons.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { WELCOME_SCREEN_OPEN_MS, isWelcomeScreenOpen, choose } from "./welcome_screen_reader.js";
import { errorLines } from "../support/error_log.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const TABLES = [
    { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness" },
    { id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars" },
];

test("a rejected Random Game from the Welcome Screen is logged once", async () => {
    const fake = createFakePinballYHost({ tables: TABLES });
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, notified: [] }));
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["startupChoicePrompt", "profilePicker"].includes(key);
    config.language = "en";
    config.skipRandomGameAnimation = true;

    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.equal(isWelcomeScreenOpen(fake), true);
    // The launch throws inside the Random Game's async launch.
    fake.on("prelaunch", () => { throw new Error("launch refused"); });

    const ev = choose(fake, lang.welcomeScreen.randomTable);
    await settle();

    assert.ok(ev.defaultPrevented, "the press never reaches the wheel");
    assert.equal(isWelcomeScreenOpen(fake), false);
    const errors = errorLines(fake);
    assert.equal(errors.length, 1, `logged once: ${errors.join(" | ")}`);
    assert.match(errors[0], /\[WelcomeScreen\].*launch refused/);
});

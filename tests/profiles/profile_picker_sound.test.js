// ============================================================
// Profile picker's navigation sound, through main.js on the fake PinballY
// globals: each Next / Prev in the carousel plays PinballY's own Next.wav or
// Prev.wav, quick presses on players in turn; opening, picking and buttons pressed
// once it is closed play nothing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const NAVIGATION_SOUND = "C:\\PinballY\\Assets\\Button Sounds\\Next.wav";
const PREV_SOUND = "C:\\PinballY\\Assets\\Button Sounds\\Prev.wav";
const GREETING_OVER_MS = 2500;

const press = (fake, buttonCommand) => fake.fire("commandbuttondown", { command: buttonCommand, repeat: false });

test("each Next / Prev in the carousel plays PinballY's navigation sound", async () => {
    const fake = createFakePinballYHost();
    for (const name of ["Alice", "Bob"]) fake.addFolder(`${PROFILES_FOLDER}\\${name}`);
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Bob" }));
    for (const path of [NAVIGATION_SOUND, PREV_SOUND]) fake.addFile(path);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "profilePicker";
    config.language = "en";
    config.profileGreetingSoundFile = "";

    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();
    fake.advanceTime(GREETING_OVER_MS);

    fake.openMenu("main", [{ title: "Play", cmd: fake.getBuiltInCommand("PlayGame") }]);
    fake.selectMenuItem(lang.profiles.menuEntry);
    await settle();
    assert.deepEqual(fake.soundsPlayed(), [], "opening plays nothing");

    for (const button of ["Next", "Next", "Prev", "Next", "Next"]) press(fake, button);
    press(fake, "Select");
    press(fake, "Next");

    assert.deepEqual(fake.soundsPlayed(), [NAVIGATION_SOUND, NAVIGATION_SOUND, PREV_SOUND, NAVIGATION_SOUND, NAVIGATION_SOUND],
        "only the moves inside the carousel");
    const [first, second, , third, fourth] = fake.soundPlayers();
    assert.equal(new Set([first, second, third]).size, 3, "three different players");
    assert.equal(fourth, first);
    assertNoErrorLogged(fake);
});

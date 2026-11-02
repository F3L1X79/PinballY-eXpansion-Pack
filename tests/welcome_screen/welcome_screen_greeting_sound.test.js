// ============================================================
// Welcome Screen greeting sound, through main.js on the fake PinballY
// globals: the screen greets the Profile in place of the Profile Greeting,
// so it plays the greeting sound as it appears, at startup and again after
// Change Player picked another Profile; never before it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { WELCOME_SCREEN_OPEN_MS, press, isWelcomeScreenOpen } from "./welcome_screen_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const GREETING_SOUND = "C:\\PinballY\\Media\\Sounds\\hello.mp3";
const GLIDE_OVER_MS = 500;
// Past the screen's pause and fade, and past a whole Profile Greeting.
const SETTLED_MS = 2500;

test("the Welcome Screen plays the greeting sound as it appears, at startup and after Change Player", async () => {
    const fake = createFakePinballYHost();
    for (const name of ["Alice", "Bob"]) fake.addFolder(`${PROFILES_FOLDER}\\${name}`);
    fake.addFile(`${PROFILES_FOLDER}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Bob" }));
    fake.addFile(GREETING_SOUND);
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) {
        config.addOns[key] = key === "startupChoicePrompt" || key === "profilePicker";
    }
    config.language = "en";
    config.startupScreen = "welcome";
    config.profileGreetingSoundFile = GREETING_SOUND;

    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    const greetingSounds = () => fake.soundsPlayed().filter(path => path === GREETING_SOUND).length;
    assert.equal(greetingSounds(), 0, "not before its turn");
    await settle();

    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.equal(isWelcomeScreenOpen(fake), true);
    assert.equal(greetingSounds(), 1, "once, as the screen appears");

    press(fake, "Exit");
    fake.openMenu("main", [{ title: "Play", cmd: fake.getBuiltInCommand("PlayGame") }]);
    fake.selectMenuItem(lang.profiles.menuEntry);
    await settle();
    // Towards Alice: Next leads to the "+".
    press(fake, "Prev");
    fake.advanceTime(GLIDE_OVER_MS);
    press(fake, "Select");
    await settle();
    fake.advanceTime(SETTLED_MS);
    await settle();

    assert.equal(isWelcomeScreenOpen(fake), true, "back for the new Profile");
    assert.equal(greetingSounds(), 2, "the new Profile is greeted with the sound too, once");
    assertNoErrorLogged(fake);
});

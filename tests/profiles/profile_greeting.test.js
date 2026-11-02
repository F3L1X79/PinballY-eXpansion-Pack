// ============================================================
// Profile Greeting through main.js: after a pick and a short pause, the
// Avatar and name with the configured sound, then a fade-out, with no redraw
// while it animates. A missing sound file is logged, never stops it.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { errorLines } from "../support/error_log.js";
import { shownLayers } from "../support/shown_layers.js";

const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const ALICE_AVATAR = `${PROFILES_FOLDER}\\Alice\\avatar.png`;
const SOUND_FILE = "C:\\Sounds\\hello.wav";
const PICKER_Z = 6500;
const AVATAR_Z = 6501;
// Past the short pause before the greeting, and comfortably past the whole
// greeting.
const PAUSE_OVER_MS = 600;
const GREETING_OVER_MS = 2500;

// The texts shown on the picker's background layers: the carousel's and
// the greeting's.
const visibleTexts = fake => shownLayers(fake, PICKER_Z)
    .flatMap(layer => layer.texts());

// The Avatars shown, each on its own layer above the picker layer.
const visibleAvatars = fake => shownLayers(fake, AVATAR_Z)
    .flatMap(layer => layer.images());

const press = (fake, buttonCommand) => fake.fire("commandbuttondown", { command: buttonCommand, repeat: false });

test("picking a Profile greets it with its Avatar and a sound, then fades out", async () => {
    const fake = createFakePinballYHost();
    fake.addFolder(`${PROFILES_FOLDER}\\Alice`);
    fake.addFile(ALICE_AVATAR, "png");
    fake.addFile(SOUND_FILE, "wav");
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "profilePicker";
    config.language = "en";

    const { default: lang } = await import("../../common/core/i18n.js");
    await import("../../main.js");
    await settle();
    // The startup greeting of Guest, out of the way.
    fake.advanceTime(GREETING_OVER_MS);

    const pick = (steps) => {
        fake.openMenu("main", [{ title: "Play", cmd: fake.getBuiltInCommand("PlayGame") }]);
        fake.selectMenuItem(lang.profiles.menuEntry);
        for (let step = 0; step < steps; step++) press(fake, "Next");
        press(fake, "Select");
    };

    config.profileGreetingSoundFile = SOUND_FILE;
    const soundsBefore = fake.soundsPlayed().length;
    pick(1);
    const greeting = lang.profiles.greeting("Alice");
    assert.ok(visibleTexts(fake).includes(lang.profiles.pickerTitle), "the carousel stays still for a moment");
    assert.ok(!visibleTexts(fake).includes(greeting));
    assert.equal(fake.soundsPlayed().length, soundsBefore);
    fake.advanceTime(PAUSE_OVER_MS);
    assert.ok(visibleTexts(fake).includes(greeting), "then greets the picked Profile by name");
    assert.deepEqual(visibleAvatars(fake), [ALICE_AVATAR], "with its Avatar alone");
    assert.ok(!visibleTexts(fake).includes(lang.profiles.pickerTitle), "without the carousel");
    assert.deepEqual(fake.soundsPlayed().slice(soundsBefore), [SOUND_FILE], "the configured sound plays");

    const drawingsBefore = fake.drawings().length;
    fake.advanceTime(600);
    assert.ok(visibleTexts(fake).includes(greeting), "still there after a moment");
    assert.equal(fake.drawings().length, drawingsBefore, "it grows without being redrawn");
    fake.advanceTime(GREETING_OVER_MS);
    assert.deepEqual(visibleTexts(fake), [], "fades out on its own");
    assert.deepEqual(visibleAvatars(fake), []);
    assert.equal(press(fake, "Next").defaultPrevented, false, "never keeps the buttons");

    config.profileGreetingSoundFile = "";
    // Past the "+", last of the carousel, to wrap round to Guest.
    pick(2);
    fake.advanceTime(PAUSE_OVER_MS);
    assert.ok(visibleTexts(fake).includes(lang.profiles.greeting(lang.profiles.guestName)), "Guest by its translated name");
    assert.equal(fake.soundsPlayed().length, soundsBefore + 1, "no sound when the setting is empty");
    fake.advanceTime(GREETING_OVER_MS);

    config.profileGreetingSoundFile = "C:\\Sounds\\missing.wav";
    pick(1);
    fake.advanceTime(PAUSE_OVER_MS);
    assert.ok(visibleTexts(fake).includes(greeting), "a missing sound never stops the greeting");
    const errors = errorLines(fake);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /\[ProfilePicker\].*missing\.wav/);
    fake.advanceTime(GREETING_OVER_MS);
    assert.deepEqual(visibleTexts(fake), []);
});

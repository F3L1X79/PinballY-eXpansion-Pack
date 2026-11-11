// ============================================================
// Navigation sound tests on the fake host: the owner's own button sounds
// found before PinballY's, Prev and Next by direction, and PinballY's
// button settings (Mute, MuteAutoRepeat, Volume) read at each press.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createButtonSound, createNavigationSound } from "../../common/core/navigation_sound.js";

const ASSETS = "C:\\PinballY\\Assets\\Button Sounds";
const MEDIA = "C:\\PinballY\\Media\\Button Sounds";

function setUp(paths) {
    const fake = createFakePinballYHost({});
    for (const path of paths) fake.addFile(path);
    return fake;
}

test("plays PinballY's own sound when the owner has none", () => {
    const fake = setUp([`${ASSETS}\\Select.wav`]);
    const sound = createButtonSound(fake, "Test", "Select", 1);
    sound.load();
    sound.play();
    assert.deepEqual(fake.soundsPlayed(), [`${ASSETS}\\Select.wav`]);
});

test("plays the owner's sound from the media folder, such as a silence, over PinballY's own", () => {
    const fake = setUp([`${ASSETS}\\Select.wav`, `${MEDIA}\\Select.wav`]);
    const sound = createButtonSound(fake, "Test", "Select", 1);
    sound.load();
    sound.play();
    assert.deepEqual(fake.soundsPlayed(), [`${MEDIA}\\Select.wav`]);
});

test("moving plays Prev backward and Next forward", () => {
    const fake = setUp([`${ASSETS}\\Next.wav`, `${ASSETS}\\Prev.wav`]);
    const sound = createNavigationSound(fake, "Test");
    sound.load();
    sound.play(-1);
    sound.play(1);
    assert.deepEqual(fake.soundsPlayed(), [`${ASSETS}\\Prev.wav`, `${ASSETS}\\Next.wav`]);
});

test("Buttons.Mute silences every sound, read again at each press", () => {
    const fake = setUp([`${ASSETS}\\Next.wav`, `${ASSETS}\\Prev.wav`, `${ASSETS}\\Select.wav`]);
    const navigation = createNavigationSound(fake, "Test");
    const select = createButtonSound(fake, "Test", "Select", 1);
    navigation.load();
    select.load();
    fake.settings.set("Buttons.Mute", true);
    navigation.play(1);
    navigation.play(-1);
    select.play();
    assert.deepEqual(fake.soundsPlayed(), []);

    fake.settings.set("Buttons.Mute", false);
    select.play();
    assert.deepEqual(fake.soundsPlayed(), [`${ASSETS}\\Select.wav`]);
});

test("Buttons.MuteAutoRepeat silences a held button's repeats only", () => {
    const fake = setUp([`${ASSETS}\\Next.wav`]);
    const sound = createNavigationSound(fake, "Test");
    sound.load();
    sound.play(1, true);
    assert.equal(fake.soundsPlayed().length, 1, "repeats play while the setting is off");

    fake.settings.set("Buttons.MuteAutoRepeat", true);
    sound.play(1, true);
    sound.play(1);
    assert.equal(fake.soundsPlayed().length, 2, "only the first press of a held button plays");
});

test("plays at Buttons.Volume, 100 when PinballY has none", () => {
    const fake = setUp([`${ASSETS}\\Next.wav`]);
    const sound = createNavigationSound(fake, "Test");
    sound.load();
    sound.play(1);
    fake.settings.set("Buttons.Volume", 35);
    sound.play(1);
    assert.deepEqual(fake.soundVolumes(), [100, 35]);
});

// ============================================================
// Avatar Choice through main.js, with one portrait unreadable and other
// files beside the portraits: only the numbered portraits show, in their
// numbers' order, the unreadable one logged and left out, and the flippers
// skip its place.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import {
    startOnWheel, press, step, highlighted, openNameEntry, createThroughNameEntry, isAvatarChoiceOpen, portraitLayers, currentPortrait,
    portraitOf, pickerAvatars, PROFILES_FOLDER, PORTRAITS_FOLDER,
} from "./name_entry_scenario.js";

test("an unreadable portrait is logged and left out of Avatar Choice's grid", async () => {
    // 23 numbered portraits, then 100, which follows 24 by number but not by name.
    const numbers = Array.from({ length: 24 }, (_, index) => index + 1).filter(number => number !== 5);
    const { fake, lang, openPicker } = await startOnWheel({ profiles: ["Alice"], activeProfile: "Alice", portraits: [...numbers, 100] });
    fake.addUnreadableImage(portraitOf(5));
    fake.addFile(`${PORTRAITS_FOLDER}\\avatar_choice_sheet.png`, "a sheet");
    fake.addFile(`${PORTRAITS_FOLDER}\\portrait_03.png`, "another image");
    fake.addFile(`${PORTRAITS_FOLDER}\\avatar_choice_07.png.bak`, "a backup");

    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Maxx");
    assert.equal(isAvatarChoiceOpen(fake), true, "Avatar Choice opens on the readable portraits");
    assert.deepEqual(portraitLayers(fake).map(layer => layer.images()[0]), [...numbers, 100].map(portraitOf));

    // The flippers skip the place of the portrait left out.
    for (let moves = 0; moves < 3; moves++) press(fake, "Next");
    assert.equal(currentPortrait(fake), portraitOf(4));
    press(fake, "Next");
    assert.equal(currentPortrait(fake), portraitOf(6), "from 4 straight to 6");
    press(fake, "Prev");
    assert.equal(currentPortrait(fake), portraitOf(4));

    press(fake, "Select");
    assert.equal(isAvatarChoiceOpen(fake), false);
    const avatarPath = `${PROFILES_FOLDER}\\Maxx\\avatar.png`;
    assert.equal(fake.files.readText(avatarPath), "portrait 4");
    assert.equal(highlighted(fake, [lang.profiles.guestName, "Alice", "Maxx", lang.profiles.newProfile]), "Maxx");
    assert.ok(pickerAvatars(fake).includes(avatarPath));

    assert.deepEqual(errorLines(fake), [`[AvatarChoice] ERROR ${portraitOf(5)} is unreadable; Avatar Choice shows without it.`]);
});

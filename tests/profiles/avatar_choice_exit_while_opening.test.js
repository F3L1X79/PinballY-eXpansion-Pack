// ============================================================
// Avatar Choice through main.js, left while still opening: Exit leaves at
// once, with no confirmation, the picker back on the new Profile wearing
// the Default Avatar, nothing copied and no layer of the screen left.
// Once the grid shows, Exit asks to confirm again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { AVATAR_CHOICE_Z_INDEX } from "../../common/profiles/avatar_choice_painter.js";
import {
    startOnWheel, press, step, highlighted, openNameEntry, enterName, moveTo, createThroughNameEntry, pickerAvatars,
    isAvatarChoiceOpen, isConfirmationOpen, AVATAR_CHOICE_OPEN_MS, PROFILES_FOLDER, DEFAULT_AVATAR,
} from "./name_entry_scenario.js";

// The screen's own layers, and its opening's veil and Loader just under its backdrop.
const OPENING_Z_INDEX = AVATAR_CHOICE_Z_INDEX.backdrop - 2;
const TOP_Z_INDEX = Math.max(...Object.values(AVATAR_CHOICE_Z_INDEX));
const avatarChoiceLayers = fake => fake.drawingLayers()
    .filter(layer => layer.zIndex >= OPENING_Z_INDEX && layer.zIndex <= TOP_Z_INDEX);

test("Exit while Avatar Choice opens leaves at once with the Default Avatar", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({ profiles: ["Alice"], activeProfile: "Alice" });
    const label = lang.profiles.newProfile;
    fake.addFile(DEFAULT_AVATAR, "default");

    // OK, then Exit before the grid shows.
    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    enterName(fake, "Max");
    moveTo(fake, "OK");
    press(fake, "Select");
    assert.equal(isAvatarChoiceOpen(fake), false, "the grid is not shown yet");
    assert.ok(avatarChoiceLayers(fake).length > 0, "the screen is opening");
    assert.equal(press(fake, "Exit").defaultPrevented, true);
    assert.equal(isConfirmationOpen(fake), false, "no confirmation");
    assert.deepEqual(avatarChoiceLayers(fake), [], "no layer of the screen left");
    fake.advanceTime(AVATAR_CHOICE_OPEN_MS);
    assert.equal(isAvatarChoiceOpen(fake), false, "the screen stays closed");
    assert.deepEqual(avatarChoiceLayers(fake), []);
    assert.equal(highlighted(fake, [lang.profiles.guestName, "Alice", "Max", label]), "Max", "the picker comes back on the new Profile");
    assert.equal(fake.files.fileExists(`${PROFILES_FOLDER}\\Max\\avatar.png`), false, "nothing copied");
    assert.equal(store.listProfiles().find(profile => profile.name === "Max").avatarPath, DEFAULT_AVATAR);
    assert.ok(pickerAvatars(fake).includes(DEFAULT_AVATAR), "wearing the Default Avatar");

    // Once the grid shows, Exit asks to confirm.
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Ned");
    assert.equal(isAvatarChoiceOpen(fake), true);
    press(fake, "Exit");
    assert.equal(isConfirmationOpen(fake), true, "Exit asks to confirm once the grid shows");
    assert.equal(isAvatarChoiceOpen(fake), true);

    assertNoErrorLogged(fake);
});

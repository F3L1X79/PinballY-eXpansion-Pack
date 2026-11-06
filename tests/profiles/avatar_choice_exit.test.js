// ============================================================
// Avatar Choice through main.js, left without a portrait: Exit, or Select
// on the Exit Button, then "Keep the default Avatar" on the confirmation
// bring back the picker on the new Profile, wearing the Default Avatar,
// with nothing copied.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { exitButtonTooltipOn } from "../support/button_hints_reader.js";
import { AVATAR_CHOICE_Z_INDEX } from "../../common/profiles/avatar_choice_painter.js";
import {
    startOnWheel, press, step, highlighted, openNameEntry, createThroughNameEntry, pickerAvatars, isAvatarChoiceOpen, currentPortrait,
    isConfirmationOpen, currentConfirmationChoice, keepDefaultAvatar, PROFILES_FOLDER, DEFAULT_AVATAR,
} from "./name_entry_scenario.js";

test("Exit and the Exit Button leave Avatar Choice with the Default Avatar, once confirmed", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({ profiles: ["Alice"], activeProfile: "Alice" });
    const label = lang.profiles.newProfile;
    const TEXT = lang.profiles.avatarChoice;
    fake.addFile(DEFAULT_AVATAR, "default");

    // Exit, then Keep the default Avatar.
    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Max");
    assert.equal(isAvatarChoiceOpen(fake), true);
    assert.equal(press(fake, "Exit").defaultPrevented, true);
    assert.equal(isConfirmationOpen(fake), true, "Exit asks to confirm");
    press(fake, "Next");
    assert.equal(currentConfirmationChoice(fake), TEXT.keepDefault);
    assert.equal(press(fake, "Select").defaultPrevented, true);
    assert.equal(isAvatarChoiceOpen(fake), false, "keeping the Default Avatar leaves");
    assert.equal(isConfirmationOpen(fake), false);
    assert.equal(highlighted(fake, [lang.profiles.guestName, "Alice", "Max", label]), "Max", "the picker comes back on the new Profile");
    assert.equal(fake.files.fileExists(`${PROFILES_FOLDER}\\Max\\avatar.png`), false, "nothing copied");
    assert.equal(store.listProfiles().find(profile => profile.name === "Max").avatarPath, DEFAULT_AVATAR);
    assert.ok(pickerAvatars(fake).includes(DEFAULT_AVATAR), "wearing the Default Avatar");

    // The Exit Button, chosen with Launch.
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Ned");
    press(fake, "Prev");
    assert.equal(currentPortrait(fake), "exit");
    assert.equal(exitButtonTooltipOn(fake, AVATAR_CHOICE_Z_INDEX.tooltip), lang.buttonHints.back, "its tooltip shows while selected");
    press(fake, "Launch");
    assert.equal(isConfirmationOpen(fake), true, "the Exit Button asks to confirm too");
    assert.equal(exitButtonTooltipOn(fake, AVATAR_CHOICE_Z_INDEX.tooltip), null, "its tooltip hides under the confirmation");
    press(fake, "Prev");
    assert.equal(currentConfirmationChoice(fake), TEXT.keepDefault, "Prev goes round both choices too");
    press(fake, "Launch");
    assert.equal(isAvatarChoiceOpen(fake), false);
    assert.equal(highlighted(fake, [lang.profiles.guestName, "Alice", "Max", "Ned", label]), "Ned");
    assert.equal(fake.files.fileExists(`${PROFILES_FOLDER}\\Ned\\avatar.png`), false, "nothing copied");
    assert.equal(store.getActiveProfile().name, "Alice", "the active Profile is kept");

    // The scenario's own helper takes the same way.
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Oz");
    keepDefaultAvatar(fake);
    assert.equal(highlighted(fake, [lang.profiles.guestName, "Alice", "Max", "Ned", "Oz", label]), "Oz");

    assertNoErrorLogged(fake);
});

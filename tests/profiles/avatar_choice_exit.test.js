// ============================================================
// Avatar Choice through main.js, left without a portrait: Exit, held or
// not, and Select on the Exit Button bring back the picker on the new
// Profile, wearing the Default Avatar, with nothing copied.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { exitButtonTooltipOn } from "../support/button_hints_reader.js";
import { AVATAR_CHOICE_Z_INDEX } from "../../common/profiles/avatar_choice_painter.js";
import {
    startOnWheel, press, step, highlighted, openNameEntry, createThroughNameEntry, pickerAvatars, isAvatarChoiceOpen, currentPortrait,
    PROFILES_FOLDER,
} from "./name_entry_scenario.js";

const DEFAULT_AVATAR = "C:\\PinballY\\Scripts\\ExpansionPack\\assets\\images\\default_avatar.png";

test("Exit and the Exit Button leave Avatar Choice with the Default Avatar", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({ profiles: ["Alice"], activeProfile: "Alice" });
    const label = lang.profiles.newProfile;
    fake.addFile(DEFAULT_AVATAR, "default");

    // Exit, held first.
    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Max");
    assert.equal(isAvatarChoiceOpen(fake), true);
    press(fake, "Exit", true);
    assert.equal(isAvatarChoiceOpen(fake), true, "a held Exit counts once, on the press that started it");
    assert.equal(press(fake, "Exit").defaultPrevented, true);
    assert.equal(isAvatarChoiceOpen(fake), false, "Exit leaves at once");
    assert.equal(highlighted(fake, [lang.profiles.guestName, "Alice", "Max", label]), "Max", "the picker comes back on the new Profile");
    assert.equal(fake.files.fileExists(`${PROFILES_FOLDER}\\Max\\avatar.png`), false, "nothing copied");
    assert.equal(store.listProfiles().find(profile => profile.name === "Max").avatarPath, DEFAULT_AVATAR);
    assert.ok(pickerAvatars(fake).includes(DEFAULT_AVATAR), "wearing the Default Avatar");

    // The Exit Button, chosen with Select.
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Ned");
    press(fake, "Prev");
    assert.equal(currentPortrait(fake), "exit");
    assert.equal(exitButtonTooltipOn(fake, AVATAR_CHOICE_Z_INDEX.tooltip), lang.buttonHints.back, "its tooltip shows while selected");
    press(fake, "Select");
    assert.equal(isAvatarChoiceOpen(fake), false);
    assert.equal(highlighted(fake, [lang.profiles.guestName, "Alice", "Max", "Ned", label]), "Ned");
    assert.equal(fake.files.fileExists(`${PROFILES_FOLDER}\\Ned\\avatar.png`), false, "nothing copied");
    assert.equal(store.getActiveProfile().name, "Alice", "the active Profile is kept");

    assertNoErrorLogged(fake);
});

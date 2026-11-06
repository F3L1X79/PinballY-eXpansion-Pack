// ============================================================
// Avatar Choice's confirmation through main.js, in French: its question
// and choices over the grid, "Choose an Avatar" current first; that choice,
// or Exit, brings back the grid with the marker where it was.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { shownLayers } from "../support/shown_layers.js";
import { AVATAR_CHOICE_Z_INDEX as Z } from "../../common/profiles/avatar_choice_painter.js";
import { DRAWN_MENU_Z_INDEX } from "../../common/drawn_menu/drawn_menu_painter.js";
import {
    startOnWheel, press, step, openNameEntry, createThroughNameEntry, isAvatarChoiceOpen, currentPortrait, portraitOf,
    isConfirmationOpen, confirmationTexts, confirmationChoices, currentConfirmationChoice, PROFILES_FOLDER,
} from "./name_entry_scenario.js";

test("the confirmation asks before keeping the Default Avatar, and gives the grid back", async () => {
    const { fake, lang, openPicker } = await startOnWheel({ profiles: ["Alice"], activeProfile: "Alice", language: "fr" });
    const TEXT = lang.profiles.avatarChoice;
    assert.equal(TEXT.keepDefaultQuestion, "Garder l'Avatar par défaut ?");
    assert.equal(TEXT.chooseAvatar, "Choisir un Avatar");
    assert.equal(TEXT.keepDefault, "Garder l'Avatar par défaut");

    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Max");
    press(fake, "Next");
    press(fake, "Next");
    assert.equal(currentPortrait(fake), portraitOf(3));

    // Exit: the question and both choices, over the grid.
    press(fake, "Exit");
    assert.equal(isConfirmationOpen(fake), true);
    assert.deepEqual(confirmationTexts(fake), [TEXT.keepDefaultQuestion]);
    assert.deepEqual(confirmationChoices(fake), [TEXT.chooseAvatar, TEXT.keepDefault]);
    assert.equal(currentConfirmationChoice(fake), TEXT.chooseAvatar, "Choose an Avatar is current first");
    assert.equal(shownLayers(fake, Z.marker).length, 0, "the grid's marker is set aside");
    const topOfGrid = Math.max(Z.portraits, Z.exitButton, Z.buttonHints, Z.marker, Z.tooltip);
    assert.ok(Z.confirmationPanel > topOfGrid && Z.confirmationChoices > Z.confirmationPanel && Z.confirmationMarker > Z.confirmationChoices,
        "the panel shows over the grid, its marker over its choices");
    assert.deepEqual(DRAWN_MENU_Z_INDEX, { backdrop: 6200, panel: 6201, texts: 6202, selection: 6203, selectedText: 6204, glass: 6205 },
        "the Drawn Menus keep their range");

    // The flippers go round both choices; a held flipper counts once.
    press(fake, "Next");
    assert.equal(currentConfirmationChoice(fake), TEXT.keepDefault);
    press(fake, "Next", true);
    assert.equal(currentConfirmationChoice(fake), TEXT.keepDefault, "a held flipper counts once");
    press(fake, "Next");
    assert.equal(currentConfirmationChoice(fake), TEXT.chooseAvatar);

    // Choose an Avatar: the grid back, the marker on the third portrait.
    press(fake, "Select");
    assert.equal(isConfirmationOpen(fake), false);
    assert.equal(isAvatarChoiceOpen(fake), true);
    assert.equal(currentPortrait(fake), portraitOf(3), "the marker where it was");
    press(fake, "Next");
    assert.equal(currentPortrait(fake), portraitOf(4), "the grid moves again");

    // Exit in the confirmation: the grid back too, even from the other choice.
    press(fake, "Exit");
    press(fake, "Next");
    assert.equal(press(fake, "Exit").defaultPrevented, true);
    assert.equal(isConfirmationOpen(fake), false);
    assert.equal(currentPortrait(fake), portraitOf(4), "the marker where it was");

    // Exit again starts on Choose an Avatar, and the grid still chooses.
    press(fake, "Exit");
    assert.equal(currentConfirmationChoice(fake), TEXT.chooseAvatar);
    press(fake, "Launch");
    press(fake, "Select");
    assert.equal(isAvatarChoiceOpen(fake), false);
    assert.equal(fake.files.readText(`${PROFILES_FOLDER}\\Max\\avatar.png`), "portrait 4");

    assertNoErrorLogged(fake);
});

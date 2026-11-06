// ============================================================
// Avatar Choice over the carousel on the Drawn Screen controls, through
// main.js with other Add-ons on: held flippers keep moving on the grid and
// its confirmation, a held Select, Launch or Exit counts once on both; Exit
// gives it up while it gets ready; the carousel comes back with no waiting
// Dialog shown; attract mode closes it and its confirmation, nothing copied.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { AVATAR_CHOICE_Z_INDEX as Z } from "../../common/profiles/avatar_choice_painter.js";
import {
    startOnWheel, press, step, highlighted, openNameEntry, enterName, moveTo, createThroughNameEntry, pickerTexts,
    isAvatarChoiceOpen, isConfirmationOpen, currentPortrait, currentConfirmationChoice, portraitOf, PROFILES_FOLDER,
    AVATAR_CHOICE_OPEN_MS, GLIDE_OVER_MS,
} from "./name_entry_scenario.js";

test("Avatar Choice counts a held Select, Launch or Exit once, gives up on Exit while getting ready, and lets no Dialog show", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({
        profiles: ["Alice"], activeProfile: "Alice", addOns: ["profilePicker", "highScores", "achievements"],
    });
    const { getWheelDialogs, DIALOG_PRIORITY } = await import("../../common/core/wheel_dialog.js");
    const TEXT = lang.profiles.avatarChoice;
    const isPickerOpen = () => pickerTexts(fake).includes(lang.profiles.pickerTitle);
    const avatarOf = name => `${PROFILES_FOLDER}\\${name}\\avatar.png`;

    // Getting ready: the flippers, Select and Launch do nothing, Exit gives it up.
    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    enterName(fake, "Max");
    moveTo(fake, "OK");
    press(fake, "Select");
    for (const button of ["Next", "Select", "Launch"]) assert.ok(press(fake, button).defaultPrevented, `${button} is swallowed while getting ready`);
    assert.ok(press(fake, "Exit").defaultPrevented, "Exit is swallowed while getting ready");
    fake.advanceTime(AVATAR_CHOICE_OPEN_MS);
    assert.equal(isAvatarChoiceOpen(fake), false, "Exit gives Avatar Choice up while it gets ready");
    assert.equal(fake.files.fileExists(avatarOf("Max")), false, "nothing copied");
    assert.ok(isPickerOpen());

    // The grid: held flippers keep moving, a held Select, Launch or Exit does nothing.
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Ned");
    assert.equal(isAvatarChoiceOpen(fake), true);
    press(fake, "Next", true);
    press(fake, "Next", true);
    assert.equal(currentPortrait(fake), portraitOf(3), "a held flipper keeps moving on the grid");
    for (const button of ["Select", "Launch", "Exit"]) {
        assert.ok(press(fake, button, true).defaultPrevented, `a held ${button} never reaches the wheel`);
        assert.equal(isAvatarChoiceOpen(fake), true, `a held ${button} leaves Avatar Choice open`);
        assert.equal(isConfirmationOpen(fake), false, `a held ${button} asks nothing`);
    }
    assert.equal(fake.files.fileExists(avatarOf("Ned")), false, "a held Select takes nothing");

    // The confirmation: held flippers keep going round, a held Select, Launch or Exit does nothing.
    press(fake, "Exit");
    assert.equal(isConfirmationOpen(fake), true);
    press(fake, "Next", true);
    assert.equal(currentConfirmationChoice(fake), TEXT.keepDefault, "a held flipper moves on the confirmation");
    press(fake, "Next", true);
    assert.equal(currentConfirmationChoice(fake), TEXT.chooseAvatar, "and keeps going round");
    for (const button of ["Select", "Launch", "Exit"]) {
        assert.ok(press(fake, button, true).defaultPrevented, `a held ${button} never reaches the wheel`);
        assert.equal(isConfirmationOpen(fake), true, `a held ${button} leaves the confirmation open`);
    }

    // Leaving lets no waiting Dialog show over the carousel; the held Launch picks no Profile.
    let ready = false;
    let shownDialog = null;
    getWheelDialogs().submit({ priority: DIALOG_PRIORITY.UPDATE_RESULT, isReady: () => ready, open: close => { shownDialog = close; } });
    await settle();
    assert.equal(shownDialog, null, "a Dialog not ready yet waits");
    // Ready, but nothing tells the queue: only a close handed to waitFor() would.
    ready = true;
    press(fake, "Exit");
    press(fake, "Prev");
    assert.equal(currentPortrait(fake), portraitOf(2));
    press(fake, "Launch");
    assert.equal(isAvatarChoiceOpen(fake), false);
    assert.equal(fake.files.readText(avatarOf("Ned")), "portrait 2");
    assert.equal(highlighted(fake, [lang.profiles.guestName, "Alice", "Max", "Ned", lang.profiles.newProfile]), "Ned", "the carousel comes back on the new Profile");
    press(fake, "Launch", true);
    fake.advanceTime(GLIDE_OVER_MS);
    await settle();
    assert.equal(store.getActiveProfile().name, "Alice", "the held Launch picks no Profile");
    assert.ok(isPickerOpen());
    assert.equal(shownDialog, null, "closing Avatar Choice lets no waiting Dialog show");
    getWheelDialogs().wake();
    await settle();
    assert.notEqual(shownDialog, null, "the Dialog was waiting");
    shownDialog();

    // Attract mode closes the confirmation, Avatar Choice and the carousel, copying nothing.
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Oz");
    press(fake, "Exit");
    assert.equal(isConfirmationOpen(fake), true);
    fake.fire("attractmodestart");
    assert.equal(isConfirmationOpen(fake), false);
    assert.equal(isAvatarChoiceOpen(fake), false);
    assert.deepEqual(fake.drawingLayers().filter(layer => Object.values(Z).includes(layer.zIndex)), [],
        "no layer of the screen nor of its confirmation is left");
    assert.deepEqual(pickerTexts(fake), [], "the carousel closes with it");
    assert.ok(store.listProfileNames().includes("Oz"), "the Profile stays");
    assert.equal(fake.files.fileExists(avatarOf("Oz")), false, "nothing copied");
    assert.equal(press(fake, "Next").defaultPrevented, false, "the buttons are the wheel's again");
    // Past a few of the markers' ticks, which must be stopped.
    fake.advanceTime(GLIDE_OVER_MS);

    assertNoErrorLogged(fake);
});

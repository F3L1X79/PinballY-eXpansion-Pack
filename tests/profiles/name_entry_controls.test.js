// ============================================================
// Name Entry over the carousel on the Drawn Screen controls, through main.js
// with other Add-ons on: held flippers run along the ring and the carousel, a
// held Select, Launch or Exit counts once on both; Exit gives Name Entry up
// while it gets ready; its close lets no waiting Dialog show; attract mode
// closes both, nothing created.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    startOnWheel, press, step, highlighted, openNameEntry, isNameEntryOpen, nameShown, currentCharacter, enter, moveTo, pickerTexts,
    isAvatarChoiceOpen, keepDefaultAvatar, NAME_ENTRY_OPEN_MS, AVATAR_CHOICE_OPEN_MS, GLIDE_OVER_MS,
} from "./name_entry_scenario.js";

test("Name Entry over the carousel counts a held Select, Launch or Exit once, gives up on Exit while getting ready, and lets no Dialog show", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({
        profiles: ["Alice"], activeProfile: "Alice", addOns: ["profilePicker", "highScores", "achievements"],
    });
    const { getWheelDialogs, DIALOG_PRIORITY } = await import("../../common/core/wheel_dialog.js");
    const label = lang.profiles.newProfile;
    const names = () => [lang.profiles.guestName, "Alice", label];
    const isPickerOpen = () => pickerTexts(fake).includes(lang.profiles.pickerTitle);
    const hold = command => {
        const ev = press(fake, command, true);
        fake.advanceTime(GLIDE_OVER_MS);
        return ev;
    };

    // The carousel: a held flipper moves, a held Select or Exit does nothing.
    await openPicker();
    assert.equal(highlighted(fake, names()), "Alice");
    hold("Prev");
    assert.equal(highlighted(fake, names()), lang.profiles.guestName, "a held flipper moves the carousel");
    for (const button of ["Select", "Launch", "Exit"]) {
        assert.ok(hold(button).defaultPrevented, `a held ${button} never reaches the wheel`);
        assert.ok(isPickerOpen(), `a held ${button} leaves the carousel open`);
        assert.equal(store.getActiveProfile().name, "Alice", `a held ${button} picks nothing`);
    }
    hold("Next");
    hold("Next");
    assert.equal(highlighted(fake, names()), label);

    // Getting ready: the flippers and Select do nothing, Exit gives it up.
    press(fake, "Select");
    for (const button of ["Next", "Select", "Launch"]) assert.ok(press(fake, button).defaultPrevented, `${button} is swallowed while getting ready`);
    fake.advanceTime(NAME_ENTRY_OPEN_MS);
    assert.equal(isNameEntryOpen(fake), true);
    assert.equal(currentCharacter(fake), "A", "the flipper did nothing while getting ready");
    assert.equal(nameShown(fake), "", "nor Select or Launch");
    // Back on the "+", then opened again and left at once.
    press(fake, "Exit");
    press(fake, "Select");
    assert.ok(press(fake, "Exit").defaultPrevented, "Exit is swallowed while getting ready");
    fake.advanceTime(NAME_ENTRY_OPEN_MS);
    assert.equal(isNameEntryOpen(fake), false, "Exit gives Name Entry up while it gets ready");
    assert.ok(isPickerOpen());
    assert.equal(highlighted(fake, names()), label, "back on the +");

    // Name Entry: held flippers run along the ring, a held Select chooses once.
    openNameEntry(fake);
    enter(fake, "B");
    assert.equal(currentCharacter(fake), "a");
    press(fake, "Next", true);
    press(fake, "Next", true);
    assert.equal(currentCharacter(fake), "c", "a held flipper runs along the ring");
    for (const button of ["Select", "Launch", "Exit"]) {
        assert.ok(press(fake, button, true).defaultPrevented);
        assert.equal(isNameEntryOpen(fake), true, `a held ${button} leaves Name Entry open`);
    }
    assert.equal(nameShown(fake), "B", "a held Select chooses one character only");

    // Its close lets no waiting Dialog show over the carousel; a held Exit stays there.
    let ready = false;
    let shownDialog = null;
    getWheelDialogs().submit({ priority: DIALOG_PRIORITY.UPDATE_RESULT, isReady: () => ready, open: close => { shownDialog = close; } });
    await settle();
    assert.equal(shownDialog, null, "a Dialog not ready yet waits");
    // Ready, but nothing tells the queue: only a close handed to waitFor() would.
    ready = true;
    press(fake, "Exit");
    assert.equal(isNameEntryOpen(fake), false);
    hold("Exit");
    hold("Select");
    fake.advanceTime(NAME_ENTRY_OPEN_MS);
    await settle();
    assert.equal(isNameEntryOpen(fake), false, "the held Select does not open Name Entry again");
    assert.ok(isPickerOpen(), "the held Exit leaves the carousel open");
    assert.equal(shownDialog, null, "closing Name Entry lets no waiting Dialog show");
    getWheelDialogs().wake();
    await settle();
    assert.notEqual(shownDialog, null, "the Dialog was waiting");
    shownDialog();

    // OK held: the carousel that comes back after Avatar Choice picks nothing.
    openNameEntry(fake);
    enter(fake, "B");
    enter(fake, "o");
    moveTo(fake, "OK");
    press(fake, "Select");
    press(fake, "Select", true);
    fake.advanceTime(AVATAR_CHOICE_OPEN_MS);
    assert.equal(isAvatarChoiceOpen(fake), true);
    keepDefaultAvatar(fake);
    assert.equal(highlighted(fake, names().toSpliced(2, 0, "Bo")), "Bo");
    hold("Select");
    assert.equal(store.getActiveProfile().name, "Alice", "the held Select picks no Profile");
    assert.ok(isPickerOpen());

    // Attract mode closes Name Entry and the carousel, nothing created.
    step(fake, "Next");
    openNameEntry(fake);
    enter(fake, "Q");
    fake.fire("attractmodestart");
    assert.equal(isNameEntryOpen(fake), false);
    assert.deepEqual(pickerTexts(fake), [], "the carousel closes with it");
    assert.equal(store.listProfiles().some(profile => profile.name === "Q"), false, "nothing created");
    assert.equal(press(fake, "Next").defaultPrevented, false, "the buttons are the wheel's again");
    fake.advanceTime(GLIDE_OVER_MS);

    assertNoErrorLogged(fake);
});

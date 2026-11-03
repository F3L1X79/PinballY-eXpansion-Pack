// ============================================================
// Name Entry through main.js when the folder cannot be created: the screen
// stays open with the name kept and a message in place of the reason, the
// error goes to the Error Log, and trying again works.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import {
    startOnWheel, press, step, highlighted, openNameEntry, isNameEntryOpen, nameShown, reasonShown, enter, enterName, moveTo, PROFILES_FOLDER,
} from "./name_entry_scenario.js";

test("a folder that cannot be created leaves the screen open, the name kept, with a message", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({ profiles: ["Alice"], activeProfile: "Alice" });
    const { folderFailed } = lang.profiles.nameEntry;

    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    enterName(fake, "Max");
    moveTo(fake, "OK");
    assert.deepEqual(errorLines(fake), []);

    fake.failNextFolderCreation();
    press(fake, "Select");

    assert.equal(isNameEntryOpen(fake), true, "the screen stays open");
    assert.equal(nameShown(fake), "Max", "the name is kept");
    assert.equal(reasonShown(fake), folderFailed);
    assert.equal(fake.files.listFolders(PROFILES_FOLDER).includes("Max"), false);
    assert.equal(errorLines(fake).length, 1);
    assert.match(errorLines(fake)[0], /\[NameEntry\].*Permission denied/);

    // The message goes with the next change of the name.
    enter(fake, "i");
    assert.equal(reasonShown(fake), "");
    assert.equal(nameShown(fake), "Maxi");

    // Trying again goes through.
    moveTo(fake, "OK");
    press(fake, "Select");
    assert.equal(isNameEntryOpen(fake), false);
    assert.ok(store.listProfileNames().includes("Maxi"));
    assert.equal(highlighted(fake, [lang.profiles.guestName, "Alice", "Maxi", lang.profiles.newProfile]), "Maxi");
    assert.equal(errorLines(fake).length, 1, "no further error");
});

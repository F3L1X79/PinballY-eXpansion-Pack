// ============================================================
// Name Entry through main.js in an empty Household: the yellow line shows at
// each opening, the Profile created is an Admin Profile, and Guest, still
// active, loses the "+" and the setup entries until that Profile is picked.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { shownLayers } from "../support/shown_layers.js";
import { STEAMBALL_COLORS } from "../../common/drawing/steamball_palette.js";
import { NAME_ENTRY_Z_INDEX } from "../../common/profiles/name_entry_painter.js";
import { seesSetupEntries } from "../../common/profiles/setup_entries.js";
import {
    startOnWheel, press, step, highlighted, openNameEntry, isNameEntryOpen, nameEntryTexts, enterName, moveTo, pickerTexts, PROFILES_FOLDER,
} from "./name_entry_scenario.js";

test("the first Profile is announced in yellow, at each opening, and becomes an Admin Profile", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({ profiles: [], activeProfile: "guest" });
    const TEXT = lang.profiles.nameEntry;
    const label = lang.profiles.newProfile;
    const guest = lang.profiles.guestName;

    await openPicker();
    step(fake, "Next");
    assert.equal(highlighted(fake, [guest, label]), label);

    openNameEntry(fake);
    assert.deepEqual(nameEntryTexts(fake), [TEXT.title, ...TEXT.lines, TEXT.firstProfileLine]);
    const lineStroke = shownLayers(fake, NAME_ENTRY_Z_INDEX.texts).flatMap(layer => layer.strokes()).find(stroke => stroke.text === TEXT.firstProfileLine);
    assert.equal(lineStroke.color, STEAMBALL_COLORS.notice);

    // Nothing remembers it: leaving and coming back shows it again.
    press(fake, "Exit");
    assert.equal(isNameEntryOpen(fake), false);
    openNameEntry(fake);
    assert.deepEqual(nameEntryTexts(fake), [TEXT.title, ...TEXT.lines, TEXT.firstProfileLine]);

    enterName(fake, "Max");
    moveTo(fake, "OK");
    press(fake, "Select");

    assert.equal(isNameEntryOpen(fake), false);
    assert.equal(JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\Max\\profile.json`)).isAdmin, true);
    assert.equal(store.isAdmin("Max"), true);
    assert.equal(store.getActiveProfile().name, "guest", "no switch happens");
    assert.equal(seesSetupEntries(store), false, "Guest no longer sees the setup entries");

    // The picker comes back on it, and the "+" is gone for Guest.
    assert.equal(highlighted(fake, [guest, "Max", label]), "Max");
    step(fake, "Next");
    assert.equal(highlighted(fake, [guest, "Max", label]), guest);
    step(fake, "Next");
    assert.equal(highlighted(fake, [guest, "Max", label]), "Max", "only two slots are left");
    assert.equal(pickerTexts(fake).includes(label), false);

    // Picking it gives the setup entries and the "+" back.
    press(fake, "Select");
    assert.equal(store.getActiveProfile().name, "Max");
    assert.equal(seesSetupEntries(store), true);

    assertNoErrorLogged(fake);
});

// ============================================================
// Avatar Choice through main.js, with no portrait folder: Name Entry's OK
// creates the Profile, Avatar Choice is skipped with one log line, and the
// picker comes back on the new Profile wearing the Default Avatar.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { shownLayers } from "../support/shown_layers.js";
import { AVATAR_CHOICE_Z_INDEX } from "../../common/profiles/avatar_choice_painter.js";
import {
    startOnWheel, step, highlighted, openNameEntry, isNameEntryOpen, createThroughNameEntry, isAvatarChoiceOpen, pickerAvatars,
    PROFILES_FOLDER, PORTRAITS_FOLDER, DEFAULT_AVATAR,
} from "./name_entry_scenario.js";

test("with no readable portrait, Avatar Choice is skipped and the picker comes back on the new Profile", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({ profiles: ["Alice"], activeProfile: "Alice", portraits: [] });

    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Maxx");
    assert.equal(isNameEntryOpen(fake), false);
    assert.equal(isAvatarChoiceOpen(fake), false, "Avatar Choice is skipped");
    assert.deepEqual(shownLayers(fake, AVATAR_CHOICE_Z_INDEX.backdrop - 2), [], "with no veil over the picker");
    assert.ok(store.listProfiles().some(profile => profile.name === "Maxx"), "the Profile is created");
    assert.equal(fake.files.fileExists(`${PROFILES_FOLDER}\\Maxx\\avatar.png`), false);
    assert.equal(highlighted(fake, [lang.profiles.guestName, "Alice", "Maxx", lang.profiles.newProfile]), "Maxx", "the picker comes back on it");
    assert.ok(pickerAvatars(fake).includes(DEFAULT_AVATAR), "wearing the Default Avatar");

    // The picker has the buttons back.
    step(fake, "Next");
    assert.equal(highlighted(fake, [lang.profiles.guestName, "Alice", "Maxx", lang.profiles.newProfile]), lang.profiles.newProfile);

    assert.deepEqual(errorLines(fake), [`[AvatarChoice] ERROR No readable portrait in ${PORTRAITS_FOLDER}; Avatar Choice is skipped.`]);
});

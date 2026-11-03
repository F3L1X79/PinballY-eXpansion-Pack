// ============================================================
// Name Entry in German through main.js: Guest's name as the language shows
// it, in any letter case, is refused on the screen.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheel, step, openNameEntry, assertRefused, PROFILES_FOLDER } from "./name_entry_scenario.js";

test("German's Gast is refused like guest", async () => {
    const { fake, lang, openPicker } = await startOnWheel({ profiles: ["Alice"], activeProfile: "Alice", language: "de" });
    assert.equal(lang.profiles.guestName, "Gast");
    const foldersBefore = fake.files.listFolders(PROFILES_FOLDER);

    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);

    for (const name of ["Gast", "gast", "GAST"]) assertRefused(fake, name, lang.profiles.nameEntry.refusals.guest);

    assert.deepEqual(fake.files.listFolders(PROFILES_FOLDER), foldersBefore, "nothing created");
    assertNoErrorLogged(fake);
});

// ============================================================
// Name Entry through main.js when the first Profile's Admin mark cannot be
// saved: the Profile stays, the Error Log has the error, the picker comes back
// on it, and Manage profiles still offers the mark once it is picked.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { seesManageProfiles, seesSetupEntries } from "../../common/profiles/setup_entries.js";
import {
    startOnWheel, press, step, highlighted, openNameEntry, isNameEntryOpen, nameEntryTexts, enterName, moveTo, passThroughAvatarChoice, PROFILES_FOLDER,
} from "./name_entry_scenario.js";

test("a mark that cannot be saved keeps the Profile and is logged, and it can still become admin", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({ profiles: [], activeProfile: "guest" });
    const label = lang.profiles.newProfile;
    const names = [lang.profiles.guestName, "Max", label];

    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    enterName(fake, "Max");
    moveTo(fake, "OK");
    fake.lockFile(`${PROFILES_FOLDER}\\Max\\profile.tmp.json`);
    press(fake, "Select");

    assert.equal(isNameEntryOpen(fake), false);
    assert.ok(store.listProfileNames().includes("Max"), "the Profile is kept");
    passThroughAvatarChoice(fake);
    assert.equal(highlighted(fake, names), "Max", "the picker comes back on it");
    assert.equal(store.hasAdminProfile(), false);
    assert.equal(seesSetupEntries(store), true, "everyone still sees the setup entries");
    assert.equal(errorLines(fake).length, 1);
    assert.match(errorLines(fake)[0], /\[ProfileStore\].*Permission denied/);

    // The "+" stays, as the Household has no Admin Profile.
    step(fake, "Next");
    assert.equal(highlighted(fake, names), label);

    // The Household has a Profile now, so the yellow line is gone.
    openNameEntry(fake);
    assert.deepEqual(nameEntryTexts(fake), [lang.profiles.nameEntry.title, ...lang.profiles.nameEntry.lines]);
    press(fake, "Exit");
    step(fake, "Prev");

    fake.unlockFile(`${PROFILES_FOLDER}\\Max\\profile.tmp.json`);
    press(fake, "Select");
    assert.equal(store.getActiveProfile().name, "Max");
    assert.equal(seesManageProfiles(store), true, "Manage profiles still offers Become admin");
    assert.equal(errorLines(fake).length, 1, "no further error");
});

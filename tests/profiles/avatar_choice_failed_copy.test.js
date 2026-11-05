// ============================================================
// Avatar Choice through main.js, its copy failing: the error is logged,
// and the picker comes back on the new Profile, wearing the Default Avatar.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import {
    startOnWheel, press, step, highlighted, openNameEntry, createThroughNameEntry, isAvatarChoiceOpen, PROFILES_FOLDER,
} from "./name_entry_scenario.js";

test("a portrait that cannot be copied is logged, and the Profile keeps the Default Avatar", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({ profiles: ["Alice"], activeProfile: "Alice" });

    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Max");
    fake.failNextCopy();
    press(fake, "Select");

    assert.equal(isAvatarChoiceOpen(fake), false);
    assert.equal(errorLines(fake).length, 1, "the failed copy is logged");
    assert.match(errorLines(fake)[0], /\[AvatarChoice\].*Permission denied/);
    assert.equal(fake.files.fileExists(`${PROFILES_FOLDER}\\Max\\avatar.png`), false);
    assert.match(store.listProfiles().find(profile => profile.name === "Max").avatarPath, /default_avatar\.png$/);
    assert.equal(highlighted(fake, [lang.profiles.guestName, "Alice", "Max", lang.profiles.newProfile]), "Max", "the picker comes back on the Profile");
});

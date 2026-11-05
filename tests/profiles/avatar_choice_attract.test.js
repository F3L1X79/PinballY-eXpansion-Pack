// ============================================================
// Avatar Choice through main.js, cut by attract mode: the screen and the
// picker close, nothing is copied, and the Profile stays with the Default
// Avatar; the buttons go back to the wheel.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import {
    startOnWheel, press, step, openNameEntry, createThroughNameEntry, pickerTexts, isAvatarChoiceOpen, PROFILES_FOLDER, GLIDE_OVER_MS,
} from "./name_entry_scenario.js";

test("attract mode closes Avatar Choice and the picker, copying nothing", async () => {
    const { fake, store, openPicker } = await startOnWheel({ profiles: ["Alice"], activeProfile: "Alice" });

    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Max");
    press(fake, "Next");
    fake.fire("attractmodestart");

    assert.equal(isAvatarChoiceOpen(fake), false);
    assert.deepEqual(pickerTexts(fake), [], "the picker closes with it");
    assert.ok(store.listProfileNames().includes("Max"), "the Profile stays");
    assert.equal(fake.files.fileExists(`${PROFILES_FOLDER}\\Max\\avatar.png`), false, "nothing copied");
    assert.match(store.listProfiles().find(profile => profile.name === "Max").avatarPath, /default_avatar\.png$/);
    assert.equal(press(fake, "Next").defaultPrevented, false, "the buttons are back");
    fake.advanceTime(GLIDE_OVER_MS);

    assertNoErrorLogged(fake);
});

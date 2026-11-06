// ============================================================
// Avatar Choice's confirmation through main.js, cut by attract mode: the
// panel, the screen and the picker close without asking, nothing is copied,
// and the buttons go back to the wheel.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { AVATAR_CHOICE_Z_INDEX as Z } from "../../common/profiles/avatar_choice_painter.js";
import {
    startOnWheel, press, step, openNameEntry, createThroughNameEntry, pickerTexts, isAvatarChoiceOpen, isConfirmationOpen,
    PROFILES_FOLDER, GLIDE_OVER_MS,
} from "./name_entry_scenario.js";

test("attract mode closes the confirmation, Avatar Choice and the picker, copying nothing", async () => {
    const { fake, store, openPicker } = await startOnWheel({ profiles: ["Alice"], activeProfile: "Alice" });

    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    createThroughNameEntry(fake, "Max");
    press(fake, "Exit");
    assert.equal(isConfirmationOpen(fake), true);
    fake.fire("attractmodestart");

    assert.equal(isConfirmationOpen(fake), false);
    assert.equal(isAvatarChoiceOpen(fake), false);
    const left = fake.drawingLayers().filter(layer => Object.values(Z).includes(layer.zIndex));
    assert.deepEqual(left, [], "no layer of the screen nor of its confirmation is left");
    assert.deepEqual(pickerTexts(fake), [], "the picker closes with it");
    assert.ok(store.listProfileNames().includes("Max"), "the Profile stays");
    assert.equal(fake.files.fileExists(`${PROFILES_FOLDER}\\Max\\avatar.png`), false, "nothing copied");
    assert.equal(press(fake, "Next").defaultPrevented, false, "the buttons are back");
    // Past a few of the markers' ticks, which must be stopped.
    fake.advanceTime(GLIDE_OVER_MS);

    assertNoErrorLogged(fake);
});

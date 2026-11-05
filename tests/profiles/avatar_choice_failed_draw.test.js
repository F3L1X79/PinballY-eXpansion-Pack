// ============================================================
// Avatar Choice whose drawing fails: the opening is given up, logged, with
// no layer left behind, nothing copied, and the Profile picker comes back
// on the new Profile with the buttons.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { whileDrawsFail, FAILING_DRAW_MESSAGE } from "../support/failing_draws.js";
import { AVATAR_CHOICE_Z_INDEX } from "../../common/profiles/avatar_choice_painter.js";
import {
    startOnWheel, step, press, highlighted, openNameEntry, enterName, moveTo, isAvatarChoiceOpen, PROFILES_FOLDER, AVATAR_CHOICE_OPEN_MS,
} from "./name_entry_scenario.js";

const avatarChoiceLayers = fake => fake.drawingLayers().filter(layer => Object.values(AVATAR_CHOICE_Z_INDEX).includes(layer.zIndex));

test("a draw that fails gives Avatar Choice up and brings back the picker on the new Profile", async () => {
    const { fake, lang, store, openPicker } = await startOnWheel({ profiles: ["Alice"], activeProfile: "Alice" });
    const names = [lang.profiles.guestName, "Alice", "Max", lang.profiles.newProfile];
    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    enterName(fake, "Max");
    moveTo(fake, "OK");

    whileDrawsFail(() => {
        press(fake, "Select");
        fake.advanceTime(AVATAR_CHOICE_OPEN_MS);
    });
    assert.equal(isAvatarChoiceOpen(fake), false, "the opening is given up");
    assert.deepEqual(avatarChoiceLayers(fake), [], "no layer left behind");
    assert.ok(errorLines(fake).length > 0, "the failure is logged");
    assert.ok(errorLines(fake).every(line => line.includes(FAILING_DRAW_MESSAGE)), "no other error");
    assert.ok(store.listProfileNames().includes("Max"), "the Profile stays");
    assert.equal(fake.files.fileExists(`${PROFILES_FOLDER}\\Max\\avatar.png`), false, "nothing copied");

    // The carousel's own name for Max failed with the same draws: drawn once they work again.
    step(fake, "Prev");
    step(fake, "Next");
    assert.equal(highlighted(fake, names), "Max", "the picker came back on the new Profile");
    assert.equal(press(fake, "Exit").defaultPrevented, true, "the Profile picker has the buttons again");
});

// ============================================================
// Avatar Choice following a change of window size: drawn again in place
// for the new grid shape, during the fade in (which goes on), then on a
// portrait, then on the confirmation, each time keeping what is current;
// nothing redrawn while the size stays the same.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { shownLayers } from "../support/shown_layers.js";
import { AVATAR_CHOICE_Z_INDEX } from "../../common/profiles/avatar_choice_painter.js";
import {
    startOnWheel, step, press, openNameEntry, enterName, moveTo, isAvatarChoiceOpen, currentPortrait, portraitOf, portraitRows, portraitsInRows,
    isConfirmationOpen, currentConfirmationChoice, AVATAR_CHOICE_OPEN_MS,
} from "./name_entry_scenario.js";

const WIDE = { width: 1920, height: 1080 };
const TALL = { width: 1080, height: 1920 };
// Past the window watch's period (about 100 ms).
const WATCH_OVER_MS = 120;
const SLICE_MS = 10;

const redrawLines = fake => fake.logLines().filter(line => line.includes("[AvatarChoice]") && line.includes("redrawn for the window's new size"));
const backdrops = fake => fake.drawingLayers().filter(layer => layer.zIndex === AVATAR_CHOICE_Z_INDEX.backdrop);

function waitUntilOpened(fake) {
    for (let waited = 0; !fake.logLines().some(line => line.startsWith("[AvatarChoice] Opened")); waited += SLICE_MS) {
        assert.ok(waited < AVATAR_CHOICE_OPEN_MS, "Avatar Choice opens");
        fake.advanceTime(SLICE_MS);
    }
}

function resize(fake, size) {
    fake.setLayoutSize(size);
    fake.advanceTime(WATCH_OVER_MS);
    assert.equal(backdrops(fake).length, 1, "the old backdrop is gone");
    assert.deepEqual(backdrops(fake)[0].canvasSize(), size, "drawn again for the new size");
}

test("Avatar Choice is redrawn for the window's new size, what is current kept", async () => {
    const { fake, openPicker } = await startOnWheel({ fakeOptions: { layoutSize: WIDE } });
    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    enterName(fake, "Max");
    moveTo(fake, "OK");
    press(fake, "Select");
    waitUntilOpened(fake);

    // During the fade in: it goes on over the new layers.
    resize(fake, TALL);
    const { alpha } = backdrops(fake)[0];
    assert.ok(alpha > 0 && alpha < 1, `still fading in, at ${alpha}`);
    fake.advanceTime(AVATAR_CHOICE_OPEN_MS);
    assert.equal(backdrops(fake)[0].alpha, 1, "the fade in ends");
    assert.deepEqual(portraitRows(fake), portraitsInRows(4));
    assert.equal(currentPortrait(fake), portraitOf(1));

    // On a portrait: the marker stays on it.
    press(fake, "Next");
    press(fake, "Next");
    resize(fake, WIDE);
    assert.deepEqual(portraitRows(fake), portraitsInRows(8));
    assert.equal(currentPortrait(fake), portraitOf(3), "the current portrait is kept");
    assert.equal(shownLayers(fake, AVATAR_CHOICE_Z_INDEX.tooltip).length, 0, "the Exit Button's tooltip stays hidden");

    // On the confirmation: still asked, its current choice kept.
    press(fake, "Exit");
    press(fake, "Next");
    const keepDefault = currentConfirmationChoice(fake);
    resize(fake, TALL);
    assert.equal(isConfirmationOpen(fake), true, "the confirmation is still asked");
    assert.equal(shownLayers(fake, AVATAR_CHOICE_Z_INDEX.confirmationPanel).length, 1);
    assert.equal(currentConfirmationChoice(fake), keepDefault, "its current choice is kept");
    assert.equal(shownLayers(fake, AVATAR_CHOICE_Z_INDEX.marker).length, 0, "the grid's marker stays set aside");
    press(fake, "Exit");
    assert.equal(isConfirmationOpen(fake), false);
    assert.equal(currentPortrait(fake), portraitOf(3), "back on the grid where it was");

    assert.equal(redrawLines(fake).length, 3, redrawLines(fake).join("\n"));
    assert.match(redrawLines(fake)[0], /1920x1080 to 1080x1920/);
    fake.advanceTime(1000);
    assert.equal(redrawLines(fake).length, 3, "nothing redrawn while the size stays the same");
    assert.equal(isAvatarChoiceOpen(fake), true);
    assertNoErrorLogged(fake);
});

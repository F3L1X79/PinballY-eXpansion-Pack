// ============================================================
// Name Entry when the window changes size while it is still getting ready,
// as PinballY laying its window out at startup: it may take longer than the
// window watch keeps retrying, and the screen still ends up drawn for the
// final size.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { shownLayers } from "../support/shown_layers.js";
import { NAME_ENTRY_Z_INDEX } from "../../common/profiles/name_entry_painter.js";
import { startOnWheel, step, press, isNameEntryOpen, nameShown, currentCharacter } from "./name_entry_scenario.js";

const LARGE = { width: 2560, height: 1600 };
const OTHER = { width: 1080, height: 1920 };
// A draw as slow as on the cabinet, so the 60 layers take over 2 s.
const DRAW_MS = 45;
const FIRST_SLICE_MS = 1;
// The window watch gives up after about a second of its screen not following.
const WATCH_RETRIES_OVER_MS = 1300;
const OPENING_OVER_MS = 3000;

test("a window resized while Name Entry gets ready has it drawn for the final size", async () => {
    const { fake, openPicker } = await startOnWheel({ fakeOptions: { layoutSize: LARGE } });
    await openPicker();
    step(fake, "Next");
    fake.setDrawMs(DRAW_MS);
    press(fake, "Select");
    // The first slice: the backdrop has measured the old size.
    fake.advanceTime(FIRST_SLICE_MS);
    fake.setLayoutSize(OTHER);
    fake.advanceTime(WATCH_RETRIES_OVER_MS);
    assert.equal(isNameEntryOpen(fake), false, "still getting ready once the watch's retries are over");
    fake.setDrawMs(0);
    fake.advanceTime(OPENING_OVER_MS);

    assert.equal(isNameEntryOpen(fake), true);
    const backdrops = shownLayers(fake, NAME_ENTRY_Z_INDEX.backdrop);
    assert.equal(backdrops.length, 1);
    assert.deepEqual(backdrops[0].canvasSize(), OTHER, "laid out for the final size");
    assert.equal(nameShown(fake), "");
    assert.equal(currentCharacter(fake), "A");
    assertNoErrorLogged(fake);
});

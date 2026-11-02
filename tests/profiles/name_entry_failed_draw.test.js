// ============================================================
// Name Entry whose drawing fails: the opening is given up, logged, with no
// layer left behind and the buttons back to the Profile picker, still on the
// "+". The same when it fails while following a change of window size.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { whileDrawsFail, FAILING_DRAW_MESSAGE } from "../support/failing_draws.js";
import { NAME_ENTRY_Z_INDEX } from "../../common/profiles/name_entry_painter.js";
import { startOnWheel, step, press, highlighted, openNameEntry, isNameEntryOpen, NAME_ENTRY_OPEN_MS } from "./name_entry_scenario.js";

const LARGE = { width: 2560, height: 1600 };
const OTHER = { width: 1080, height: 1920 };
// Past the window watch's period (about 100 ms).
const WATCH_OVER_MS = 120;

const nameEntryLayers = fake => fake.drawingLayers().filter(layer => Object.values(NAME_ENTRY_Z_INDEX).includes(layer.zIndex));

test("a draw that fails gives Name Entry up and leaves no layer behind", async () => {
    const { fake, lang, openPicker } = await startOnWheel({ fakeOptions: { layoutSize: LARGE } });
    const names = [lang.profiles.guestName, "Alice", "Bob", lang.profiles.newProfile];
    await openPicker();
    step(fake, "Next");

    whileDrawsFail(() => {
        press(fake, "Select");
        fake.advanceTime(NAME_ENTRY_OPEN_MS);
    });
    assert.equal(isNameEntryOpen(fake), false, "the opening is given up");
    assert.deepEqual(nameEntryLayers(fake), [], "no layer left behind");
    assert.ok(errorLines(fake).some(line => line.includes(FAILING_DRAW_MESSAGE)), "the failure is logged");
    assert.equal(highlighted(fake, names), lang.profiles.newProfile, "back on the +");

    const errorsAfterOpening = errorLines(fake).length;
    openNameEntry(fake);
    whileDrawsFail(() => {
        fake.setLayoutSize(OTHER);
        fake.advanceTime(WATCH_OVER_MS);
    });
    assert.equal(isNameEntryOpen(fake), false, "given up while following the window too");
    assert.deepEqual(nameEntryLayers(fake), [], "no layer left behind");
    assert.ok(errorLines(fake).length > errorsAfterOpening, "that failure is logged too");
    assert.equal(press(fake, "Exit").defaultPrevented, true, "the Profile picker has the buttons again");
});

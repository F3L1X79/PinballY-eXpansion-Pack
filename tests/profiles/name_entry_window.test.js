// ============================================================
// Name Entry following a change of window size: drawn again in place, the
// name and the current character kept, shown at once, nothing redrawn while
// the size stays the same.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { shownLayers } from "../support/shown_layers.js";
import { NAME_ENTRY_Z_INDEX } from "../../common/profiles/name_entry_painter.js";
import { startOnWheel, step, openNameEntry, enter, nameShown, currentCharacter, isNameEntryOpen } from "./name_entry_scenario.js";

const LARGE = { width: 2560, height: 1600 };
const OTHER = { width: 1080, height: 1920 };
// Past the window watch's period (about 100 ms).
const WATCH_OVER_MS = 120;

const redrawLines = fake => fake.logLines().filter(line => line.includes("[NameEntry]") && line.includes("redrawn for the window's new size"));

test("Name Entry is redrawn for the window's new size, its name and character kept", async () => {
    const { fake, openPicker } = await startOnWheel({ fakeOptions: { layoutSize: LARGE } });
    await openPicker();
    step(fake, "Next");
    openNameEntry(fake);
    enter(fake, "M");
    enter(fake, "c");
    assert.equal(nameShown(fake), "Mc");

    fake.setLayoutSize(OTHER);
    fake.advanceTime(WATCH_OVER_MS);
    const [backdrop] = shownLayers(fake, NAME_ENTRY_Z_INDEX.backdrop);
    assert.deepEqual(backdrop.canvasSize(), OTHER, "drawn again for the new size");
    assert.equal(backdrop.alpha, 1, "shown at once, no fade");
    assert.equal(shownLayers(fake, NAME_ENTRY_Z_INDEX.backdrop).length, 1, "the old backdrop is gone");
    assert.equal(nameShown(fake), "Mc", "the name is kept");
    assert.equal(currentCharacter(fake), "c", "the current character is kept");
    assert.equal(redrawLines(fake).length, 1, redrawLines(fake).join("\n"));
    assert.match(redrawLines(fake)[0], /2560x1600 to 1080x1920/);

    fake.advanceTime(1000);
    assert.equal(redrawLines(fake).length, 1, "nothing redrawn while the size stays the same");
    assert.equal(isNameEntryOpen(fake), true);
    assertNoErrorLogged(fake);
});

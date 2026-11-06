// ============================================================
// Name Entry keeps the hidden layer rule, through main.js on the fake
// PinballY globals: open at rest and after moving along the ring, no hidden
// layer of its own is more than a point and no visible one is a point; the
// backdrop shows over the whole window; closed, none of its layers is left.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { NAME_ENTRY_Z_INDEX } from "../../common/profiles/name_entry_painter.js";
import { startOnWheel, press, step, highlighted, openNameEntry, isNameEntryOpen, currentCharacter } from "./name_entry_scenario.js";

// The marker is the Selection Marker's own: left to it.
const SCREEN_Z_INDEXES = Object.entries(NAME_ENTRY_Z_INDEX).filter(([name]) => name !== "marker").map(([, zIndex]) => zIndex);
const WINDOW_SPAN = { xSpan: 1, ySpan: 1 };

const screenLayers = fake => fake.drawingLayers().filter(layer => SCREEN_Z_INDEXES.includes(layer.zIndex));

function assertRuleHeld(fake, where) {
    assert.ok(screenLayers(fake).length > 0, where);
    assert.deepEqual(layersBreakingTheRule(fake, screenLayers(fake)), [], where);
}

test("Name Entry leaves no hidden layer bigger than a point, nor a visible one that is a point", async () => {
    const { fake, lang, openPicker } = await startOnWheel({ profiles: ["Alice", "Zed"], activeProfile: "Zed" });
    await openPicker();
    step(fake, "Next");
    assert.equal(highlighted(fake, [lang.profiles.guestName, "Alice", "Zed", lang.profiles.newProfile]), lang.profiles.newProfile);
    openNameEntry(fake);
    assertRuleHeld(fake, "open at rest");
    const [backdrop] = screenLayers(fake).filter(layer => layer.zIndex === NAME_ENTRY_Z_INDEX.backdrop);
    assert.deepEqual(backdrop.scale(), WINDOW_SPAN, "the backdrop shows over the whole window");

    for (let moves = 0; moves < 5; moves++) press(fake, "Next");
    assert.equal(currentCharacter(fake), "F");
    assertRuleHeld(fake, "after moving along the ring");

    press(fake, "Exit");
    assert.equal(isNameEntryOpen(fake), false);
    assert.equal(screenLayers(fake).length, 0, "closed, none of its layers is left");
    assertNoErrorLogged(fake);
});

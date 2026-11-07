// ============================================================
// An entry's note in a Drawn Menu, through main.js on the fake PinballY
// globals: the main menu's Rate Table draws its current Rating after its
// label, on the same line, smaller and grey, highlighted or not (the native
// item's whole title: main_menu_rate_table.test.js).
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { DRAWN_MENU_LOOK, DRAWN_MENU_Z_INDEX } from "../../common/drawn_menu/drawn_menu_painter.js";
import { readDrawnMenu, drawnRowBoxes, highlightedEntry, openMainMenu, press } from "./drawn_menu_reader.js";
import { shownLayers } from "../support/shown_layers.js";

const MEDIEVAL = "Medieval Madness (Williams 1997)";
const TABLES = [{ id: 1, configId: MEDIEVAL, title: "Medieval Madness", rating: 4.5 }];

test("Rate Table's current Rating is drawn after its label, smaller and grey", async () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 7, 20, 0, 0), tables: TABLES });
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    for (const key of Object.keys(config.addOns)) config.addOns[key] = ["drawnMenus", "uiTranslation", "customMenuCommands"].includes(key);
    config.startupScreen = "wheel";
    config.language = "en";
    await import("../../main.js");
    await settle();
    fake.advanceTime(5000);

    fake.setWheelTables([MEDIEVAL]);
    openMainMenu(fake);

    const rateTable = readDrawnMenu(fake).rows.find(row => row.title === "Rate Table");
    assert.deepEqual(rateTable, { kind: "entry", title: "Rate Table", mark: null, note: "(current: 4.5 / 5)" });

    const boxes = drawnRowBoxes(fake);
    const label = boxes.find(box => box.title === "Rate Table");
    const note = boxes.find(box => box.kind === "note");
    assert.equal(note.color, DRAWN_MENU_LOOK.colors.note);
    assert.ok(note.size < label.size, `the note at ${note.size} pt, the label at ${label.size} pt`);
    assert.equal(note.top, label.top, "on the label's line");

    // Highlighted: the label in gold, the note still grey.
    while (highlightedEntry(fake) !== "Rate Table") press(fake, "Next");
    const selected = shownLayers(fake, DRAWN_MENU_Z_INDEX.selectedText).find(layer => layer.texts().length > 0).strokes()
        .filter(stroke => "text" in stroke);
    assert.deepEqual(selected.map(stroke => [stroke.text.trim(), stroke.color]), [
        ["Rate Table", DRAWN_MENU_LOOK.colors.gold],
        ["(current: 4.5 / 5)", DRAWN_MENU_LOOK.colors.note],
    ]);
    assertNoErrorLogged(fake);
});

// ============================================================
// The main menu's Rate Table in a Drawn Menu, through main.js on the fake
// PinballY globals: on a rated table it reads its name alone, with no stars
// and no note, highlighted or not (the native item's title:
// main_menu_rate_table.test.js).
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { DRAWN_MENU_Z_INDEX } from "../../common/drawn_menu/drawn_menu_painter.js";
import { readDrawnMenu, highlightedEntry, openMainMenu, press } from "./drawn_menu_reader.js";
import { shownLayers } from "../support/shown_layers.js";

const MEDIEVAL = "Medieval Madness (Williams 1997)";
const TABLES = [{ id: 1, configId: MEDIEVAL, title: "Medieval Madness", rating: 4.5 }];

test("Rate Table is drawn as its name alone on a rated table, highlighted or not", async () => {
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
    assert.deepEqual(rateTable, { kind: "entry", title: "Rate Table", mark: null }, "no stars, no note");

    while (highlightedEntry(fake) !== "Rate Table") press(fake, "Next");
    const selected = shownLayers(fake, DRAWN_MENU_Z_INDEX.selectedText).find(layer => layer.texts().length > 0);
    assert.deepEqual(selected.texts(), ["Rate Table"]);
    assert.equal(selected.strokes().some(stroke => "fill" in stroke), false, "nothing drawn after it");
    assertNoErrorLogged(fake);
});

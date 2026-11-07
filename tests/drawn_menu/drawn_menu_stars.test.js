// ============================================================
// An entry's Rating drawn as stars in a Drawn Menu, through main.js on the
// fake PinballY globals: the main menu's Rate Table draws five stars after
// its label, on the same line, gold up to the current Rating, half stars
// included, highlighted or not (the native item's whole title:
// main_menu_rate_table.test.js).
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { DRAWN_MENU_LOOK, DRAWN_MENU_Z_INDEX } from "../../common/drawn_menu/drawn_menu_painter.js";
import { readDrawnMenu, highlightedEntry, openMainMenu, press } from "./drawn_menu_reader.js";
import { shownLayers } from "../support/shown_layers.js";

const MEDIEVAL = "Medieval Madness (Williams 1997)";
const TABLES = [{ id: 1, configId: MEDIEVAL, title: "Medieval Madness", rating: 4.5 }];
const { starFilled, starEmpty } = DRAWN_MENU_LOOK.colors;

// A layer's star fills, after the text stroke of this label.
function starFillsAfter(layer, label) {
    const strokes = layer.strokes();
    const labelIndex = strokes.findIndex(stroke => stroke.text === label);
    const fills = [];
    for (const stroke of strokes.slice(labelIndex + 1)) {
        if (!("fill" in stroke) || ![starFilled, starEmpty].includes(stroke.fill)) break;
        fills.push(stroke);
    }
    return { label: strokes[labelIndex], fills };
}

const ratingOfFills = fills => {
    const areaOf = color => fills.filter(fill => fill.fill === color).reduce((sum, { rect }) => sum + rect.width * rect.height, 0);
    return Math.round(10 * areaOf(starFilled) / (areaOf(starFilled) + areaOf(starEmpty))) / 2;
};

test("Rate Table's current Rating is drawn as stars after its label, highlighted or not", async () => {
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
    assert.deepEqual(rateTable, { kind: "entry", title: "Rate Table", mark: null, stars: 4.5 }, "stars, no note text");

    const texts = shownLayers(fake, DRAWN_MENU_Z_INDEX.texts).find(layer => layer.texts().length > 0);
    const { label, fills } = starFillsAfter(texts, "Rate Table");
    const labelEnd = label.rect.x + label.rect.width;
    assert.ok(fills.every(fill => fill.rect.x >= labelEnd - 4), "after the label");
    const top = Math.min(...fills.map(fill => fill.rect.y));
    const bottom = Math.max(...fills.map(fill => fill.rect.y + fill.rect.height));
    assert.ok(top >= label.rect.y && bottom <= label.rect.y + label.rect.height + 1, "on the label's line");

    // Highlighted: the label in gold, the same stars.
    while (highlightedEntry(fake) !== "Rate Table") press(fake, "Next");
    const selected = shownLayers(fake, DRAWN_MENU_Z_INDEX.selectedText).find(layer => layer.texts().length > 0);
    const highlighted = starFillsAfter(selected, "Rate Table");
    assert.equal(highlighted.label.color, DRAWN_MENU_LOOK.colors.gold);
    assert.equal(ratingOfFills(highlighted.fills), 4.5);
    assertNoErrorLogged(fake);
});

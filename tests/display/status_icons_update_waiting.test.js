// ============================================================
// Status Icons, through main.js, with a newer Pack Version remembered at an
// earlier start: the gold arrow beside the wheel's clock from the start, in
// a slot that never follows the time's width, kept after "Later" in the
// Update Prompt, hidden during a game and back on the wheel.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { startOnProfilePicker } from "../core/startup_picker_scenario.js";
import { statusIconsLayer, shownIcons, shownIconNames, assertInSlot, PACK_UPDATE_WAITING } from "./status_icons_reader.js";

const STATE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\pack_update.json";
const RELEASE = {
    packVersion: "9.0.0",
    zipUrl: "https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/download/v9.0.0/ExpansionPack.zip",
    sha256: "c0".repeat(32),
};
const GAME = { id: 1, configId: "mm", title: "Medieval Madness" };

test("a remembered newer Pack Version shows the gold arrow beside the clock until the Pack Update", async () => {
    const { fake, lang, settle } = await startOnProfilePicker({
        addOns: ["startupChoicePrompt", "profilePicker", "drawnMenus", "clock", "statusIcons"],
        tables: [GAME],
        now: new Date(2026, 10, 1, 21, 59, 30),
        seed: f => f.addFile(STATE_FILE, JSON.stringify({ version: 1, latestRelease: RELEASE })),
    });
    await settle();

    const layer = statusIconsLayer(fake);
    assert.ok(layer.canvasSize().width < 600, "its own canvas, not the window's");
    assert.deepEqual(Object.keys(layer.scale()), ["ySpan"], "only one span set, so it keeps its proportions");
    assert.equal(layer.position().align, "top left");
    assert.deepEqual(shownIconNames(fake), [PACK_UPDATE_WAITING], "from the start, without a fade");
    assert.equal(shownIcons(fake)[0].alpha, 0xFF);

    assertInSlot(fake, lang, "right of the widest time the clock can show");
    const slot = shownIcons(fake)[0].left;
    fake.advanceTime(30 * 1000);
    assert.equal(lang.clock.time(22, 0).length, lang.clock.time(21, 59).length + 1, "the time grew wider");
    assert.equal(shownIcons(fake)[0].left, slot, "the slot never follows the time's width");

    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Later");
    await settle();
    assert.deepEqual(shownIconNames(fake), [PACK_UPDATE_WAITING], "kept after Later");

    // The clock's drawings have its time; the icons' none.
    const iconDrawings = () => fake.drawings().filter(drawing => drawing.zIndex === layer.zIndex && drawing.texts.length === 0).length;
    const drawnBefore = iconDrawings();
    fake.gameStarted(GAME);
    assert.equal(layer.alpha, 0, "hidden while a game runs");
    fake.gameOver(GAME);
    assert.equal(layer.alpha, 1, "back on the wheel");
    assert.deepEqual(shownIconNames(fake), [PACK_UPDATE_WAITING]);
    assert.equal(iconDrawings(), drawnBefore, "the same icons are not drawn again");
    assertNoErrorLogged(fake);
});

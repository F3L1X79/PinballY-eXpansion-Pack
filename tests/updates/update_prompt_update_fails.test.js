// ============================================================
// "Update now" whose helper never gets ready: after 120 s the failure is
// logged, "Update not possible" shows at once with OK, PinballY stays, and
// the Profile picker follows; the request is forgotten.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { readDrawnMenu, drawnMenuLines, isDrawnMenuShown, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { readLoader } from "../support/loader_reader.js";
import { DIMMED_WHEEL } from "../../common/drawing/steamball_drawing.js";
import { DRAWN_MENU_Z_INDEX } from "../../common/drawn_menu/drawn_menu_painter.js";
import { startOnProfilePicker, isCarouselOpen, CAROUSEL_OPEN_MS } from "../core/startup_picker_scenario.js";

const STATE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\pack_update.json";
const PACK_UPDATE_HELPER = "C:\\PinballY\\Scripts\\ExpansionPack\\tools\\pack_update.ps1";
const RELEASE = {
    packVersion: "9.0.0",
    zipUrl: "https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/download/v9.0.0/ExpansionPack.zip",
    sha256: "c0".repeat(32),
};

test("a Pack Update that never gets ready says so at once, and PinballY stays", async () => {
    const { fake, lang, settle } = await startOnProfilePicker({
        addOns: ["startupChoicePrompt", "profilePicker", "drawnMenus"],
        seed: f => {
            f.addFile(STATE_FILE, JSON.stringify({ version: 1, latestRelease: RELEASE }));
            f.addFile(PACK_UPDATE_HELPER, "helper");
            f.failNextPackUpdate();
        },
    });
    await settle();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Update now");
    fake.advanceTime(119000);
    await settle();
    assert.deepEqual(errorLines(fake), [], "still waiting for the helper");
    assert.equal(readLoader(fake).shown, true);

    fake.advanceTime(1000);
    await settle();
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(errorLines(fake).length, 1);
    assert.match(errorLines(fake)[0], /^\[PackUpdate\] ERROR Pack Update not possible: .*not ready after 120 s/);
    assert.deepEqual([readDrawnMenu(fake).title, readDrawnMenu(fake).message], ["Update not possible", "The eXpansion Pack stays as it is."]);
    assert.deepEqual(drawnMenuLines(fake), ["OK"]);
    assert.ok(!fake.executedCommands().includes(fake.getBuiltInCommand("Quit")));
    assert.equal(readLoader(fake).shown, false, "the Loader went before the message");
    assert.equal(isCarouselOpen(fake, lang), false, "the message comes before the picker");
    assert.equal(JSON.parse(fake.readFile(STATE_FILE)).requestedVersion, undefined, "no update in progress");

    chooseEntry(fake, "OK");
    assert.equal(isDrawnMenuShown(fake), false);
    await settle();
    fake.advanceTime(CAROUSEL_OPEN_MS + OPEN_OVER_MS);
    assert.equal(isCarouselOpen(fake, lang), true, "the picker opens once the message closed");
    assert.equal(fake.drawingLayers().filter(layer => layer.clearColor() === DIMMED_WHEEL && layer.zIndex === DRAWN_MENU_Z_INDEX.backdrop - 2).length, 0, "no update veil left");
    assert.equal(fake.drawingLayers().filter(layer => layer.zIndex === DRAWN_MENU_Z_INDEX.backdrop - 1).length, 0, "no comet nor caption layer left");
    assert.equal(errorLines(fake).length, 1, "no other error");
});

// ============================================================
// A restart of PinballY that never gets ready, through main.js: the restart
// helper writes no ready file within 15 s, the failure is logged, "Restart
// not possible: the settings will apply at the next start" shows over the
// wheel with OK, and PinballY stays open.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost, settle } from "../support/fake_pinbally_host.js";
import config from "../../common/core/config.js";
import { readDrawnMenu, drawnMenuLines, isDrawnMenuShown, press, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { errorLines } from "../support/error_log.js";
import { readLoader } from "../support/loader_reader.js";
import { DIMMED_WHEEL } from "../../common/drawing/steamball_drawing.js";

const RESTART_HELPER = "C:\\PinballY\\Scripts\\ExpansionPack\\tools\\restart_pinbally.ps1";
const fake = createFakePinballYHost({ now: new Date(2026, 9, 23, 20, 0, 0) });

test("setup", async () => {
    // Never uninstalled: node --test runs each test file in its own process.
    fake.installGlobals();
    fake.addFile(RESTART_HELPER, "helper");
    // No .env.local: the defaults are saved, and differ from what runs.
    for (const key of Object.keys(config.addOns)) config.addOns[key] = key === "drawnMenus";
    config.language = "en";
    await import("../../main.js");
    await settle();
});

test("a restart that never gets ready is logged, shows why, and PinballY stays", async () => {
    fake.failNextRestart();
    fake.openOperatorMenu();
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "eXpansion Pack Settings");
    fake.advanceTime(OPEN_OVER_MS);
    press(fake, "Exit");
    fake.advanceTime(OPEN_OVER_MS);
    chooseEntry(fake, "Restart now");
    fake.advanceTime(14000);
    assert.deepEqual(errorLines(fake), [], "still waiting for the helper");
    assert.equal(readLoader(fake).shown, true);

    fake.advanceTime(1000);
    await settle();
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(errorLines(fake).length, 1);
    assert.match(errorLines(fake)[0], /^\[ExpansionPackSettings\] ERROR Restart not possible: .*not ready after 15 s/);
    assert.deepEqual([readDrawnMenu(fake).title, readDrawnMenu(fake).message], ["Restart not possible", "The settings will apply at the next start."]);
    assert.deepEqual(drawnMenuLines(fake), ["OK"]);
    assert.ok(!fake.executedCommands().includes(fake.getBuiltInCommand("Quit")));
    assert.equal(readLoader(fake).shown, false, "the veil and the Loader went before the message");
    assert.equal(fake.drawingLayers().filter(layer => layer.clearColor() === DIMMED_WHEEL).length, 0, "no veil left");

    chooseEntry(fake, "OK");
    assert.equal(isDrawnMenuShown(fake), false);
    assert.equal(errorLines(fake).length, 1, "no other error");
});

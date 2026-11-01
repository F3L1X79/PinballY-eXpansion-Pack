// ============================================================
// Update Prompt at the start after a newer Pack Version was remembered: it
// opens before the Profile picker, names the version, and "Later" lets the
// picker open; the version is marked offered.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { readDrawnMenu, drawnMenuLines, isDrawnMenuShown, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { readLoader } from "../support/loader_reader.js";
import { startOnProfilePicker, isCarouselOpen, CAROUSEL_OPEN_MS } from "../core/startup_picker_scenario.js";

const STATE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\pack_update.json";
const RELEASE = {
    packVersion: "9.0.0",
    zipUrl: "https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/download/v9.0.0/ExpansionPack.zip",
    sha256: "c0".repeat(32),
};

test("the Update Prompt opens first, and the Profile picker follows Later", async () => {
    const { fake, lang, settle } = await startOnProfilePicker({
        addOns: ["startupChoicePrompt", "profilePicker", "drawnMenus"],
        seed: f => f.addFile(STATE_FILE, JSON.stringify({ version: 1, latestRelease: RELEASE })),
    });
    await settle();
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(readDrawnMenu(fake).message, "eXpansion Pack v9.0.0 is available.");
    assert.deepEqual(drawnMenuLines(fake), ["Update now", "Later"]);
    assert.equal(readLoader(fake).shown, false, "no Loader turning under the prompt");
    fake.advanceTime(CAROUSEL_OPEN_MS);
    assert.equal(isCarouselOpen(fake, lang), false, "the picker waits for the prompt");
    assert.equal(JSON.parse(fake.readFile(STATE_FILE)).offeredVersion, "9.0.0");

    chooseEntry(fake, "Later");
    assert.equal(isDrawnMenuShown(fake), false);
    await settle();
    fake.advanceTime(CAROUSEL_OPEN_MS + OPEN_OVER_MS);
    assert.equal(isCarouselOpen(fake, lang), true, "the picker opens once the prompt closed");
    assert.deepEqual(fake.packUpdatesAsked(), []);
    assertNoErrorLogged(fake);
});

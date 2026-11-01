// ============================================================
// Update Prompt in French: the message names the version and its two
// buttons read in the interface language.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { readDrawnMenu, drawnMenuLines, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { startOnProfilePicker } from "../core/startup_picker_scenario.js";

const STATE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\pack_update.json";
const RELEASE = {
    packVersion: "9.0.0",
    zipUrl: "https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/download/v9.0.0/ExpansionPack.zip",
    sha256: "c0".repeat(32),
};

test("the Update Prompt reads in French", async () => {
    const { fake, settle } = await startOnProfilePicker({
        addOns: ["startupChoicePrompt", "profilePicker", "drawnMenus"],
        settings: { language: "fr" },
        seed: f => f.addFile(STATE_FILE, JSON.stringify({ version: 1, latestRelease: RELEASE })),
    });
    await settle();
    fake.advanceTime(OPEN_OVER_MS);

    assert.deepEqual([readDrawnMenu(fake).title, readDrawnMenu(fake).message], ["Mise à jour disponible", "La version v9.0.0 de l'eXpansion Pack est disponible."]);
    assert.deepEqual(drawnMenuLines(fake), ["Mettre à jour", "Plus tard"]);
    assertNoErrorLogged(fake);
});

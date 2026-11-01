// ============================================================
// Update Prompt on the Welcome Screen Startup Screen: the prompt opens first,
// and the Welcome Screen only once it closes on "Later".
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { readDrawnMenu, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { WELCOME_SCREEN_OPEN_MS, isWelcomeScreenOpen } from "../welcome_screen/welcome_screen_reader.js";
import { startOnProfilePicker } from "../core/startup_picker_scenario.js";

const STATE_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\pack_update.json";
const RELEASE = {
    packVersion: "9.0.0",
    zipUrl: "https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/download/v9.0.0/ExpansionPack.zip",
    sha256: "c0".repeat(32),
};

test("the Welcome Screen waits for the Update Prompt, and follows Later", async () => {
    const { fake, settle } = await startOnProfilePicker({
        addOns: ["startupChoicePrompt", "profilePicker", "drawnMenus"],
        settings: { startupScreen: "welcome" },
        seed: f => f.addFile(STATE_FILE, JSON.stringify({ version: 1, latestRelease: RELEASE })),
    });
    await settle();
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(readDrawnMenu(fake).message, "eXpansion Pack v9.0.0 is available.");
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    assert.equal(isWelcomeScreenOpen(fake), false, "the Welcome Screen waits for the prompt");

    chooseEntry(fake, "Later");
    await settle();
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    await settle();
    assert.equal(isWelcomeScreenOpen(fake), true, "the Welcome Screen opens once the prompt closed");
    assertNoErrorLogged(fake);
});

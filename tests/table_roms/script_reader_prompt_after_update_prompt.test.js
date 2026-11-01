// ============================================================
// Script Reader Prompt with vpxtool missing while a newer Pack Version is
// remembered, through main.js on the fake host: the Update Prompt opens
// first, the Script Reader Prompt after its "Later", and the Profile picker
// only once that one closes.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { isCarouselOpen, CAROUSEL_OPEN_MS } from "../core/startup_picker_scenario.js";
import { OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { startForScriptReader, answer, pickHurriedly, shownDialog, PROMPT, UPDATE_STATE_FILE, MISSING_LOGGED } from "./script_reader_prompt_scenario.js";

const RELEASE = {
    packVersion: "9.0.0",
    zipUrl: "https://github.com/F3L1X79/PinballY-Expansion-Pack/releases/download/v9.0.0/ExpansionPack.zip",
    sha256: "c0".repeat(32),
};

test("the Script Reader Prompt comes after the Update Prompt and before the Startup Screen", async () => {
    const start = await startForScriptReader({
        seed: f => f.addFile(UPDATE_STATE_FILE, JSON.stringify({ version: 1, latestRelease: RELEASE })),
    });
    const { fake, lang } = start;
    assert.equal(start.dialog.message, "eXpansion Pack v9.0.0 is available.");

    await answer(start, "Later");
    fake.advanceTime(OPEN_OVER_MS);
    assert.deepEqual(shownDialog(fake), PROMPT);
    fake.advanceTime(CAROUSEL_OPEN_MS);
    assert.equal(isCarouselOpen(fake, lang), false, "the Startup Screen waits for the prompt");

    await answer(start, "No thanks");
    const { carouselOpen, errorCards } = await pickHurriedly(start);
    assert.equal(carouselOpen, true, "the Startup Screen opens once the prompt closed");
    assert.deepEqual(errorCards, []);
    assert.deepEqual(errorLines(fake), [MISSING_LOGGED]);
});

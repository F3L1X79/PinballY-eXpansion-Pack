// ============================================================
// PinballY Version Notice with a newer Pack Version remembered, through main.js
// on the fake host: the Update Prompt opens first, the Notice after its "Later",
// and the Startup Screen only once the Notice closes.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { isCarouselOpen, CAROUSEL_OPEN_MS } from "../core/startup_picker_scenario.js";
import { OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { answer, pickHurriedly, shownDialog } from "../table_roms/script_reader_prompt_scenario.js";
import { startOnUpdatePrompt } from "./version_notice_scenario.js";

test("the Notice comes after the Update Prompt and before the Startup Screen", async () => {
    const start = await startOnUpdatePrompt();
    const { fake, lang } = start;
    assert.equal(shownDialog(fake).message, "eXpansion Pack v9.0.0 is available.");

    await answer(start, "Later");
    fake.advanceTime(OPEN_OVER_MS);
    const notice = shownDialog(fake);
    assert.equal(notice.title, "Untested PinballY version");
    assert.deepEqual(notice.lines, ["Got it"]);
    fake.advanceTime(CAROUSEL_OPEN_MS);
    assert.equal(isCarouselOpen(fake, lang), false, "the Startup Screen waits for the Notice");

    await answer(start, "Got it");
    const { carouselOpen, errorCards } = await pickHurriedly(start);
    assert.equal(carouselOpen, true, "the Startup Screen opens once the Notice closed");
    assert.deepEqual(errorCards, []);
    assertNoErrorLogged(fake);
});

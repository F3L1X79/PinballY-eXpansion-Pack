// ============================================================
// The first start on the Pack Version an update installed, through main.js
// on the fake host, the check off, no Release Highlights on the way:
// "eXpansion Pack updated to vX.Y.Z" alone shows before the Profile picker,
// once, over the dimmed wheel without the Loader; the request is cleared.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { readLoader } from "../support/loader_reader.js";
import { startupVeil } from "../welcome_screen/welcome_screen_reader.js";
import { readDrawnMenu, drawnMenuLines, isDrawnMenuShown, chooseEntry, OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { isCarouselOpen, CAROUSEL_OPEN_MS } from "../core/startup_picker_scenario.js";
import { PACK_VERSION } from "../../common/core/pack_version.js";
import { requestedVersionOf } from "./update_failed_scenario.js";
import { startAfterUpdate } from "./update_result_success_scenario.js";

test("a Pack Update that worked says so once, before the Profile picker", async () => {
    const { fake, lang, settle } = await startAfterUpdate({ previousVersion: "0.0.1", releaseHighlights: { "0.0.1": ["Already there."] } });

    assert.deepEqual([readDrawnMenu(fake).title, readDrawnMenu(fake).message], ["Update complete", `eXpansion Pack updated to v${PACK_VERSION}`]);
    assert.deepEqual(drawnMenuLines(fake), ["OK"]);
    assert.equal(isCarouselOpen(fake, lang), false, "the message comes before the picker");
    assert.equal(requestedVersionOf(fake), undefined, "said once");
    assert.deepEqual(readLoader(fake), { shown: false }, "no Loader turning under the message");
    assert.equal(startupVeil(fake).shown, true, "the wheel stays dimmed for the picker that follows");

    chooseEntry(fake, "OK");
    assert.equal(isDrawnMenuShown(fake), false);
    await settle();
    fake.advanceTime(CAROUSEL_OPEN_MS + OPEN_OVER_MS);
    assert.equal(isCarouselOpen(fake, lang), true, "the picker opens once the message closed");
    assertNoErrorLogged(fake);
});

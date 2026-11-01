// ============================================================
// The success dialog of a Pack Update in French: its title, its line and
// the Release Highlights below it read in the interface language.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import config from "../../common/core/config.js";

test("the success dialog and its Release Highlights read in French", async () => {
    config.language = "fr";
    const { assertNoErrorLogged } = await import("../support/error_log.js");
    const { readDrawnMenu, drawnMenuLines, chooseEntry } = await import("../drawn_menu/drawn_menu_reader.js");
    const { PACK_VERSION } = await import("../../common/core/pack_version.js");
    const { startAfterUpdate } = await import("./update_result_success_scenario.js");
    const { fake } = await startAfterUpdate({ language: "fr", releaseHighlights: { [PACK_VERSION]: ["Les Défis durent maintenant une semaine."] } });

    assert.deepEqual([readDrawnMenu(fake).title, readDrawnMenu(fake).message], [
        "Mise à jour terminée",
        `eXpansion Pack mis à jour en v${PACK_VERSION}\n\n- Les Défis durent maintenant une semaine.`,
    ]);
    assert.deepEqual(drawnMenuLines(fake), ["OK"]);
    chooseEntry(fake, "OK");
    assertNoErrorLogged(fake);
});

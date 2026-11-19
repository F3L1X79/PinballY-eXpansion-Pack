// ============================================================
// The Achievement List's Exit Button and Button Hints in French, through
// main.js on the fake PinballY globals: the footer's words are French and
// the Exit Button's tooltip says Retour.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("the Achievement List speaks French: the footer's words, and Retour", async () => {
    // Before anything reads the texts: the scenario's imports already do.
    config.language = "fr";
    const { startPack, startOpeningFromMainMenu } = await import("./achievement_list_opening_scenario.js");
    const { untilListShown, footerHints, exitButtonTooltip } = await import("./achievement_list_reader.js");
    const { fake, lang } = await startPack({ language: "fr" });
    startOpeningFromMainMenu(fake, lang);
    untilListShown(fake);

    assert.deepEqual(footerHints(fake), [
        { keys: ["GAUCHE", "DROITE"], label: "PARCOURIR" },
        { keys: ["SELECT"], label: "CHOISIR" },
        { keys: ["EXIT"], label: "RETOUR" },
    ]);
    assert.equal(exitButtonTooltip(fake), "Retour", "on the Exit Button, where the list opens");
    assertNoErrorLogged(fake);
});

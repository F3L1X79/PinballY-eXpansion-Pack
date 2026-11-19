// ============================================================
// The Household Stats' Exit Button and Button Hints in French, through
// main.js on the fake PinballY globals: the tooltip says Retour and the
// footer's words are French.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("the Household Stats speak French: Retour, and the footer's words", async () => {
    // Before anything reads the texts: the scenario's imports already do.
    config.language = "fr";
    const { startHousehold } = await import("./household_stats_scenario.js");
    const { openHouseholdStats, highlightedColumn, buttonHints, press } = await import("./household_stats_reader.js");
    const { fake, lang } = await startHousehold({ profiles: { Alice: {}, Bob: {} }, active: "Alice", language: "fr" });
    openHouseholdStats(fake, lang);

    assert.deepEqual(buttonHints(fake), [
        { keys: ["GAUCHE", "DROITE"], label: "PARCOURIR" },
        { keys: ["SELECT"], label: "CHOISIR" },
        { keys: ["EXIT"], label: "RETOUR" },
    ]);
    press(fake, "Prev");
    assert.equal(highlightedColumn(fake), "Retour");
    assertNoErrorLogged(fake);
});

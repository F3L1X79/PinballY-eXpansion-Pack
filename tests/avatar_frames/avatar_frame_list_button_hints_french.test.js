// ============================================================
// The Avatar Frame list's Exit Button and Button Hints in French, through
// main.js on the fake PinballY globals: the tooltip says Retour and the
// footer's words are French.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import config from "../../common/core/config.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("the Avatar Frame list speaks French: Retour, and the footer's words", async () => {
    // Before anything reads the texts: the scenario's imports already do.
    config.language = "fr";
    const { startScenario, DRAWN_AHEAD_MS } = await import("../mastery/mastery_bar_scenario.js");
    const { openProfileStats, choose, press, untilFrameListShown } = await import("../stats/profile_stats_reader.js");
    const { frameListButtonHints, highlightedChoice } = await import("./avatar_frame_list_reader.js");
    const fake = await startScenario({
        addOns: ["tableMastery", "achievements", "customMenuCommands"], frameImages: true, profiles: { guest: { collectionTier: 3 } }, language: "fr",
    });
    fake.advanceTime(DRAWN_AHEAD_MS);
    const { default: lang } = await import("../../common/core/i18n.js");
    openProfileStats(fake, lang);
    choose(fake, "Cadres d'Avatar");
    untilFrameListShown(fake);

    assert.deepEqual(frameListButtonHints(fake), [
        { keys: ["GAUCHE", "DROITE"], label: "PARCOURIR" },
        { keys: ["SELECT"], label: "CHOISIR" },
        { keys: ["EXIT"], label: "RETOUR" },
    ]);
    press(fake, "Next");
    assert.equal(highlightedChoice(fake), "Retour");
    assertNoErrorLogged(fake);
});

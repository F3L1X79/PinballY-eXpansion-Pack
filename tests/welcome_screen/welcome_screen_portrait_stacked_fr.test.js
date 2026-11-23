// ============================================================
// Three stacked cards in a portrait window, in French: every card text is
// drawn whole, each period on one line, the Week's Streak line included.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { cardTexts, periodAndNameHeights } from "./welcome_screen_reader.js";
import { startWithChallenge } from "./challenge_card_scenario.js";

test("three stacked cards in a French portrait window draw every text whole", async () => {
    const fake = await startWithChallenge({
        challenge: { week: "2026-09-21", template: "tableOfTheDayDays", param: null, target: 3 },
        // The Week's Streak line, the longest grey line in French.
        profile: { streaks: { tableOfTheWeek: { current: 2, longest: 2, lastPeriod: "2026-09-14", periodsPlayed: 2 } } },
        language: "fr",
        layoutSize: { width: 1080, height: 1920 },
    });

    const texts = cardTexts(fake);
    assert.deepEqual(texts.map(card => card[0]), ["TABLE DU JOUR", "TABLE DE LA SEMAINE", "UNE TABLE DU DÉFI"]);
    assert.ok(texts[1].includes("semaines d'affilée sur la table de la semaine !"), "the Week's Streak line whole");
    assert.ok(texts[2].includes("Jouer la table du jour 3 jours différents · 0/3"), "the Challenge's line whole");
    for (const card of texts) assert.ok(card.every(drawn => !drawn.includes("…")), `no text cut on "${card[0]}"`);
    for (const { period, name } of periodAndNameHeights(fake)) assert.equal(period, name, "the period on one line");
    assertNoErrorLogged(fake);
});

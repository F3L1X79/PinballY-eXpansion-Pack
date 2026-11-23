// ============================================================
// The four-card grid in a portrait window, in French: every card text is
// drawn whole, each period on one line, and each cell's logo sits in a
// band above its details, inside the cell.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { cardTexts, periodAndNameHeights, cardLogoPlacements } from "./welcome_screen_reader.js";
import { startWithChallenge, WEEK } from "./challenge_card_scenario.js";

const PORTRAIT = { width: 1080, height: 1920 };

test("the four-card grid in a French portrait window draws every text whole, its logos above the details", async () => {
    const fake = await startWithChallenge({
        challenge: { week: WEEK, template: "tableOfTheDayDays", param: null, target: 3 },
        // Without a table to offer: the "?" card, "Jouer des tables de…" on the screenshot.
        household: { week: WEEK, template: "differentDecades", param: null, target: 3 },
        // The Week's Streak line, the longest grey line in French.
        profile: { streaks: { tableOfTheWeek: { current: 2, longest: 2, lastPeriod: "2026-09-14", periodsPlayed: 2 } } },
        others: ["Bob"],
        addOns: ["startupChoicePrompt", "profilePicker", "challenges", "householdChallenge"],
        language: "fr",
        layoutSize: PORTRAIT,
    });

    const texts = cardTexts(fake);
    assert.deepEqual(texts.map(card => card[0]), ["TABLE DU JOUR", "TABLE DE LA SEMAINE", "UNE TABLE DU DÉFI", "DÉFI DE LA MAISON"]);
    assert.ok(texts[1].includes("semaines d'affilée sur la table de la semaine !"), "the Week's Streak line whole");
    assert.ok(texts[2].includes("Jouer la table du jour 3 jours différents · 0/3"), "the Challenge's line whole");
    assert.ok(texts[3].includes("Jouer des tables de 3 décennies différentes"), "the \"?\" card's title whole");
    assert.ok(texts[3].includes("N'importe quelle table : une partie au hasard"), "the \"?\" card's line whole");
    for (const card of texts) assert.ok(card.every(drawn => !drawn.includes("…")), `no text cut on "${card[0]}"`);
    for (const { period, name } of periodAndNameHeights(fake)) assert.equal(period, name, "the period on one line");

    const placements = cardLogoPlacements(fake, PORTRAIT);
    assert.equal(placements.length, 4);
    for (const { period, card, logo, detailsTop } of placements) {
        assert.ok(logo, `"${period}" has its logo inside its cell`);
        assert.ok(logo.left >= card.left && logo.right <= card.right && logo.top >= card.top, `"${period}"'s logo inside the cell`);
        assert.ok(logo.bottom <= detailsTop, `"${period}"'s logo above its details`);
    }
    assertNoErrorLogged(fake);
});

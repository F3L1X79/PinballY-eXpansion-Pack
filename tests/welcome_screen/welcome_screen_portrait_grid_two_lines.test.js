// ============================================================
// The four-card grid in a portrait window: a name or a grey line too long
// for one line wraps onto a second one instead of ending in "…".
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { cardTexts, periodAndNameHeights } from "./welcome_screen_reader.js";
import { startWithChallenge, WEEK, DAY_TABLE, WEEK_TABLE } from "./challenge_card_scenario.js";

const MAKER = "Chicago Coin Machine Manufacturing Company";
const LONG_TITLE = "Medieval Madness Remake Special Collectors Edition Gold Plated";
const makerTable = (id, title) => ({ ...DAY_TABLE, id, configId: `${title} (${MAKER})`, title, manufacturer: MAKER });

test("in a portrait grid, a long name and a long grey line wrap onto two lines", async () => {
    const fake = await startWithChallenge({
        tables: [{ ...DAY_TABLE, title: LONG_TITLE }, WEEK_TABLE, makerTable(3, "Big Flipper"), makerTable(4, "Gold Ball")],
        challenge: { week: WEEK, template: "manufacturerTables", param: MAKER, target: 3 },
        household: { week: WEEK, template: "differentDecades", param: null, target: 3 },
        others: ["Bob"],
        addOns: ["startupChoicePrompt", "profilePicker", "challenges", "householdChallenge"],
        language: "fr",
        layoutSize: { width: 1080, height: 1920 },
        // Two lines as high as on the cabinet, not two 20-pixel ones.
        pointSizedLines: true,
    });

    const texts = cardTexts(fake);
    assert.equal(texts.length, 4);
    assert.ok(texts[0].includes(LONG_TITLE), "the long name whole");
    assert.ok(texts[2].includes(`Jouer 3 tables ${MAKER} différentes · 0/3`), "the long grey line whole");
    for (const card of texts) assert.ok(card.every(drawn => !drawn.includes("…")), `no text cut on "${card[0]}"`);
    const [day] = periodAndNameHeights(fake);
    assert.ok(day.name > day.period, "the long name on two lines");
    assertNoErrorLogged(fake);
});

// ============================================================
// A further Ratings step on the rating dialog closing, through main.js on
// the fake PinballY globals: Alice's nine Ratings (six for tables gone from
// the game list) give the first two steps at startup; a tenth given in the
// dialog announces Grand Inquisitor, then the Level Toast it brings.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startRatingsScenario, MEDIEVAL, MARS, THEATRE, ADULT_TABLE } from "./ratings_family_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const GONE_TABLES = ["Gone 1", "Gone 2", "Gone 3", "Gone 4", "Gone 5", "Gone 6"];

test("a further step reached in the rating dialog is announced on closing, with its Level Toast", async () => {
    const ratings = { [MEDIEVAL.configId]: 4, [MARS.configId]: 3, [THEATRE.configId]: 5 };
    for (const configId of GONE_TABLES) ratings[configId] = 2;
    const { fake, titles, familyToasts, newToastTexts, rate, closePopup, lang } = await startRatingsScenario({ active: "Alice", ratings: { Alice: ratings } });
    const [firstVerdict, armchairCritic, grandInquisitor] = titles;
    assert.deepEqual(familyToasts(await newToastTexts()), [firstVerdict, armchairCritic]);

    rate(ADULT_TABLE, 1);
    await closePopup();
    const texts = await newToastTexts();
    assert.deepEqual(familyToasts(texts), [grandInquisitor]);
    const levelToast = texts.indexOf(lang.playerLevel.toastDescription);
    assert.ok(levelToast > texts.indexOf(grandInquisitor), "the Level Toast follows the step");
    assertNoErrorLogged(fake);
});

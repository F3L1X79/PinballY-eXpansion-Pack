// ============================================================
// The Ratings family on the rating dialog closing, through main.js on the
// fake PinballY globals: another popup closing checks nothing; the "rate
// game" dialog closing brings First Verdict without a game; closing it
// again without a new step announces nothing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startRatingsScenario, MEDIEVAL, MARS } from "./ratings_family_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("a first Rating brings its toast as soon as the rating dialog closes", async () => {
    const { fake, titles, newToastTexts, rate, closePopup } = await startRatingsScenario();
    const [firstVerdict] = titles;
    // The startup greeting's.
    await newToastTexts();

    rate(MEDIEVAL, 4);
    await closePopup("some other popup");
    assert.deepEqual(await newToastTexts(), [], "another popup closing checks nothing");

    await closePopup();
    assert.ok((await newToastTexts()).includes(firstVerdict));

    rate(MARS, 0);
    await closePopup();
    assert.deepEqual(await newToastTexts(), [], "a second Rating reaches no step");
    assertNoErrorLogged(fake);
});

// ============================================================
// Welcome Screen without a Challenge Table card: a week without a Challenge (no
// feasible template) leaves the cards and the choices unchanged.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { periodCards, readChoices } from "./welcome_screen_reader.js";
import { startWithChallenge, choicesWithoutChallengeCard, WEEK } from "./challenge_card_scenario.js";

test("a week without a Challenge adds no card to the Welcome Screen", async () => {
    const fake = await startWithChallenge({ challenge: { week: WEEK, template: "", param: null, target: 0 } });
    const { default: lang } = await import("../../common/core/i18n.js");

    assert.equal(periodCards(fake).length, 2);
    assert.deepEqual(readChoices(fake), choicesWithoutChallengeCard(lang));
    assertNoErrorLogged(fake);
});

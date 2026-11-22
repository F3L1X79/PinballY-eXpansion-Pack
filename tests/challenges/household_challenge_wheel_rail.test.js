// ============================================================
// Through main.js with the Challenges off: the Household Challenge Card takes
// the Challenge Card's place, and the Wheel Rail sits lower while it shows,
// back at its place in a week without a Household Challenge.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownRail, railBaseLayers, PROFILES_FOLDER, DEFAULT_ADD_ONS } from "../wheel_guides/wheel_guides_scenario.js";
import { HOUSEHOLD_CHALLENGE_CARD_Z_INDEX, CHALLENGE_VERDICT_MS } from "../../common/challenges/challenge_card.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const REFERENCE_HEIGHT = 1920;
// The scenario's clock is on Sunday 15 November 2026, in the week of the 9th.
const WEEK = "2026-11-09";
const NEXT_MONDAY = new Date(2026, 10, 16, 20, 0, 0);

// The rail's centre, in reference px from the window's top.
const railCentre = fake => {
    const [base] = railBaseLayers(fake).filter(layer => layer.alpha > 0);
    return Math.round(REFERENCE_HEIGHT / 2 - base.position().y * REFERENCE_HEIGHT);
};
const houseCard = fake => fake.drawingLayers().find(layer => layer.zIndex === HOUSEHOLD_CHALLENGE_CARD_Z_INDEX);

test("the Wheel Rail sits lower while the Household Challenge Card shows, and back at its place without one", async () => {
    // No Play Log: next week has no Household Challenge.
    const { fake, lang } = await startWheelGuides({
        addOns: [...DEFAULT_ADD_ONS, "householdChallenge"],
        profiles: { Alice: {} },
        active: "Alice",
        // Always shown: it never slides away while the verdict passes.
        settings: { wheelRailSeconds: 0 },
        cabinet: { householdChallenge: { current: { week: WEEK, template: "differentTables", param: null, target: 4, games: [] }, previous: null } },
    });

    assert.ok(houseCard(fake).alpha > 0);
    assert.ok(houseCard(fake).texts().includes(lang.challenges.titles.differentTables(4)));
    assert.deepEqual(houseCard(fake).position(), { x: 0, y: 0, align: "top right" }, "the Challenge Card's place, no badge above");
    assert.ok(shownRail(fake));
    assert.equal(railCentre(fake), 1025);

    fake.setNow(NEXT_MONDAY);
    fake.fire("wheelmode");
    assert.equal(JSON.parse(fake.readFile(`${PROFILES_FOLDER}\\cabinet.json`)).householdChallenge.current.template, "");
    assert.ok(houseCard(fake).texts().includes(lang.householdChallenge.verdictHeader.toLocaleUpperCase()), "last week's verdict first");
    fake.advanceTime(CHALLENGE_VERDICT_MS);
    assert.equal(houseCard(fake).alpha, 0);
    assert.equal(railCentre(fake), 960);
    assertNoErrorLogged(fake);
});

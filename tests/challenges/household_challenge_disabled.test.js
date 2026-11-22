// ============================================================
// Through main.js with the Household Challenge off: nothing drawn, nothing
// written to cabinet.json, no card nor wheel selection, and the Wheel Rail
// stays at its place, even with enough Play Log for one.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, railBaseLayers, PROFILES_FOLDER, TABLES, DEFAULT_ADD_ONS } from "../wheel_guides/wheel_guides_scenario.js";
import { HOUSEHOLD_CHALLENGE_CARD_Z_INDEX } from "../../common/challenges/challenge_card.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const REFERENCE_HEIGHT = 1920;
const CABINET_FILE = `${PROFILES_FOLDER}\\cabinet.json`;

const railCentre = fake => {
    const [base] = railBaseLayers(fake).filter(layer => layer.alpha > 0);
    return Math.round(REFERENCE_HEIGHT / 2 - base.position().y * REFERENCE_HEIGHT);
};

test("with the Household Challenge off, nothing is drawn nor written, and the Wheel Rail stays at its place", async () => {
    const { fake } = await startWheelGuides({
        addOns: [...DEFAULT_ADD_ONS, "challenges"],
        profiles: { Alice: {} },
        active: "Alice",
        files: {
            [`${PROFILES_FOLDER}\\Alice\\play-log-2026.json`]: JSON.stringify({
                version: 1, plays: [{ start: "2026-09-07T20:00:00", configId: TABLES[0].configId, seconds: 120 }],
            }),
        },
    });

    fake.playGame(TABLES[0]);
    fake.gameStarted(TABLES[0]);
    fake.advanceTime(2 * 60 * 1000);
    fake.gameOver(TABLES[0]);

    assert.equal(JSON.parse(fake.readFile(CABINET_FILE)).householdChallenge, undefined);
    assert.equal(fake.drawingLayers().filter(layer => layer.zIndex === HOUSEHOLD_CHALLENGE_CARD_Z_INDEX).length, 0);
    assert.equal(railCentre(fake), 960);
    assert.equal(fake.scriptFilters().filter(({ id }) => id === "project.HouseholdChallengeTables").length, 0, "no wheel selection");
    assertNoErrorLogged(fake);
});

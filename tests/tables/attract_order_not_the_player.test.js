// ============================================================
// The Attract Order's moves through main.js never count as the player's: the
// Maneki-neko, drawn at the player's 5th wheel move, and World Tour, which
// every table seen completes, both ignore a whole attract mode of pack moves.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startManekiScenario, moveWheelTimes, catLayers, shownCat, OUT_MS } from "../easter_eggs/maneki_neko_scenario.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import config from "../../common/core/config.js";

const CABINET_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\cabinet.json";
const SWITCH_TIME_KEY = "AttractMode.SwitchTime";
const KEPT_SECONDS = 10;
const STEP_MS = KEPT_SECONDS * 1000;

test("a whole attract mode of In Order moves counts neither for the Maneki-neko nor for World Tour", async () => {
    config.attractOrder = "inOrder";
    const { fake, lang } = await startManekiScenario({
        random: () => 0.02,
        addOns: ["achievements", "sessionStatsTracker", "wheelOrder"],
        seed: fake => {
            fake.seedSettings({ [SWITCH_TIME_KEY]: 86400 });
            fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: "guest", attractOrderSwitchTime: KEPT_SECONDS }));
        },
    });
    const worldTourToasts = () => toastDrawings(fake).filter(drawing => drawing.texts.includes(lang.achievements.worldTourTitle()));

    fake.enterAttractMode();
    await settle();
    // Twice round the three tables.
    fake.advanceTime(6 * STEP_MS);
    assert.equal(fake.wheelMoves().length, 6, "the pack moved the wheel");
    fake.exitAttractMode();
    await settle();
    fake.advanceTime(OUT_MS + 16);
    assert.deepEqual(catLayers(fake), [], "the pack's moves are not the player's");
    assert.equal(worldTourToasts().length, 0, "every table seen by attract mode completes no World Tour");

    moveWheelTimes(fake, 4);
    fake.advanceTime(OUT_MS + 16);
    assert.deepEqual(catLayers(fake), [], "not at the player's 4th move");
    moveWheelTimes(fake, 1);
    fake.advanceTime(OUT_MS + 16);
    assert.ok(shownCat(fake), "the player's 5th move");
    assertNoErrorLogged(fake);
});

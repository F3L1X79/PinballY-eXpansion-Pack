// ============================================================
// A launch during the Crow's flight removes it at once and gives the table
// its sound back; its Achievement's toast waits for the end of that game.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import { WELCOME_SCREEN_OPEN_MS, press } from "../welcome_screen/welcome_screen_reader.js";
import { startCrowScenario, birds, crowLayers, TABLE } from "./crow_scenario.js";

const MID_FLIGHT_MS = 3000;
const TOAST_SHOWN_MS = 500;

test("a launch removes the Crow at once, and its toast comes after the game", async () => {
    const { fake, lang } = await startCrowScenario();
    const hasToast = () => toastDrawings(fake).some(drawing => drawing.texts.includes(lang.achievements.corvusExMachinaTitle()));
    fake.advanceTime(WELCOME_SCREEN_OPEN_MS);
    press(fake, "Exit");
    await settle();
    fake.advanceTime(MID_FLIGHT_MS);
    assert.equal(birds(fake).length, 1);

    fake.playGame(fake.getGameInfo(TABLE.configId));
    assert.deepEqual(crowLayers(fake), [], "gone at once");
    assert.equal(fake.gameUpdates().at(-1).changes.audioVolume, 100, "the table's sound is back");
    await settle();
    assert.equal(hasToast(), false, "no toast under the game");

    fake.gameStarted(fake.getGameInfo(TABLE.configId));
    fake.gameOver(fake.getGameInfo(TABLE.configId));
    await settle();
    fake.advanceTime(TOAST_SHOWN_MS);
    assert.equal(hasToast(), true, "back on the wheel");
    assertNoErrorLogged(fake);
});

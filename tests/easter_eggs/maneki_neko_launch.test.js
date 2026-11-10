// ============================================================
// A launch while the Maneki-neko is out removes it at once; its Achievement's
// toast waits for the end of that game.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import { startManekiScenario, moveWheelTimes, catLayers, shownCat, TABLES } from "./maneki_neko_scenario.js";

const TOAST_SHOWN_MS = 500;

test("a launch removes the cat at once, and its toast comes after the game", async () => {
    const { fake, lang } = await startManekiScenario();
    const hasToast = () => toastDrawings(fake).some(drawing => drawing.texts.includes(lang.achievements.nekomancerTitle()));
    const table = fake.getGameInfo(TABLES[0].configId);
    moveWheelTimes(fake, 13);
    fake.advanceTime(500);
    assert.ok(shownCat(fake));

    fake.playGame(table);
    assert.deepEqual(catLayers(fake), [], "gone at once");
    await settle();
    assert.equal(hasToast(), false, "no toast under the game");

    fake.gameStarted(table);
    fake.gameOver(table);
    await settle();
    fake.advanceTime(TOAST_SHOWN_MS);
    assert.equal(hasToast(), true, "back on the wheel");
    assertNoErrorLogged(fake);
});

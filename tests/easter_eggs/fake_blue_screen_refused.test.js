// ============================================================
// The Fake Blue Screen follows only a table that really ran: never a
// capture, a failed launch, Exit Game before the table loaded, nor a return
// with a toast on the way. A table left by Exit Game while it runs counts.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { getAchievementToasts } from "../../common/achievements/achievement_toast.js";
import { startBlueScreenScenario, playTable, screenLayers, isScreenShown, SILENCE_LEAD_MS, SCREEN_MS } from "./fake_blue_screen_scenario.js";

test("only a table that ran, with nothing on the way, brings the Fake Blue Screen", async () => {
    const { fake, table } = await startBlueScreenScenario();
    const assertNothing = async (why) => {
        await settle();
        fake.advanceTime(SILENCE_LEAD_MS + 100);
        assert.deepEqual(screenLayers(fake), [], why);
        fake.advanceTime(SCREEN_MS);
        await settle();
    };

    globalThis.mainWindow.playGame(table, { command: fake.getBuiltInCommand("CaptureGo") });
    fake.gameStarted(table);
    fake.gameOver(table);
    await assertNothing("never after a capture");

    fake.playGame(table);
    fake.launchError(table);
    await assertNothing("never after a failed launch");

    fake.playGame(table);
    fake.runCommand(fake.getBuiltInCommand("KillGame"));
    fake.gameOver(table);
    await assertNothing("never after Exit Game before the table loaded");

    fake.playGame(table);
    fake.gameStarted(table);
    fake.gameOver(table);
    getAchievementToasts().submit({ title: "A toast on the way", description: "", onShown() {} });
    await assertNothing("never over a toast");
    // That return is spent: the toast gone, nothing comes later.
    fake.advanceTime(30000);
    await settle();
    assert.deepEqual(screenLayers(fake), [], "drawn once per return");

    await playTable(fake, table, { exitGame: true });
    fake.advanceTime(SILENCE_LEAD_MS);
    assert.ok(isScreenShown(fake), "Exit Game while the table runs counts");
    assertNoErrorLogged(fake);
});

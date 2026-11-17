// ============================================================
// Conflict Notice through main.js on the fake host: reported while Alice, an
// Admin Profile, plays, then dropped as stale when Bob, not an Admin Profile,
// is active back on the wheel; switching to Alice again submits it again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { OPEN_OVER_MS } from "../drawn_menu/drawn_menu_reader.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { startOnWheelWithLaunchScript, shownDialog, NOTICE_TITLE } from "./conflict_notice_scenario.js";

test("a Conflict Notice waiting for the wheel is dropped when the active Profile stops being eligible, and comes back for an Admin Profile", async () => {
    const { fake, store, settle } = await startOnWheelWithLaunchScript({ adminProfiles: ["Alice"], activeProfile: "Alice" });
    const game = fake.getAllTables()[0];
    fake.playGame(game);
    fake.gameStarted(game);
    store.switchTo("Bob");
    fake.gameOver(game);
    await settle();
    fake.advanceTime(OPEN_OVER_MS);
    assert.equal(shownDialog(fake), null, "Bob doesn't see it");

    store.switchTo("Alice");
    await settle();
    fake.advanceTime(OPEN_OVER_MS);

    assert.equal(shownDialog(fake).title, NOTICE_TITLE);
    assertNoErrorLogged(fake);
});

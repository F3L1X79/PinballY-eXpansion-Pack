// ============================================================
// A History Import into the active Profile stays silent, through main.js on
// the fake PinballY globals: what it reaches is Notified without a toast and
// its Collection Tier kept; the next Play announces only what it reaches.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import {
    startWithHistory, importHistoryInto, waitForToasts, allToasts, collectionToasts, savedCollectionTier, rewardPrompts, play,
    TABLES, MINUTE, PLAY_OWN_TOASTS,
} from "./history_import_silence_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("an import into the active Profile announces nothing, and its next Play only what the Play reaches", async () => {
    const { fake, lang, store } = await startWithHistory();
    assert.deepEqual(allToasts(fake), []);

    importHistoryInto(fake, lang, "Alice");
    await waitForToasts(fake);
    assert.deepEqual(allToasts(fake), [], "no toast for the import");
    assert.equal(savedCollectionTier(fake, "Alice"), 4, "the tier its totals reach is kept");
    const notified = store.getNotifiedOf("Alice");
    assert.ok(notified.includes("playTimeMilestone:5h"), "what it reached is Notified");
    assert.equal(store.isUnannouncedCheckDue("Alice"), false, "then the checks go back to normal");

    await play(fake, TABLES[0], 30 * MINUTE);
    await waitForToasts(fake);
    assert.deepEqual(collectionToasts(fake), [], "no Collection Tier toast for the import's jump");
    assert.deepEqual(rewardPrompts(fake), [], "nor a Reward Prompt for its frames");
    assert.deepEqual(allToasts(fake), PLAY_OWN_TOASTS);
    assertNoErrorLogged(fake);
});

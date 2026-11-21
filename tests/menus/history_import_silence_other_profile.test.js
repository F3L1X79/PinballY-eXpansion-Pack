// ============================================================
// A History Import into another Profile stays silent, through main.js on
// the fake PinballY globals: nothing is announced when the Admin Profile
// runs it, nor when the receiving Profile is picked later; that Profile's
// next Play announces only what it reaches.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import {
    startWithHistory, importHistoryInto, waitForToasts, allToasts, collectionToasts, savedCollectionTier, rewardPrompts, play,
    TABLES, MINUTE, PLAY_OWN_TOASTS,
} from "./history_import_silence_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("an import into another Profile announces nothing when it is picked, and its next Play only what the Play reaches", async () => {
    const { fake, lang, store } = await startWithHistory();

    importHistoryInto(fake, lang, "Bob");
    await waitForToasts(fake);
    assert.deepEqual(allToasts(fake), [], "no toast while Alice is active");
    assert.equal(savedCollectionTier(fake, "Bob"), 4, "the tier its totals reach is kept");
    assert.equal(store.isUnannouncedCheckDue("Bob"), true, "its check waits for Bob");

    store.switchTo("Bob");
    await waitForToasts(fake);
    assert.deepEqual(allToasts(fake), [], "no toast when Bob is picked");
    assert.ok(store.getNotifiedOf("Bob").includes("playTimeMilestone:5h"), "what it reached is Notified");
    assert.equal(store.isUnannouncedCheckDue("Bob"), false, "then the checks go back to normal");
    const promptsAtSwitch = rewardPrompts(fake).length;

    await play(fake, TABLES[0], 30 * MINUTE);
    await waitForToasts(fake);
    assert.deepEqual(collectionToasts(fake), [], "no Collection Tier toast for the import's jump");
    assert.equal(rewardPrompts(fake).length, promptsAtSwitch, "nor a Reward Prompt for its frames");
    assert.deepEqual(allToasts(fake), PLAY_OWN_TOASTS);
    assertNoErrorLogged(fake);
});

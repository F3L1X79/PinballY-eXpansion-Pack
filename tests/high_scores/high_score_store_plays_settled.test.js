// ============================================================
// The High Score store's whenPlaysSettled(), on the fake PinballY host: the
// callback runs at once with no Play being settled, otherwise once the last
// held board is released, a single time, whatever the release order.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createHighScoreStore } from "../../common/high_scores/high_score_store.js";

function setUp() {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 10, 20, 0, 0), tables: [] });
    fake.installGlobals();
    return createHighScoreStore(fake, createProfileStore(fake));
}

test("with no Play being settled, the callback runs at once", () => {
    const store = setUp();
    let calls = 0;
    store.whenPlaysSettled(() => { calls++; });
    assert.equal(calls, 1);
});

test("while Plays are settled, the callback waits for the last release, and runs once", () => {
    const store = setUp();
    const releaseMm = store.holdBoardForPlay("mm");
    const releaseAfm = store.holdBoardForPlay("afm");
    let calls = 0;
    store.whenPlaysSettled(() => { calls++; });
    assert.equal(calls, 0, "waiting for the read after the game");
    releaseAfm();
    assert.equal(calls, 0, "another table is still being settled");
    releaseMm();
    assert.equal(calls, 1, "every Play settled");
    releaseMm();
    store.holdBoardForPlay("mm")();
    assert.equal(calls, 1, "never twice");
});

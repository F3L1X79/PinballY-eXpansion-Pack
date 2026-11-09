// ============================================================
// A game of an Untracked Table is no Play at the Profile store's seam: its
// totals and Play Log stay untouched and no Play is announced.
// ============================================================

import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { setUntrackedTables } from "../../common/core/untracked_tables.js";

const MEDIEVAL = { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness" };
const PLAYER = { id: 2, configId: "Media Player", title: "Media Player" };
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

function start() {
    const fake = createFakePinballYHost({ now: new Date(2026, 9, 1, 21, 0, 0), tables: [MEDIEVAL, PLAYER] });
    const store = createProfileStore(fake);
    const announced = [];
    store.onPlay(play => announced.push(play.configId));
    return { fake, store, announced };
}

function play(fake, game, ms) {
    fake.gameStarted(game);
    fake.advanceTime(ms);
    fake.gameOver(game);
}

afterEach(() => setUntrackedTables(""));

test("a game of an Untracked Table, however long, records and announces nothing", () => {
    const { fake, store, announced } = start();
    setUntrackedTables("Media Player");

    play(fake, PLAYER, FOUR_HOURS_MS);

    assert.deepEqual(store.getProfileData().plays, {});
    assert.deepEqual(store.getPlayLogOf("guest", 2026), []);
    assert.deepEqual(announced, []);
});

test("another table's game is still a Play while a table is listed", () => {
    const { fake, store, announced } = start();
    setUntrackedTables("Media Player");

    play(fake, MEDIEVAL, FOUR_HOURS_MS);

    assert.equal(store.getPlay(MEDIEVAL.configId).count, 1);
    assert.deepEqual(announced, [MEDIEVAL.configId]);
});

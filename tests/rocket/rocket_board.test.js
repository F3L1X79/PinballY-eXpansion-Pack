// ============================================================
// The Rocket Game's scores on the Profile store: a score tying the
// Profile's own fifth best is not saved, the first one keeping its place.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createRocketBoard } from "../../common/rocket/rocket_board.js";

const GUEST_FILE = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\guest\\profile.json";

test("a score tying the Profile's fifth best is not saved", () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 9, 20, 0, 0) });
    const rocketScores = [500, 400, 300, 200, 100].map((score, index) => ({ score, date: `2026-11-0${index + 1}T10:00:00` }));
    fake.addFile(GUEST_FILE, JSON.stringify({ version: 1, rocketScores }));
    fake.installGlobals();
    const board = createRocketBoard(fake, { profileStore: createProfileStore(fake) });
    const before = fake.readFile(GUEST_FILE);

    assert.equal(board.record(100), null);
    assert.equal(fake.readFile(GUEST_FILE), before);
    assert.deepEqual(board.record(101), { profileName: "guest", score: 101, date: "2026-11-09T20:00:00" });
    assert.deepEqual(JSON.parse(fake.readFile(GUEST_FILE)).rocketScores.map(saved => saved.score), [500, 400, 300, 200, 101]);
});

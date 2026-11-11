// ============================================================
// Pinning test of the Rocket Game's scores: the "rocketScores" key of a
// Profile's profile.json and the shape of its entries. These are players'
// saved scores: this test must keep passing unchanged. In a file of its
// own: it installs the fake PinballY globals.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createRocketBoard } from "../../common/rocket/rocket_board.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";

test("the Rocket Game keeps its scores under rocketScores, as { score, date }, written on the first recorded game", () => {
    const fake = createFakePinballYHost({ now: new Date(2026, 10, 9, 20, 0, 0) });
    fake.installGlobals();
    const profileStore = createProfileStore(fake);
    const board = createRocketBoard(fake, { profileStore });
    const saved = () => JSON.parse(fake.readFile(`${PROFILES}\\guest\\profile.json`));
    profileStore.updateProfileData(() => {});
    assert.equal("rocketScores" in saved(), false, "not in the empty Profile data");

    board.record(120);
    assert.deepEqual(saved().rocketScores, [{ score: 120, date: "2026-11-09T20:00:00" }]);
});

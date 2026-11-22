// ============================================================
// The Household frame at the Profile Rewards seam, on the fake host's file
// system: unlocked from 15 credited Household Challenges, listed last, and
// absent with the Household Challenge off. Never loaded by PinballY.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createProfileRewards } from "../../common/avatar_frames/profile_rewards.js";

const GUEST = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles\\guest";

function rewardsWith(creditedCount, { withHousehold = true } = {}) {
    const fake = createFakePinballYHost({ now: new Date(2026, 8, 21, 20, 0, 0), tables: [] });
    fake.addFile(`${GUEST}\\profile.json`, JSON.stringify({ version: 1, plays: {}, notified: [], householdChallenge: { creditedCount } }));
    return createProfileRewards(fake, { profileStore: createProfileStore(fake), withHousehold: () => withHousehold });
}

test("the Household frame is the last frame listed, unlocked from 15 credited Household Challenges", () => {
    const at14 = rewardsWith(14).framesOf();
    assert.deepEqual(at14.slice(-1).map(frame => [frame.id, frame.family, frame.isUnlocked, frame.name]), [["household", "household", false, "Household"]]);
    assert.equal(at14.slice(-1)[0].unlockCondition, "15 Household Challenges won together");
    assert.equal(rewardsWith(15).framesOf().slice(-1)[0].isUnlocked, true);
    assert.equal(rewardsWith(30).framesOf().slice(-1)[0].isUnlocked, true);
});

test("with the Household Challenge off, there is no Household frame, and it cannot be worn", () => {
    const rewards = rewardsWith(15, { withHousehold: false });
    assert.deepEqual(rewards.framesOf().filter(frame => frame.id === "household"), []);
    assert.equal(rewards.choose("household"), false);
});

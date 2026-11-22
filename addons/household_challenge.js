// ============================================================
// Household Challenge: wires the shared Household Challenge module to the
// Household Challenge Card, a Wheel Mark (common/core/wheel_marks.js) under the
// Challenge Card in the top right stack, to the Household Challenge Tables
// main menu entry, and its credits to the Profile Rewards, which toast the
// Household frame. The card's first show draws the week's Household Challenge.
// ============================================================

import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getHouseholdChallenge } from "../common/challenges/household_challenge.js";
import { createHouseholdChallengeCard } from "../common/challenges/challenge_card.js";
import { createHouseholdChallengeTables } from "../common/challenges/challenge_tables.js";
import { getMainMenu } from "../common/menus/main_menu.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getWheelMarks } from "../common/core/wheel_marks.js";
import { getProfileRewards } from "../common/avatar_frames/profile_rewards.js";
import { safeHandler } from "../common/core/safe_handler.js";

const SCRIPT_NAME = "HouseholdChallenge";

export default function init() {
    const host = createPinballYHost();
    const householdChallenge = getHouseholdChallenge();
    // Asked on each show, never before the registration below.
    const card = createHouseholdChallengeCard(host, householdChallenge, { topOf: () => mark.top() });
    const mark = getWheelMarks().register(SCRIPT_NAME, card);
    createHouseholdChallengeTables(host, householdChallenge, getProfileStore(), getMainMenu());
    // Fires when a Household Challenge Toast starts and credits its Profile.
    const profileRewards = getProfileRewards();
    householdChallenge.onCredited(safeHandler(SCRIPT_NAME, (profileName, count) => profileRewards.householdCredited(profileName, count)));
}

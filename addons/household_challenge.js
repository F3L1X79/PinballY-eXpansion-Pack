// ============================================================
// Household Challenge: wires the shared Household Challenge module to the
// Household Challenge Card, a Wheel Mark (common/core/wheel_marks.js) under the
// Challenge Card in the top right stack. The card's first show draws the
// week's Household Challenge at startup if needed.
// - Never creates the Challenge module with the Challenges off: it would follow their games.
// ============================================================

import config from "../common/core/config.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getChallenges } from "../common/challenges/challenge.js";
import { getHouseholdChallenge } from "../common/challenges/household_challenge.js";
import { createHouseholdChallengeCard } from "../common/challenges/challenge_card.js";
import { getWheelMarks } from "../common/core/wheel_marks.js";

const SCRIPT_NAME = "HouseholdChallenge";

export default function init() {
    const host = createPinballYHost();
    const householdChallenge = getHouseholdChallenge({ challenges: config.addOns.challenges !== false ? getChallenges() : null });
    // Asked on each show, never before the registration below.
    const card = createHouseholdChallengeCard(host, householdChallenge, { topOf: () => mark.top() });
    const mark = getWheelMarks().register(SCRIPT_NAME, card);
}

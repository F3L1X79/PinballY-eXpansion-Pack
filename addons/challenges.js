// ============================================================
// Challenges: wires the shared Challenge module to the Challenge Card, a Wheel
// Mark (common/core/wheel_marks.js) in the top right stack, and to the
// Challenge Tables main menu entry. The card's first show draws
// the week's Challenge at startup if needed.
// - The Challenge Tables entry shows only while the Challenge has Challenge Tables.
// ============================================================

import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getChallenges } from "../common/challenges/challenge.js";
import { createChallengeCard } from "../common/challenges/challenge_card.js";
import { createChallengeTables } from "../common/challenges/challenge_tables.js";
import { getMainMenu } from "../common/menus/main_menu.js";
import { getWheelMarks } from "../common/core/wheel_marks.js";

const SCRIPT_NAME = "Challenges";

export default function init() {
    const host = createPinballYHost();
    // Asked on each show, never before the registration below.
    const card = createChallengeCard(host, getChallenges(), { topOf: () => mark.top() });
    const mark = getWheelMarks().register(SCRIPT_NAME, card);
    createChallengeTables(host, getChallenges(), getMainMenu());
}

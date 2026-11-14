// ============================================================
// Challenges: wires the shared Challenge module to the Challenge Card and to
// the Challenge Tables main menu entry. Draws the week's Challenge at
// startup if needed; the card follows Profile switches, hides on
// "gamestarted" and comes back on "wheelmode".
// - The Challenge Tables entry shows only while the Challenge has Challenge Tables.
// ============================================================

import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getChallenges } from "../common/challenges/challenge.js";
import { createChallengeCard } from "../common/challenges/challenge_card.js";
import { createChallengeTables } from "../common/challenges/challenge_tables.js";
import { getMainMenu } from "../common/menus/main_menu.js";
import { compareInWheelOrder } from "../common/tables/wheel_order.js";
import config from "../common/core/config.js";

export default function init() {
    const host = createPinballYHost();
    const underBadge = config.addOns.profilePicker !== false;
    createChallengeCard(host, getChallenges(), getProfileStore(), { underBadge });
    createChallengeTables(host, getChallenges(), getMainMenu(), { compareForSort: compareInWheelOrder });
}

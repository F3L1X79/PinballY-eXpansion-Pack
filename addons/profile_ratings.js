// ============================================================
// Profile Ratings: each Profile keeps its own Ratings and Favorite Tables
// (see common/profiles/profile_ratings.js and docs/adr/0024).
// ============================================================

import { createPinballYHost } from "../common/core/pinbally_host.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { createProfileRatings } from "../common/profiles/profile_ratings.js";

export default function init() {
    createProfileRatings(createPinballYHost(), { profileStore: getProfileStore() }).start();
}

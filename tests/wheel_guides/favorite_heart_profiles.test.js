// ============================================================
// The Favorite Heart through main.js with Ratings per Profile on: it shows
// the active Profile's Favorite Tables, Guest's own for Guest, and follows
// Change Player to the new Profile's.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownHeart, DEFAULT_ADD_ONS, PROFILES_FOLDER } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const ratings = favorites => JSON.stringify({ version: 1, ratings: {}, favorites });

test("the Favorite Heart shows the active Profile's Favorite Tables, Guest's included", async () => {
    // PinballY's columns hold Mom's: Addams Family, Cyclone and Eight Ball.
    const { fake, switchTo } = await startWheelGuides({
        addOns: [...DEFAULT_ADD_ONS, "profileRatings"], profiles: { Mom: {} }, active: "Mom",
        files: {
            [`${PROFILES_FOLDER}\\Mom\\ratings.json`]: ratings(["Addams Family", "Cyclone", "Eight Ball"]),
            [`${PROFILES_FOLDER}\\guest\\ratings.json`]: ratings(["Black Knight"]),
            [`${PROFILES_FOLDER}\\profile_ratings.json`]: JSON.stringify({ version: 1, columnsProfile: "Mom" }),
        },
    });
    assert.equal(shownHeart(fake), "red", "Addams Family, Mom's");

    switchTo("guest");
    await settle();
    assert.equal(shownHeart(fake), "grey", "Addams Family is not Guest's");
    fake.moveWheel(1);
    assert.equal(shownHeart(fake), "red", "Black Knight is Guest's");

    switchTo("Mom");
    await settle();
    assert.equal(shownHeart(fake), "grey", "Black Knight is not Mom's");
    assertNoErrorLogged(fake);
});

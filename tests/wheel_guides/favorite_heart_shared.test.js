// ============================================================
// The Favorite Heart through main.js with Ratings per Profile off: it shows
// PinballY's own Favorite Tables, shared by the cabinet, whoever plays.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownHeart } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("with Ratings per Profile off, the Favorite Heart shows PinballY's favourites", async () => {
    const { fake, switchTo } = await startWheelGuides({ profiles: { Mom: {} }, active: "Mom" });
    assert.equal(shownHeart(fake), "red", "Addams Family, a favourite of PinballY's");

    switchTo("guest");
    await settle();
    assert.equal(shownHeart(fake), "red", "the same favourites for Guest");
    fake.moveWheel(1);
    assert.equal(shownHeart(fake), "grey");
    assertNoErrorLogged(fake);
});

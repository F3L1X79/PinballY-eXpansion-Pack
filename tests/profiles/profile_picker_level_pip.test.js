// ============================================================
// Level pips on the Profile picker's carousel, through main.js on the fake
// PinballY globals: each Avatar shows its Profile's Player Level, the
// active Profile's and the others' alike.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, errorLines, ALL_TOASTS_MS } from "../mastery/mastery_bar_scenario.js";
import { shownPip } from "../levels/level_pip_reader.js";
import { shownLayers } from "../support/shown_layers.js";

const PIP_Z = 6503;

async function openCarousel(fake) {
    const { default: lang } = await import("../../common/core/i18n.js");
    fake.openMenu("main", [{ title: "Play", cmd: fake.getBuiltInCommand("PlayGame") }]);
    fake.selectMenuItem(lang.profiles.menuEntry);
}

const carouselPips = fake => shownLayers(fake, PIP_Z)
    .map(shownPip)
    .sort();

test("each Avatar of the carousel shows its Profile's level", async () => {
    // A Platinum Challenge Achievement: 100 points, level 2.
    const fake = await startScenario({
        addOns: ["achievements", "challenges", "profilePicker"],
        profiles: { guest: {}, Alice: { notified: ["challengesCompleted:100"] } },
    });
    fake.advanceTime(ALL_TOASTS_MS);
    await openCarousel(fake);
    assert.deepEqual(carouselPips(fake), ["1", "2"], "Guest's 1, Alice's 2 though not active, none on the + beside them");

    assert.deepEqual(errorLines(fake), []);
});

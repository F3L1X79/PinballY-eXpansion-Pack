// ============================================================
// No Avatar Frame shown with the Table Mastery Add-on off, through main.js
// on the fake PinballY globals: a worn frame left in profile.json shows
// neither on the Profile badge nor in the Profile picker's carousel.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, errorLines, DRAWN_AHEAD_MS } from "../mastery/mastery_bar_scenario.js";
import { shownFrame } from "./avatar_frame_reader.js";

const BADGE_Z = 4500;
const AVATAR_Z = 6501;

test("no frame on the badge nor in the carousel with Table Mastery off", async () => {
    const fake = await startScenario({
        addOns: ["achievements", "profilePicker"], frameImages: true, profiles: { guest: { collectionTier: 3, avatarFrame: 3 } },
    });
    fake.advanceTime(DRAWN_AHEAD_MS);
    assert.equal(shownFrame(fake.drawingLayers().find(layer => layer.zIndex === BADGE_Z)), null);

    const { default: lang } = await import("../../common/core/i18n.js");
    fake.openMenu("main", [{ title: "Play", cmd: fake.getBuiltInCommand("PlayGame") }]);
    fake.selectMenuItem(lang.profiles.menuEntry);
    const avatars = fake.drawingLayers().filter(layer => layer.zIndex === AVATAR_Z && layer.alpha > 0);
    assert.equal(avatars.length, 2, "Guest and the +");
    assert.deepEqual(avatars.map(shownFrame), [null, null]);
    assert.deepEqual(errorLines(fake), []);
});

// ============================================================
// Avatar Frame images missing from the install, through main.js on the
// fake PinballY globals: each missing image is logged once, and the
// Profile badge and the Profile picker's carousel show the plain Avatar.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, errorLines, DRAWN_AHEAD_MS, AVATAR_FRAMES_FOLDER } from "../mastery/mastery_bar_scenario.js";
import { shownFrame } from "./avatar_frame_reader.js";

const BADGE_Z = 4500;
const AVATAR_Z = 6501;

test("a missing frame image is logged once and the Avatar shows plain", async () => {
    const fake = await startScenario({
        addOns: ["tableMastery", "achievements", "profilePicker"], profiles: { guest: { collectionTier: 1, avatarFrame: 1 } },
    });
    fake.advanceTime(DRAWN_AHEAD_MS);
    const badge = fake.drawingLayers().find(layer => layer.zIndex === BADGE_Z);
    assert.equal(shownFrame(badge), null);
    assert.ok(badge.images().some(path => path.endsWith("default_avatar.png")), "the Avatar still shows");

    const { default: lang } = await import("../../common/core/i18n.js");
    for (let opening = 0; opening < 2; opening++) {
        fake.openMenu("main", [{ title: "Play", cmd: fake.getBuiltInCommand("PlayGame") }]);
        fake.selectMenuItem(lang.profiles.menuEntry);
        const avatars = fake.drawingLayers().filter(layer => layer.zIndex === AVATAR_Z && layer.alpha > 0);
        assert.equal(avatars.length, 2, "Guest and the +");
        assert.deepEqual(avatars.map(shownFrame), [null, null]);
        assert.ok(avatars.some(avatar => avatar.images().some(path => path.endsWith("default_avatar.png"))));
        fake.fire("commandbuttondown", { command: "Exit", repeat: false });
        fake.advanceTime(DRAWN_AHEAD_MS);
    }

    for (const size of ["192", "384"]) {
        const missing = `${AVATAR_FRAMES_FOLDER}\\frame_01_${size}.png`;
        assert.equal(fake.logLines().filter(line => line.includes("not found") && line.includes(missing)).length, 1, `${size} px logged once`);
    }
    assert.deepEqual(errorLines(fake), []);
});

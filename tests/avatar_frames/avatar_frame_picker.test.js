// ============================================================
// The worn Avatar Frames in the Profile picker's carousel, through main.js
// on the fake PinballY globals: each Avatar wears its own Profile's frame
// (the 384 px image), drawn ahead so opening draws no Avatar; the gold
// ring stays around the highlighted Avatar, frame included; the pip sits
// above the frame; no Avatar, name or hint overlaps another's frame.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, errorLines, DRAWN_AHEAD_MS } from "../mastery/mastery_bar_scenario.js";
import { shownFrame } from "./avatar_frame_reader.js";
import { shownPip } from "../levels/level_pip_reader.js";
import { shownLayers } from "../support/shown_layers.js";

const PICKER_Z = 6500;
const AVATAR_Z = 6501;
const TOP_Z = 6502;
const PIP_Z = 6503;
const GOLD = 0xFFE8B84A;

// A shown layer's box in window pixels, from its position and height
// share: square layers, as the Avatars and the gold ring are.
function boxOf(fake, layer) {
    const { width, height } = shownLayers(fake, PICKER_Z)[0].canvasSize();
    const canvas = layer.canvasSize();
    const h = layer.scale().ySpan * height;
    const w = h * canvas.width / canvas.height;
    const cx = (layer.position().x + 0.5) * width;
    const cy = (0.5 - layer.position().y) * height;
    return { left: cx - w / 2, right: cx + w / 2, top: cy - h / 2, bottom: cy + h / 2, cx, cy };
}

test("each Avatar of the carousel wears its own frame, drawn ahead, inside the gold ring", async () => {
    const fake = await startScenario({
        addOns: ["tableMastery", "achievements", "profilePicker"], frameImages: true,
        profiles: { guest: { collectionTier: 3, avatarFrame: 3 }, Alice: { collectionTier: 1, avatarFrame: 1 }, Bob: { collectionTier: 2, avatarFrame: null } },
    });
    fake.advanceTime(DRAWN_AHEAD_MS);
    const avatarDrawings = () => fake.drawings().filter(drawing => drawing.zIndex === AVATAR_Z).length;
    const drawnAhead = avatarDrawings();

    const { default: lang } = await import("../../common/core/i18n.js");
    fake.openMenu("main", [{ title: "Play", cmd: fake.getBuiltInCommand("PlayGame") }]);
    fake.selectMenuItem(lang.profiles.menuEntry);
    assert.equal(avatarDrawings(), drawnAhead, "no Avatar drawn on opening");

    const avatars = shownLayers(fake, AVATAR_Z);
    assert.equal(avatars.length, 4);
    const frames = avatars.map(layer => shownFrame(layer)).map(frame => frame && `${frame.tier}/${frame.size}`);
    assert.deepEqual([...frames].sort(), ["1/384", "3/384", null, null], "Guest's, Alice's, and none for Bob nor the +");

    // The highlighted Avatar, the largest: Guest, the active Profile.
    const boxes = avatars.map(layer => ({ layer, box: boxOf(fake, layer) })).sort((a, b) => (b.box.right - b.box.left) - (a.box.right - a.box.left));
    const highlighted = boxes[0];
    assert.equal(shownFrame(highlighted.layer).tier, 3);
    const ring = shownLayers(fake, TOP_Z).find(layer => layer.texts().length === 0 && layer.fills().includes(GOLD));
    const ringBox = boxOf(fake, ring);
    assert.ok(Math.abs(ringBox.cx - highlighted.box.cx) < 1e-6 && Math.abs(ringBox.cy - highlighted.box.cy) < 1e-6, "the ring is centred on it");
    assert.ok(ringBox.right - ringBox.left > highlighted.box.right - highlighted.box.left, "the ring goes around the frame");

    // The frame's quarter margin around the Avatar's image.
    const frame = shownFrame(highlighted.layer).rect;
    const image = highlighted.layer.strokes().find(stroke => stroke.image && stroke.image.endsWith("default_avatar.png")).rect;
    assert.equal(frame.width, image.width * 1.5);
    assert.equal(frame.x, image.x - image.width / 4);

    const byLeft = boxes.map(({ box }) => box).sort((a, b) => a.left - b.left);
    for (let index = 1; index < byLeft.length; index++) {
        assert.ok(byLeft[index].left >= byLeft[index - 1].right, "no frame overlaps a neighbour");
    }
    const nameLayer = shownLayers(fake, TOP_Z).find(layer => layer.texts().length > 0);
    assert.ok(boxOf(fake, nameLayer).top >= highlighted.box.bottom, "the name under the frame");
    const hint = shownLayers(fake, PICKER_Z)[0].strokes().find(stroke => stroke.text === lang.profiles.pickerHint);
    assert.ok(hint.rect.y >= highlighted.box.bottom, "the hint under the frame");

    assert.deepEqual(shownLayers(fake, PIP_Z).map(shownPip).sort(), ["1", "1", "1"], "the pips above the frames");
    assert.deepEqual(errorLines(fake), []);
});

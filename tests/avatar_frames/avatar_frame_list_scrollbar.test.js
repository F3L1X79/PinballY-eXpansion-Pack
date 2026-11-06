// ============================================================
// The Avatar Frame list's scrollbar over the fake host: none while the rows
// fit; with more rows, a rail in the panel's right margin and a thumb as
// tall as the visible share, following the rows and still while the Exit
// Button is selected, drawn ahead and never drawn again on a move.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { createAvatarFrameList } from "../../common/avatar_frames/avatar_frame_list.js";
import { AVATAR_FRAME_LIST_Z_INDEX } from "../../common/avatar_frames/avatar_frame_list_painter.js";
import { createDrawingAhead } from "../../common/core/drawing_ahead.js";
import { createDrawnScreenControls } from "../../common/core/drawn_screen_controls.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { press } from "../stats/profile_stats_reader.js";
import { isMarkerOnExitButton, frameListFooterLayout, frameListScrollbar } from "./avatar_frame_list_reader.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const WINDOW = { width: 1920, height: 1080 };
const DRAWN_AHEAD_MS = 60 * 1000;
// With None, eleven rows show at once.
const ROWS_SHOWN = 11;
const PX = 0.5;

function fakeProfileRewards(frameCount) {
    const frames = Array.from({ length: frameCount }, (_, index) => ({
        id: index + 1, name: `Frame ${index + 1}`, isUnlocked: index < 3, unlockCondition: `Collection Tier ${index + 1}`,
    }));
    return {
        framesOf: () => frames,
        wornFrameOf: () => frames[0],
        imageOf: (frame, size) => `C:\\frames\\frame_${frame.id}_${size}.png`,
        choose: () => {},
    };
}

function openList(frameCount) {
    const fake = createFakePinballYHost({ layoutSize: WINDOW });
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, notified: [] }));
    const list = createAvatarFrameList(fake, {
        profileStore: createProfileStore(fake), profileRewards: fakeProfileRewards(frameCount), drawingAhead: createDrawingAhead(fake), drawnScreenControls: createDrawnScreenControls(fake),
    });
    fake.advanceTime(DRAWN_AHEAD_MS);
    list.open(() => {});
    return fake;
}

// The top of the first row shown and the bottom of the last.
function rowsSpan(fake) {
    const { rows } = frameListFooterLayout(fake, WINDOW);
    return { top: Math.min(...rows.map(row => row.top)), bottom: Math.max(...rows.map(row => row.bottom)), right: rows[0].right };
}

const thumbDraws = fake => fake.drawings().filter(drawing => drawing.zIndex === AVATAR_FRAME_LIST_Z_INDEX.scrollbarThumb).length;

test("with rows that fit, no scrollbar shows", () => {
    const fake = openList(ROWS_SHOWN - 1);

    assert.equal(frameListScrollbar(fake, WINDOW), null);
    assertNoErrorLogged(fake);
});

test("with more rows than fit, the rail and the thumb show right of the rows, the thumb at the top", () => {
    const fake = openList(21);
    const { rail, thumb } = frameListScrollbar(fake, WINDOW);
    const rows = rowsSpan(fake);

    assert.ok(rail.left > rows.right && thumb.left > rows.right, "right of the rows");
    assert.ok(rail.top >= rows.top - PX && rail.bottom <= rows.bottom + PX, "the rail along the rows");
    assert.ok(thumb.left < rail.right && thumb.right > rail.left, "the thumb on the rail");
    const railHeight = rail.bottom - rail.top;
    const thumbHeight = thumb.bottom - thumb.top;
    // 11 rows shown out of 22, the rail's length less its end diamonds.
    assert.ok(Math.abs(thumbHeight / railHeight - ROWS_SHOWN / 22) < 0.05, `the visible share, ${thumbHeight} of ${railHeight}`);
    assert.ok(Math.abs(thumb.top - (rail.top + (rail.right - rail.left) / 2)) < 1, "at the rail's top");
    assertNoErrorLogged(fake);
});

test("the thumb follows the rows down to the bottom, and stays put while the Exit Button is selected", () => {
    const fake = openList(21);
    const first = frameListScrollbar(fake, WINDOW).thumb;
    for (let i = 0; i < 12; i++) press(fake, "Next");
    const middle = frameListScrollbar(fake, WINDOW).thumb;
    assert.ok(middle.top > first.top, "down with the rows");

    for (let i = 0; i < 9; i++) press(fake, "Next");
    const { rail, thumb: last } = frameListScrollbar(fake, WINDOW);
    assert.ok(Math.abs(last.bottom - (rail.bottom - (rail.right - rail.left) / 2)) < 1, "at the rail's bottom");

    press(fake, "Next");
    assert.equal(isMarkerOnExitButton(fake), true);
    assert.deepEqual(frameListScrollbar(fake, WINDOW).thumb, last, "still while the Exit Button is selected");
    press(fake, "Next");
    assert.deepEqual(frameListScrollbar(fake, WINDOW).thumb, first, "back to the top with the first row");
    assertNoErrorLogged(fake);
});

test("the thumb is drawn ahead, never drawn again on a move, and shrunk to a point once closed", () => {
    const fake = openList(21);
    assert.equal(thumbDraws(fake), 1, "drawn ahead once");
    for (let i = 0; i < 15; i++) press(fake, "Next");
    assert.equal(thumbDraws(fake), 1, "never drawn again while scrolling");

    press(fake, "Exit");
    for (const zIndex of [AVATAR_FRAME_LIST_Z_INDEX.scrollbar, AVATAR_FRAME_LIST_Z_INDEX.scrollbarThumb]) {
        const hidden = fake.drawingLayers().filter(candidate => candidate.zIndex === zIndex);
        assert.equal(hidden.length, 1);
        assert.ok(hidden.every(candidate => candidate.alpha === 0 && candidate.scale().xSpan === 0.001 && candidate.scale().ySpan === 0.001));
    }
    assertNoErrorLogged(fake);
});

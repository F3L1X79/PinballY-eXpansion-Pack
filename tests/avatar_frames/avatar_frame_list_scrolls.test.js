// ============================================================
// The Avatar Frame list over the fake host with more rows than fit the
// window: the panel stays inside it and the list scrolls with the
// selection, down to the last row, back up to the first and to the Exit
// Button; opened on a row further down, it shows that row.
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
import { press, frameRows, highlightedRow, untilFrameListShown } from "../stats/profile_stats_reader.js";
import { isMarkerOnExitButton, frameListFooterLayout } from "./avatar_frame_list_reader.js";

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const WINDOW = { width: 1920, height: 1080 };
const DRAWN_AHEAD_MS = 60 * 1000;
const FRAME_COUNT = 21;
// Today's ten frames and None fit the window: eleven rows show at once.
const ROWS_SHOWN = 11;

const NAMES = [...Array.from({ length: FRAME_COUNT }, (_, index) => `Frame ${index + 1}`), "None"];

// A Profile Rewards module with FRAME_COUNT frames, the first three
// unlocked, wearing wornTier (null for none).
function fakeProfileRewards(wornTier) {
    const frames = Array.from({ length: FRAME_COUNT }, (_, index) => ({
        id: index + 1, name: `Frame ${index + 1}`, isUnlocked: index < 3, unlockCondition: `Collection Tier ${index + 1}`,
    }));
    let worn = wornTier;
    return {
        framesOf: () => frames,
        wornFrameOf: () => (worn === null ? null : frames[worn - 1]),
        imageOf: (frame, size) => `C:\\frames\\frame_${frame.id}_${size}.png`,
        choose: id => { worn = id; },
    };
}

function setUp({ wornTier = 1, drawnAhead = true } = {}) {
    const fake = createFakePinballYHost({ layoutSize: WINDOW });
    fake.addFile(`${PROFILES}\\cabinet.json`, JSON.stringify({ version: 1, activeProfile: "Alice" }));
    fake.addFile(`${PROFILES}\\Alice\\profile.json`, JSON.stringify({ version: 1, notified: [] }));
    const list = createAvatarFrameList(fake, {
        profileStore: createProfileStore(fake), profileRewards: fakeProfileRewards(wornTier), drawingAhead: createDrawingAhead(fake), drawnScreenControls: createDrawnScreenControls(fake),
    });
    if (drawnAhead) fake.advanceTime(DRAWN_AHEAD_MS);
    return { fake, list };
}

const shownNames = fake => frameRows(fake).map(row => row.name);

// The rows shown are consecutive, inside the window between the title and
// the footer, and the highlighted one among them.
function assertRowsFit(fake, message) {
    const { footer, rows, exitButton } = frameListFooterLayout(fake, WINDOW);
    const names = shownNames(fake);
    const first = NAMES.indexOf(names[0]);
    assert.deepEqual(names, NAMES.slice(first, first + names.length), `${message}: consecutive rows`);
    assert.ok(footer.top >= 0 && footer.bottom <= WINDOW.height + 0.5, `${message}: the footer in the window`);
    assert.ok(exitButton.top >= 0, `${message}: the Exit Button in the window`);
    for (const row of rows) {
        assert.ok(row.top >= exitButton.bottom && row.bottom <= footer.top, `${message}: a row between title and footer, ${JSON.stringify(row)}`);
    }
}

test("with more rows than fit, the panel stays in the window and shows the first rows", () => {
    const { fake, list } = setUp();
    list.open(() => {});

    assert.deepEqual(shownNames(fake), NAMES.slice(0, ROWS_SHOWN));
    assert.equal(highlightedRow(fake), "Frame 1");
    assertRowsFit(fake, "opened");
    assertNoErrorLogged(fake);
});

test("Next scrolls down to the last row, then goes to the Exit Button and back to the first row", () => {
    const { fake, list } = setUp();
    list.open(() => {});

    for (const name of NAMES.slice(1)) {
        press(fake, "Next");
        assert.equal(highlightedRow(fake), name, "each row in turn is selected and shown");
        assertRowsFit(fake, name);
    }
    assert.deepEqual(shownNames(fake), NAMES.slice(-ROWS_SHOWN), "the last rows show");

    press(fake, "Next");
    assert.equal(isMarkerOnExitButton(fake), true);
    press(fake, "Next");
    assert.equal(highlightedRow(fake), "Frame 1");
    assert.deepEqual(shownNames(fake), NAMES.slice(0, ROWS_SHOWN), "back to the first rows");
    assertNoErrorLogged(fake);
});

test("Prev from the Exit Button goes to the last row, then scrolls back up to the first", () => {
    const { fake, list } = setUp();
    list.open(() => {});

    press(fake, "Prev");
    assert.equal(isMarkerOnExitButton(fake), true);
    press(fake, "Prev");
    assert.equal(highlightedRow(fake), "None");
    assert.deepEqual(shownNames(fake), NAMES.slice(-ROWS_SHOWN));
    for (const name of NAMES.slice(0, -1).reverse()) {
        press(fake, "Prev");
        assert.equal(highlightedRow(fake), name, "each row in turn is selected and shown");
        assertRowsFit(fake, name);
    }
    assert.deepEqual(shownNames(fake), NAMES.slice(0, ROWS_SHOWN));
    assertNoErrorLogged(fake);
});

test("opened on a row further down, the list shows it", () => {
    const { fake, list } = setUp();
    list.open(() => {}, { selectedFrameId: 18 });

    assert.equal(highlightedRow(fake), "Frame 18");
    assertRowsFit(fake, "opened on Frame 18");
    assertNoErrorLogged(fake);
});

test("opened on the worn None, the list shows the last rows", () => {
    const { fake, list } = setUp({ wornTier: null });
    list.open(() => {});

    assert.equal(highlightedRow(fake), "None");
    assert.deepEqual(shownNames(fake), NAMES.slice(-ROWS_SHOWN));
    assertNoErrorLogged(fake);
});

test("not drawn ahead, it opens through the shared screen opening on the selected row", () => {
    const { fake, list } = setUp({ drawnAhead: false });
    list.open(() => {}, { selectedFrameId: 15 });
    untilFrameListShown(fake);

    assert.equal(highlightedRow(fake), "Frame 15");
    assertRowsFit(fake, "opened on Frame 15");
    assertNoErrorLogged(fake);
});

test("every row is drawn ahead, those scrolled out of view hidden and shrunk to a point", () => {
    const { fake, list } = setUp();
    list.open(() => {});
    press(fake, "Prev");
    press(fake, "Prev");

    const rowLayers = fake.drawingLayers().filter(layer => layer.zIndex === AVATAR_FRAME_LIST_Z_INDEX.rows);
    assert.equal(rowLayers.length, NAMES.length);
    const hidden = rowLayers.filter(layer => layer.alpha === 0);
    assert.equal(hidden.length, NAMES.length - ROWS_SHOWN);
    assert.ok(hidden.every(layer => layer.scale().xSpan === 0.001 && layer.scale().ySpan === 0.001));
    assertNoErrorLogged(fake);
});

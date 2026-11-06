// ============================================================
// The Achievement List keeps the hidden layer rule, through main.js on the
// fake PinballY globals: drawn ahead and closed, open at rest, gliding and
// opened again, no hidden layer of its own is more than a point and no
// visible one is a point; a layer staying on screen is only moved.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { isPoint, layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { ACHIEVEMENT_LIST_Z_INDEX } from "../../common/achievements/achievement_list.js";
import { LIST_LOOK } from "../../common/achievements/achievement_list_painter.js";
import { startPack, startOpeningFromMainMenu } from "./achievement_list_opening_scenario.js";
import { press, pressAndGlide, shownItems, untilListShown, isExitButtonShown, isARowHighlighted } from "./achievement_list_reader.js";

const DRAWING_AHEAD_OVER_MS = 10 * 60 * 1000;
const FRAME_MS = 16;
const GLIDE_FRAMES = 25;
// The Selection Marker keeps its own layers (see its own tests).
const Z_INDEXES = Object.entries(ACHIEVEMENT_LIST_Z_INDEX).filter(([key]) => key !== "marker").map(([, zIndex]) => zIndex);

const listLayers = fake => fake.drawingLayers().filter(layer => Z_INDEXES.includes(layer.zIndex));
const itemLayers = fake => fake.drawingLayers().filter(layer => layer.zIndex === ACHIEVEMENT_LIST_Z_INDEX.items);
const visibleItems = fake => itemLayers(fake).filter(layer => layer.alpha > 0);

function assertRuleHeld(fake, where) {
    assert.deepEqual(layersBreakingTheRule(fake, listLayers(fake)), [], where);
}

function assertAllPoints(fake, where) {
    const layers = listLayers(fake);
    assert.ok(layers.length > 0, where);
    assert.deepEqual(layers.filter(layer => !isPoint(layer)).map(layer => layer.zIndex), [], where);
}

// Counts each layer's setScale calls from now on.
function countScales(fake) {
    const counts = new Map();
    for (const layer of listLayers(fake)) {
        const setScale = layer.setScale;
        counts.set(layer, 0);
        layer.setScale = options => {
            counts.set(layer, counts.get(layer) + 1);
            setScale(options);
        };
    }
    return counts;
}

const placeOf = layer => ({ scale: layer.scale(), position: layer.position() });

test("the Achievement List leaves no hidden layer bigger than a point, nor a visible one that is a point", async () => {
    const { fake, lang } = await startPack();
    fake.advanceTime(DRAWING_AHEAD_OVER_MS);
    assertAllPoints(fake, "drawn ahead and closed");

    startOpeningFromMainMenu(fake, lang);
    untilListShown(fake);
    assertRuleHeld(fake, "open on the Exit Button");
    const shownFirst = shownItems(fake);
    const firstRows = visibleItems(fake);
    const firstPlaces = firstRows.map(placeOf);

    pressAndGlide(fake, "Next");
    assert.ok(isARowHighlighted(fake));
    assertRuleHeld(fake, "open on the first row");

    // Each frame of a glide: a layer on screen before and after is only moved.
    const scales = countScales(fake);
    for (let move = 0; move < 12; move++) {
        press(fake, "Next");
        for (let frame = 0; frame < GLIDE_FRAMES; frame++) {
            const visible = () => listLayers(fake).filter(layer => layer.alpha > 0);
            const before = new Set(visible());
            for (const layer of scales.keys()) scales.set(layer, 0);
            fake.advanceTime(FRAME_MS);
            const stayed = visible().filter(layer => before.has(layer));
            assert.deepEqual(stayed.filter(layer => scales.get(layer) > 0).map(layer => layer.zIndex), [], "only moved");
        }
        assertRuleHeld(fake, `glided down ${move + 1} rows`);
    }
    assert.ok(firstRows.some(isPoint), "a first row scrolled out is a point");

    // Back to the top: the first rows show at their usual size and place.
    while (isARowHighlighted(fake)) pressAndGlide(fake, "Prev");
    assert.ok(isExitButtonShown(fake));
    pressAndGlide(fake, "Next");
    pressAndGlide(fake, "Prev");
    assert.deepEqual(firstRows.map(placeOf), firstPlaces, "back at their size and place");
    assertRuleHeld(fake, "back at the top");

    press(fake, "Exit");
    assertAllPoints(fake, "closed");

    startOpeningFromMainMenu(fake, lang);
    untilListShown(fake);
    assert.deepEqual(shownItems(fake), shownFirst, "shows as before");
    assertRuleHeld(fake, "opened again");
    press(fake, "Exit");

    // A new window: the rows are drawn again, hidden, while the list gets ready.
    const drawnBefore = new Map(itemLayers(fake).map(layer => [layer, layer.canvasSize().width]));
    fake.setLayoutSize({ width: 1600, height: 1200 });
    startOpeningFromMainMenu(fake, lang);
    assertAllPoints(fake, "drawn again while getting ready");
    untilListShown(fake);
    assert.ok(visibleItems(fake).every(layer => layer.canvasSize().width !== drawnBefore.get(layer)), "drawn again");
    assertRuleHeld(fake, "opened on the new window");
    for (const layer of visibleItems(fake)) {
        assert.ok([LIST_LOOK.rowHeight, LIST_LOOK.sectionHeight].map(height => height / 1200).includes(layer.scale().ySpan), "at its new size");
    }
    assertNoErrorLogged(fake);
});

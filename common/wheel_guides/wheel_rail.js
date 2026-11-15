// ============================================================
// Wheel Rail: a thin column on the right edge of the wheel screen listing the
// wheel's pages (# then A to Z), those with no table dimmed, and the Rail
// Pill, a gold pill on the selected table's page. The base is drawn once per
// wheel content; each row's pill is its own small layer, drawn ahead.
// - A move only places and shows a pill: drawing the whole rail per move (82 ms) made scrolls stutter.
// - A pill missing at a move is drawn on the spot, the only draw a move may make.
// ============================================================

import { STEAMBALL_COLORS, STEAMBALL_FONTS } from "../drawing/steamball_palette.js";
import { fillRounded, oneLine } from "../drawing/steamball_drawing.js";
import { hideLayer } from "../drawing/placed_layers.js";
import { OTHER_LETTER_PAGE } from "../tables/wheel_places.js";
import { createGuideLayer, isGuideOn, REFERENCE_HEIGHT, showGuideLayer, WHEEL_GUIDES_Z_INDEX } from "./guide_layers.js";

// The pills over the base, both over the other guides.
export const WHEEL_RAIL_Z_INDEX = Object.freeze({ base: WHEEL_GUIDES_Z_INDEX + 1, pill: WHEEL_GUIDES_Z_INDEX + 2 });
export const LETTER_ROWS = Object.freeze([OTHER_LETTER_PAGE, ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"]);
// Prototype values, in reference px; centred centerY down, between the
// Mastery Bar and the Wheel Arc; right: a share of the window's width.
const RAIL = Object.freeze({ width: 40, row: 30, pad: 7, size: 14, weight: 600, centerY: 960, right: 0.008, radius: 10 });
const PILL = Object.freeze({ side: 5, inset: 2, radius: 7, weight: 700 });

export const isWheelRailOn = config => isGuideOn(config, "wheelRail");

export function createWheelRail(host, drawingAhead) {
    let base = null;
    // What the base shows: its rows and the pages holding a table.
    let baseRows = null;
    let basePresent = null;
    let baseKey = null;
    let baseHeight = 0;
    const pills = new Map();
    let shownPill = null;
    let isBaseShown = false;

    const drawRowLabel = (dc, text, y, { weight, color }) => oneLine(host, dc, text, {
        x: 0, y, width: RAIL.width, height: RAIL.row, size: RAIL.size, weight, color, align: "center", font: STEAMBALL_FONTS.body, cut: false,
    });

    function drawPill(row) {
        const layer = createGuideLayer(host, WHEEL_RAIL_Z_INDEX.pill);
        layer.clear(STEAMBALL_COLORS.transparent);
        layer.draw(dc => {
            fillRounded(dc, PILL.side, PILL.inset, RAIL.width - 2 * PILL.side, RAIL.row - 2 * PILL.inset, PILL.radius, STEAMBALL_COLORS.gold);
            drawRowLabel(dc, row, 0, { weight: PILL.weight, color: STEAMBALL_COLORS.panel });
        }, RAIL.width, RAIL.row);
        pills.set(row, layer);
        return layer;
    }

    // One missing pill of the rows shown per step.
    const wakePills = drawingAhead.add(() => {
        const missing = baseRows === null ? undefined : baseRows.find(row => !pills.has(row));
        if (missing === undefined) return false;
        drawPill(missing);
        return true;
    });

    // Drawn again only when the rows or the pages holding a table changed.
    function updateBase(rows, present) {
        if (rows === baseRows && present === basePresent) return;
        const key = `${rows.join(",")}|${rows.filter(row => present.has(row)).join(",")}`;
        baseRows = rows;
        basePresent = present;
        if (key === baseKey) return;
        baseKey = key;
        if (base === null) base = createGuideLayer(host, WHEEL_RAIL_Z_INDEX.base);
        baseHeight = 2 * RAIL.pad + rows.length * RAIL.row;
        base.clear(STEAMBALL_COLORS.transparent);
        base.draw(dc => {
            fillRounded(dc, 0, 0, RAIL.width, baseHeight, RAIL.radius, STEAMBALL_COLORS.panelTranslucent);
            rows.forEach((row, index) => drawRowLabel(dc, row, RAIL.pad + index * RAIL.row,
                { weight: RAIL.weight, color: present.has(row) ? STEAMBALL_COLORS.title : STEAMBALL_COLORS.dim }));
        }, RAIL.width, baseHeight);
        // Shown again at its new height.
        isBaseShown = false;
        wakePills();
    }

    function hidePill() {
        if (shownPill) hideLayer(shownPill);
        shownPill = null;
    }

    function hide() {
        hidePill();
        if (isBaseShown) hideLayer(base);
        isBaseShown = false;
    }

    // rows: the pages top to bottom; present: the Set of those holding a
    // table; selected: the selected table's page.
    function show(rows, present, selected) {
        updateBase(rows, present);
        // A centre given from the top, as setPos takes it: up from the window's centre.
        const showCentredAt = (layer, height, centreFromTop) =>
            showGuideLayer(layer, { height, x: -RAIL.right, y: REFERENCE_HEIGHT / 2 - centreFromTop, align: "right" });
        if (!isBaseShown) {
            showCentredAt(base, baseHeight, RAIL.centerY);
            isBaseShown = true;
        }
        const index = rows.indexOf(selected);
        const pill = index < 0 ? null : pills.get(selected) || drawPill(selected);
        if (pill !== shownPill) hidePill();
        if (pill === null) return;
        const rowCentre = RAIL.centerY - baseHeight / 2 + RAIL.pad + (index + 0.5) * RAIL.row;
        showCentredAt(pill, RAIL.row, rowCentre);
        shownPill = pill;
    }

    return { show, hide };
}

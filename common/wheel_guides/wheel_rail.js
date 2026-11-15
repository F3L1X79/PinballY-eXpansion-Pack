// ============================================================
// Wheel Rail: a thin column on the right edge of the wheel screen listing the
// wheel's pages (letters, or decades and their years, see rail_rows.js),
// those with no table dimmed, and the Rail Pill, a gold pill on the selected
// table's row. The base is drawn once per wheel content; each row's pill is its own small layer, drawn ahead.
// - A move only places and shows a pill: drawing the whole rail per move (82 ms) made scrolls stutter.
// - A pill missing at a move is drawn on the spot, the only draw a move may make.
// ============================================================

import { STEAMBALL_COLORS, STEAMBALL_FONTS } from "../drawing/steamball_palette.js";
import { fillRounded, oneLine } from "../drawing/steamball_drawing.js";
import { hideLayer } from "../drawing/placed_layers.js";
import { RAIL_ROWS } from "./rail_rows.js";
import { createGuideLayer, isGuideOn, REFERENCE_HEIGHT, showGuideLayer, WHEEL_GUIDES_Z_INDEX } from "./guide_layers.js";

// The pills over the base, both over the other guides.
export const WHEEL_RAIL_Z_INDEX = Object.freeze({ base: WHEEL_GUIDES_Z_INDEX + 1, pill: WHEEL_GUIDES_Z_INDEX + 2 });
// Prototype values, in reference px; centred centerY down, between the
// Mastery Bar and the Wheel Arc; right: a share of the window's width.
const RAIL = Object.freeze({ width: 40, centerY: 960, right: 0.008, radius: 10 });
// The pill's inset is 1 px on the rows lower than a letter's.
const PILL = Object.freeze({ side: 5, inset: 2, smallInset: 1, fullRow: 30, radius: 7, weight: 700 });

export const isWheelRailOn = config => isGuideOn(config, "wheelRail");

// A year row's height can change with the years shown, and its pill with it.
const pillKey = row => `${row.key}|${row.height}`;

export function createWheelRail(host, drawingAhead) {
    let base = null;
    // The rows the base shows, and where each starts down the base.
    let baseRows = null;
    let rowTops = [];
    let baseKey = null;
    let baseHeight = 0;
    const pills = new Map();
    let shownPill = null;
    let isBaseShown = false;

    const drawRowLabel = (dc, row, y, { weight, color }) => oneLine(host, dc, row.label, {
        x: 0, y, width: RAIL.width, height: row.height, size: row.size, weight, color, align: "center", font: STEAMBALL_FONTS.body, cut: false,
    });

    function drawPill(row) {
        const layer = createGuideLayer(host, WHEEL_RAIL_Z_INDEX.pill);
        const inset = row.height >= PILL.fullRow ? PILL.inset : PILL.smallInset;
        layer.clear(STEAMBALL_COLORS.transparent);
        layer.draw(dc => {
            fillRounded(dc, PILL.side, inset, RAIL.width - 2 * PILL.side, row.height - 2 * inset,
                Math.min(PILL.radius, Math.floor(row.height / 2) - inset), STEAMBALL_COLORS.gold);
            drawRowLabel(dc, row, 0, { weight: PILL.weight, color: STEAMBALL_COLORS.panel });
        }, RAIL.width, row.height);
        pills.set(pillKey(row), layer);
        return layer;
    }

    // One missing pill of the rows shown per step.
    const wakePills = drawingAhead.add(() => {
        const missing = baseRows === null ? undefined : baseRows.find(row => !pills.has(pillKey(row)));
        if (missing === undefined) return false;
        drawPill(missing);
        return true;
    });

    // Drawn again only when the rows, their heights or the lit ones changed.
    function updateBase(rows) {
        if (rows === baseRows) return;
        baseRows = rows;
        const key = rows.map(row => `${pillKey(row)}|${row.isLit}`).join(",");
        if (key === baseKey) return;
        baseKey = key;
        if (base === null) base = createGuideLayer(host, WHEEL_RAIL_Z_INDEX.base);
        rowTops = [];
        let top = RAIL_ROWS.pad;
        for (const row of rows) {
            rowTops.push(top);
            top += row.height;
        }
        baseHeight = top + RAIL_ROWS.pad;
        base.clear(STEAMBALL_COLORS.transparent);
        base.draw(dc => {
            fillRounded(dc, 0, 0, RAIL.width, baseHeight, RAIL.radius, STEAMBALL_COLORS.panelTranslucent);
            rows.forEach((row, index) => drawRowLabel(dc, row, rowTops[index],
                { weight: row.weight, color: row.isLit ? STEAMBALL_COLORS.title : STEAMBALL_COLORS.dim }));
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

    // rows: as rail_rows.js gives them; selected: the key of the selected table's row.
    function show(rows, selected) {
        updateBase(rows);
        // A centre given from the top, as setPos takes it: up from the window's centre.
        const showCentredAt = (layer, height, centreFromTop) =>
            showGuideLayer(layer, { height, x: -RAIL.right, y: REFERENCE_HEIGHT / 2 - centreFromTop, align: "right" });
        if (!isBaseShown) {
            showCentredAt(base, baseHeight, RAIL.centerY);
            isBaseShown = true;
        }
        const index = rows.findIndex(row => row.key === selected);
        const row = index < 0 ? null : rows[index];
        const pill = row === null ? null : pills.get(pillKey(row)) || drawPill(row);
        if (pill !== shownPill) hidePill();
        if (pill === null) return;
        showCentredAt(pill, row.height, RAIL.centerY - baseHeight / 2 + rowTops[index] + row.height / 2);
        shownPill = pill;
    }

    return { show, hide };
}

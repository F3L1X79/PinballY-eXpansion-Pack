// ============================================================
// Wheel Rail: a thin column on the right edge of the wheel screen listing the
// wheel's pages (letters, or decades and their years, see rail_rows.js),
// those with no table dimmed, and the Rail Pill, a gold pill on the selected
// table's row. The base is drawn once per wheel content; each row's pill is its own small layer, drawn ahead.
// WHEEL_RAIL_SECONDS (3 s; 0: always shown) after the last change of selected table or rows it slides right and fades out; the next change brings it back.
// - A move only places and shows a pill: drawing the whole rail per move (82 ms) made scrolls stutter.
// - A pill missing at a move is drawn on the spot, the only draw a move may make.
// - The slide and fades only move the layers and set their alpha, frame by frame; hide() leaves no timer pending.
// ============================================================

import { STEAMBALL_COLORS, STEAMBALL_FONTS } from "../drawing/steamball_palette.js";
import { fillRounded, oneLine } from "../drawing/steamball_drawing.js";
import { hideLayer } from "../drawing/placed_layers.js";
import { FRAME_MS } from "../drawing/screen_opening.js";
import { safeHandler } from "../core/safe_handler.js";
import { RAIL_ROWS } from "./rail_rows.js";
import { createGuideLayer, isGuideOn, moveGuideLayer, REFERENCE_HEIGHT, showGuideLayer, WHEEL_GUIDES_Z_INDEX } from "./guide_layers.js";

// The pills over the base, both over the other guides.
export const WHEEL_RAIL_Z_INDEX = Object.freeze({ base: WHEEL_GUIDES_Z_INDEX + 1, pill: WHEEL_GUIDES_Z_INDEX + 2 });
// Prototype values, in reference px; centred centerY down, between the
// Mastery Bar and the Wheel Arc; right: a share of the window's width.
const RAIL = Object.freeze({ width: 40, centerY: 960, right: 0.008, radius: 10 });
// The pill's inset is 1 px on the rows lower than a letter's.
const PILL = Object.freeze({ side: 5, inset: 2, smallInset: 1, fullRow: 30, radius: 7, weight: 700 });
// Leaves after the rest without a change of selected table, sliding right by
// slideSpan of the window's width (past its edge, the rail's right margin
// included), easing in, while fading out; comes back in place, fading in.
// slideSpan clears the edge up to a window about four times as tall as wide.
const MOTION = Object.freeze({ leaveMs: 450, fadeInMs: 80, slideSpan: 0.1 });
const DEFAULT_REST_SECONDS = 3;
// HIDDEN: by hide(); SHOWN: in place, maybe still fading in; GONE: left after the rest.
const PHASE = Object.freeze({ HIDDEN: "hidden", SHOWN: "shown", LEAVING: "leaving", GONE: "gone" });
const SCRIPT_NAME = "WheelRail";

export const isWheelRailOn = config => isGuideOn(config, "wheelRail");

// A year row's height can change with the years shown, and its pill with it.
const pillKey = row => `${row.key}|${row.height}`;

// The rest before leaving, in ms (0: never leaves); a value that is not a
// whole number of seconds of 0 or more falls back to the default.
function toRestMs(host, restSeconds) {
    if (Number.isInteger(restSeconds) && restSeconds >= 0) return restSeconds * 1000;
    host.log(`[${SCRIPT_NAME}] wheelRailSeconds must be a whole number of seconds of 0 or more, `
        + `not ${restSeconds}; using ${DEFAULT_REST_SECONDS}.`);
    return DEFAULT_REST_SECONDS * 1000;
}

// restSeconds: WHEEL_RAIL_SECONDS.
export function createWheelRail(host, drawingAhead, { restSeconds }) {
    const restMs = toRestMs(host, restSeconds);
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

    // Drawn again only when the rows, their heights or the lit ones changed; true then.
    function updateBase(rows) {
        if (rows === baseRows) return false;
        baseRows = rows;
        const key = rows.map(row => `${pillKey(row)}|${row.isLit}`).join(",");
        if (key === baseKey) return false;
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
        return true;
    }

    // The motion: the table the rail was last shown for (null once hidden),
    // its phase, since when and from which opacity, its opacity and how far
    // it slid (0 in place, 1 off the screen).
    let shownTableId = null;
    let phase = PHASE.HIDDEN;
    let phaseStartMs = 0;
    let startAlpha = 0;
    let alpha = 0;
    let slide = 0;
    let restTimer = null;
    let frameTimer = null;
    // Each shown layer's y, in reference px, kept for the frames' moves.
    const placedY = new Map();

    function hidePill() {
        if (shownPill) hideLayer(shownPill);
        shownPill = null;
    }

    function hideLayers() {
        hidePill();
        if (isBaseShown) hideLayer(base);
        isBaseShown = false;
    }

    // Only moves the shown layers and sets their opacity: a frame draws nothing.
    function applyMotion() {
        const x = -RAIL.right + MOTION.slideSpan * slide * slide;
        for (const layer of [isBaseShown ? base : null, shownPill]) {
            if (layer === null) continue;
            moveGuideLayer(layer, { x, y: placedY.get(layer), align: "right" });
            layer.alpha = alpha;
        }
    }

    function stopFrames() {
        if (frameTimer !== null) host.clearInterval(frameTimer);
        frameTimer = null;
    }

    function enterPhase(next) {
        phase = next;
        phaseStartMs = host.now().getTime();
        startAlpha = alpha;
    }

    // Timed on the clock, since Windows timers fire late. A fade-in counts
    // one frame ahead, so the rail shows the moment the table changes.
    function updateMotion() {
        const elapsedMs = host.now().getTime() - phaseStartMs;
        if (phase === PHASE.LEAVING) {
            slide = Math.min(1, elapsedMs / MOTION.leaveMs);
            alpha = startAlpha * (1 - slide);
        } else {
            alpha = Math.min(1, startAlpha + (elapsedMs + FRAME_MS) / MOTION.fadeInMs);
        }
    }

    // Runs every frame while the rail fades in or leaves, then stops.
    function step() {
        updateMotion();
        if (phase === PHASE.LEAVING && slide === 1) {
            phase = PHASE.GONE;
            hideLayers();
            stopFrames();
            return;
        }
        applyMotion();
        if (phase === PHASE.SHOWN && alpha === 1) stopFrames();
    }

    function startFrames() {
        if (frameTimer === null) frameTimer = host.setInterval(safeHandler(SCRIPT_NAME, step), FRAME_MS);
    }

    function stopRestTimer() {
        if (restTimer !== null) host.clearTimeout(restTimer);
        restTimer = null;
    }

    function startLeaving() {
        restTimer = null;
        enterPhase(PHASE.LEAVING);
        startFrames();
    }

    // Nothing left pending: a hidden rail never starts leaving.
    function hide() {
        stopRestTimer();
        stopFrames();
        hideLayers();
        shownTableId = null;
        phase = PHASE.HIDDEN;
        alpha = 0;
        slide = 0;
    }

    // rows: as rail_rows.js gives them; selected: the key of the selected
    // table's row; tableId: the selected table's. A new table or new rows bring the rail back.
    function show(rows, selected, tableId) {
        const hasNewRows = updateBase(rows);
        if (tableId !== shownTableId || hasNewRows) {
            shownTableId = tableId;
            slide = 0;
            enterPhase(PHASE.SHOWN);
            stopRestTimer();
            // An always shown rail never fades either.
            if (restMs === 0) alpha = 1;
            else {
                updateMotion();
                restTimer = host.setTimeout(safeHandler(SCRIPT_NAME, startLeaving), restMs);
            }
            if (alpha < 1) startFrames();
            else stopFrames();
        }
        if (phase === PHASE.GONE) return;
        // A centre given from the top, as setPos takes it: up from the window's centre.
        const showCentredAt = (layer, height, centreFromTop) => {
            const y = REFERENCE_HEIGHT / 2 - centreFromTop;
            showGuideLayer(layer, { height, x: -RAIL.right, y, align: "right" });
            placedY.set(layer, y);
        };
        if (!isBaseShown) {
            showCentredAt(base, baseHeight, RAIL.centerY);
            isBaseShown = true;
        }
        const index = rows.findIndex(row => row.key === selected);
        const row = index < 0 ? null : rows[index];
        const pill = row === null ? null : pills.get(pillKey(row)) || drawPill(row);
        if (pill !== shownPill) hidePill();
        if (pill !== null) {
            showCentredAt(pill, row.height, RAIL.centerY - baseHeight / 2 + rowTops[index] + row.height / 2);
            shownPill = pill;
        }
        applyMotion();
    }

    return { show, hide };
}

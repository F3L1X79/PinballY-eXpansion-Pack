// ============================================================
// Mastery Bar: the selected table's Table Mastery at the top right of the
// wheel screen (level name, bar, level square). Lights up on demand. Also
// gives the Collection Mastery's texts to the screens that show it.
// - Every state is drawn ahead on its own layer (ADR 0010), then only shown or hidden (a point).
// - Its place (under the Challenge Card or in its place) is asked on each show.
// ============================================================

import lang from "../core/i18n.js";
import { STEAMBALL_COLORS, STEAMBALL_FONTS } from "../drawing/steamball_palette.js";
import { CHALLENGE_CARD_Z_INDEX, CARD_REFERENCE_HEIGHT } from "../challenges/challenge_card.js";
import { MASTERY_STEPS, MAX_MASTERY_LEVEL, METAL_TIER_COUNT, tierOf, metalOf, tierMetalOf, withAlpha, mix, WHITE } from "./table_mastery.js";
import { drawMasterySquare } from "./mastery_square.js";
import { safeHandler } from "../core/safe_handler.js";
import { createHiddenLayer, hideLayer, placeAligned, POINT_SPAN } from "../drawing/placed_layers.js";

const SCRIPT_NAME = "MasteryBar";

// Just above the Challenge Card, under popups and menus. One plane each,
// panel under bar under square under the lit state: layers on one plane
// overlap in creation order, which the drawing ahead doesn't keep.
export const MASTERY_BAR_Z_INDEX = Object.freeze({
    panel: CHALLENGE_CARD_Z_INDEX + 1,
    bar: CHALLENGE_CARD_Z_INDEX + 2,
    square: CHALLENGE_CARD_Z_INDEX + 3,
    lit: CHALLENGE_CARD_Z_INDEX + 4,
});
// On the Challenge Card's 1920 px reference, with its width and right
// edge; the canvas leaves room for the widest halo.
const CANVAS = Object.freeze({ width: 400, height: 96 });
// What sits under the bar starts this far below its top, in reference px.
export const MASTERY_BAR_HEIGHT = CANVAS.height;
const PANEL = Object.freeze({ x: 10, y: 14, width: 360, height: 64, border: 1 });
const HEAD = Object.freeze({ y: 24, size: 13, weight: 600 });
const BAR = Object.freeze({ x: 24, y: 48, width: 262, height: 10 });
// Where the square sits; its look is common/mastery/mastery_square.js's.
const SQUARE = Object.freeze({ x: 312, y: 22 });
// Like the Challenge Card's highlight.
const LIT = Object.freeze({ ms: 1200, glowRings: 8, glowMaxAlpha: 0x60, fillLightening: 0.5 });
const NEVER_PLAYED = 0;

const panelKey = level => `panel:${level}`;
const squareKey = level => `square:${level}`;
const EMPTY_BAR_KEY = "bar:empty";
const tierBarKey = (tier, step) => `bar:${tier}:${step}`;
const barKey = mastery => (mastery && mastery.step > 0 ? tierBarKey(tierOf(mastery.level), mastery.step) : EMPTY_BAR_KEY);

function drawText(host, dc, text, { x, y, width, size, weight, color, font = STEAMBALL_FONTS.body, textAlign = "left", height }) {
    const styled = host.createStyledText({ textAlign, textStyle: { font, size, weight, color } });
    styled.add(text);
    const measured = styled.measure(width).height;
    const top = height === undefined ? y : y + (height - measured) / 2;
    styled.draw(dc, { x, y: top, width, height: measured });
}

// The head's text and colour: the level's name in its metal, or "to discover".
export function masteryHeadOf(level) {
    const TEXT = lang.tableMastery;
    return level === NEVER_PLAYED
        ? { text: TEXT.toDiscover, color: STEAMBALL_COLORS.dim }
        : { text: TEXT.levelNames[level - 1], color: metalOf(level) };
}

// collection: collectionMasteryOf()'s { tier, reached, needed }, with its
// goal and current count as texts; current is null at the last tier, which
// says all the tables reached it. Shared by the Collection Mastery cards.
export function collectionTextsOf(collection) {
    const { tier, reached, needed } = collection;
    const { levelNames, collection: TEXT } = lang.tableMastery;
    return tier >= MAX_MASTERY_LEVEL
        ? { ...collection, goal: TEXT.allTables(levelNames[tier - 1]), current: null }
        : { ...collection, goal: TEXT.goal(needed, levelNames[tier]), current: TEXT.current(reached, needed) };
}

function drawPanel(host, dc, level) {
    dc.fillRect(PANEL.x, PANEL.y, PANEL.width, PANEL.height, STEAMBALL_COLORS.panelTranslucent);
    dc.frameRect(PANEL.x, PANEL.y, PANEL.width, PANEL.height, PANEL.border, STEAMBALL_COLORS.border);
    const head = masteryHeadOf(level);
    drawText(host, dc, head.text, { ...HEAD, x: BAR.x, width: SQUARE.x - BAR.x, color: head.color });
}

// tier: null for the empty bar.
function drawBar(dc, tier, step, lit = false) {
    dc.fillRect(BAR.x, BAR.y, BAR.width, BAR.height, STEAMBALL_COLORS.track);
    const filled = Math.round(BAR.width * step / MASTERY_STEPS);
    if (tier === null || filled === 0) return;
    const metal = tierMetalOf(tier);
    dc.fillRect(BAR.x, BAR.y, filled, BAR.height, lit ? mix(metal, WHITE, LIT.fillLightening) : metal);
}

// Fading one-pixel frames around the panel, widening outwards.
function drawPanelGlow(dc, color) {
    for (let ring = LIT.glowRings; ring >= 1; ring--) {
        const alpha = Math.round(LIT.glowMaxAlpha * (1 - ring / (LIT.glowRings + 1)));
        dc.frameRect(PANEL.x - ring, PANEL.y - ring, PANEL.width + 2 * ring, PANEL.height + 2 * ring, 1, withAlpha(color, alpha));
    }
}

const drawSquare = (host, dc, level) => drawMasterySquare(host, dc, level, SQUARE.x, SQUARE.y);

// The whole bar lit up, in place of the resting one.
function drawLit(host, dc, { level, step }) {
    drawPanelGlow(dc, metalOf(level));
    drawPanel(host, dc, level);
    drawBar(dc, tierOf(level), step, true);
    drawSquare(host, dc, level);
}

// Every state, in the order the drawing ahead draws them: the panels,
// the squares, then the bars.
function plannedStates() {
    const states = [];
    for (let level = NEVER_PLAYED; level <= MAX_MASTERY_LEVEL; level++) {
        states.push({ key: panelKey(level), zIndex: MASTERY_BAR_Z_INDEX.panel, draw: (host, dc) => drawPanel(host, dc, level) });
    }
    for (let level = 1; level <= MAX_MASTERY_LEVEL; level++) {
        states.push({ key: squareKey(level), zIndex: MASTERY_BAR_Z_INDEX.square, draw: (host, dc) => drawSquare(host, dc, level) });
    }
    states.push({ key: EMPTY_BAR_KEY, zIndex: MASTERY_BAR_Z_INDEX.bar, draw: (host, dc) => drawBar(dc, null, 0) });
    for (let tier = 0; tier < METAL_TIER_COUNT; tier++) {
        for (let step = 1; step <= MASTERY_STEPS; step++) {
            states.push({ key: tierBarKey(tier, step), zIndex: MASTERY_BAR_Z_INDEX.bar, draw: (host, dc) => drawBar(dc, tier, step) });
        }
    }
    return states;
}

// topOf: how far below the window's top the bar sits, in reference px.
export function createMasteryBar(host, drawingAhead, { topOf }) {
    const states = plannedStates();
    const statesByKey = new Map(states.map(state => [state.key, state]));
    // Drawn layers by state key.
    const layers = new Map();
    let shown = [];
    // Created on the first light-up: most sessions start with no Play.
    let litLayer = null;
    let litTimer = null;

    // At span (the bar's, or a point's while hidden) and in place.
    const place = (layer, span) => placeAligned(layer, span, 0, -topOf() / CARD_REFERENCE_HEIGHT, "top right");

    function showLayer(layer) {
        place(layer, { ySpan: CANVAS.height / CARD_REFERENCE_HEIGHT });
        layer.alpha = 1;
    }

    function drawState(state) {
        const layer = createHiddenLayer(host, state.zIndex);
        // Placed, still a point, before its first draw: on the cabinet, a
        // layer drawn before it was placed never showed.
        place(layer, POINT_SPAN);
        layer.clear(STEAMBALL_COLORS.transparent);
        layer.draw(dc => state.draw(host, dc), CANVAS.width, CANVAS.height);
        layers.set(state.key, layer);
        return layer;
    }

    drawingAhead.add(() => {
        const missing = states.find(state => !layers.has(state.key));
        if (!missing) return false;
        drawState(missing);
        return true;
    });

    const layerOf = key => layers.get(key) || drawState(statesByKey.get(key));

    // The resting bar back in place of the lit one.
    function putOut() {
        if (litTimer === null) return;
        host.clearTimeout(litTimer);
        litTimer = null;
        hideLayer(litLayer);
        for (const layer of shown) showLayer(layer);
    }

    function hide() {
        putOut();
        for (const layer of shown) hideLayer(layer);
        shown = [];
    }

    // mastery: { level, step }, or null for a table never played.
    function show(mastery) {
        hide();
        const keys = mastery
            ? [panelKey(mastery.level), barKey(mastery), squareKey(mastery.level)]
            : [panelKey(NEVER_PLAYED), EMPTY_BAR_KEY];
        shown = keys.map(layerOf);
        for (const layer of shown) showLayer(layer);
    }

    // Shows this mastery lit up for a moment, then the resting bar.
    function lightUp(mastery) {
        show(mastery);
        if (!litLayer) litLayer = createHiddenLayer(host, MASTERY_BAR_Z_INDEX.lit);
        place(litLayer, POINT_SPAN);
        litLayer.clear(STEAMBALL_COLORS.transparent);
        litLayer.draw(dc => drawLit(host, dc, mastery), CANVAS.width, CANVAS.height);
        // The lit layer holds the whole bar: the resting one under it would
        // double its translucent panel and its halo.
        for (const layer of shown) hideLayer(layer);
        showLayer(litLayer);
        litTimer = host.setTimeout(safeHandler(SCRIPT_NAME, putOut), LIT.ms);
    }

    return { show, hide, lightUp };
}

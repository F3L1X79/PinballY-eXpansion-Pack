// ============================================================
// Selection Marker: a soft gold glow flowing round a drawn screen's current
// choice, one lap every 6 s, on one small layer redrawn about every 33 ms
// until remove(). setAside() stills and hides it, showAgain() restarts it.
// - Validated on the cabinet (spec #231): about 2 ms a draw, the wheel stays smooth.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { createHiddenLayer, hideLayer, placementOf } from "./placed_layers.js";

const SCRIPT_NAME = "SelectionMarker";

const TICK_MS = 33;
const LAP_MS = 6000;
const RINGS = 6;
const RING_WIDTH = 2;
// The glow's room round the choice.
const MARGIN = RINGS * RING_WIDTH;
// The gradient is spread over the choice and this room round it, as on
// the prototype validated on the cabinet, whatever the glow's own room.
const GRADIENT_ROOM = 20;
const PEAK_ALPHA = 0xE0;
// Each ring is cut into pieces about this long, each of one colour.
const PIECE = 16;
// The part of the gradient seen across a choice at once, so a dark wave
// and a bright one always show.
const SPREAD = 0.5;
// Golds from a warm bronze to a white gleam, twice a lap; the stops end as
// they start, so each lap joins up.
const GOLD_STOPS = [0xA8661C, 0xD98A1C, 0xFFD23F, 0xFFFBE6, 0xFFD23F, 0xD98A1C, 0xA8661C, 0xC98428, 0xFFC93A, 0xFFF0A0, 0xFFC93A, 0xC98428, 0xA8661C];

// The colour at u along the gradient, wrapping round.
function goldAt(u) {
    const position = (((u % 1) + 1) % 1) * (GOLD_STOPS.length - 1);
    const i = Math.floor(position);
    const t = position - i;
    const a = GOLD_STOPS[i];
    const b = GOLD_STOPS[i + 1];
    const channel = shift => Math.round(((a >> shift) & 0xFF) * (1 - t) + ((b >> shift) & 0xFF) * t) << shift;
    return channel(16) | channel(8) | channel(0);
}

// The point of the lap at this time. Timed on the clock from the Unix
// epoch, shared by every marker, rather than on tick counts: Windows fires
// a 33 ms interval about 49 ms apart, and the flow carries on from the
// same point across a jump and across screens.
const phaseAt = ms => (((ms % LAP_MS) + LAP_MS) % LAP_MS) / LAP_MS;

// The rings round a w x h choice drawn at (MARGIN, MARGIN).
function drawGlow(dc, w, h, phase) {
    const span = w + h + 4 * GRADIENT_ROOM;
    // Towards the bottom right, always.
    const offset = 1 - phase;
    // Both edges rounded, never the size: a rounded size made two
    // translucent pieces overlap by 1 px now and then, a dark line across
    // the glow on the cabinet.
    const piece = (left, top, right, bottom, alpha) => {
        const x = Math.round(left);
        const y = Math.round(top);
        const u = offset + SPREAD * ((left + right) / 2 + (top + bottom) / 2) / span;
        dc.fillRect(x, y, Math.round(right) - x, Math.round(bottom) - y, ((alpha << 24) | goldAt(u)) >>> 0);
    };
    // Pieces from start to end along x (horizontal) or y, across from..to.
    const along = (start, end, from, to, horizontal, alpha) => {
        const count = Math.max(1, Math.round((end - start) / PIECE));
        const edge = i => (i === count ? end : start + (end - start) * i / count);
        for (let i = 0; i < count; i++) {
            if (horizontal) piece(edge(i), from, edge(i + 1), to, alpha);
            else piece(from, edge(i), to, edge(i + 1), alpha);
        }
    };
    for (let ring = 0; ring < RINGS; ring++) {
        const d = (ring + 1) * RING_WIDTH;
        const left = MARGIN - d;
        const top = MARGIN - d;
        const right = MARGIN + w + d;
        const bottom = MARGIN + h + d;
        // An alpha of 0 would be read by PinballY as fully opaque.
        const alpha = Math.max(1, Math.round(PEAK_ALPHA * Math.pow(1 - ring / RINGS, 1.6)));
        along(left, right, top, top + RING_WIDTH, true, alpha);
        along(left, right, bottom - RING_WIDTH, bottom, true, alpha);
        along(top + RING_WIDTH, bottom - RING_WIDTH, left, left + RING_WIDTH, false, alpha);
        along(top + RING_WIDTH, bottom - RING_WIDTH, right - RING_WIDTH, right, false, alpha);
    }
}

// For one open screen: zIndex for its layer, and the screen's reference
// coordinate system (its layers' rects in reference pixels).
export function createSelectionMarker(host, { zIndex, referenceWidth, referenceHeight }) {
    // A point until its first choice.
    const layer = createHiddenLayer(host, zIndex);
    let choice = null;

    function draw() {
        const canvasW = Math.ceil(choice.w + 2 * MARGIN);
        const canvasH = Math.ceil(choice.h + 2 * MARGIN);
        const phase = phaseAt(host.now().getTime());
        layer.draw(dc => drawGlow(dc, choice.w, choice.h, phase), canvasW, canvasH);
        return { canvasW, canvasH };
    }

    let timer = null;
    const startTurning = () => {
        timer = host.setInterval(safeHandler(SCRIPT_NAME, () => {
            if (choice) draw();
        }), TICK_MS);
    };
    startTurning();

    // rect: the choice itself, in reference pixels; drawn at once.
    function moveTo(rect) {
        choice = { ...rect };
        const { canvasW, canvasH } = draw();
        // The canvas, larger than the choice by the glow's room.
        const { ySpan, x, y } = placementOf({ x: rect.x - MARGIN, y: rect.y - MARGIN, w: canvasW, h: canvasH }, referenceWidth, referenceHeight);
        layer.setScale({ ySpan });
        layer.setPos(x, y);
    }

    return {
        moveTo,
        setOpacity(alpha) {
            layer.alpha = alpha;
        },
        // While its screen is set aside: still and hidden, reduced to a point.
        setAside() {
            host.clearInterval(timer);
            timer = null;
            hideLayer(layer);
        },
        // Back on the same choice, turning again; its opacity is the screen's to set.
        showAgain() {
            if (timer === null) startTurning();
            if (choice) moveTo(choice);
        },
        remove() {
            host.clearInterval(timer);
            host.removeDrawingLayer(layer);
        },
    };
}

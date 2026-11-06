// ============================================================
// Confetti Shower: about 8 s of confetti over the wheel screen, started with
// a celebrated toast; tells when it is due to end so a Level Toast can follow.
// Vanishes on "prelaunch", "gamestarted" and "attractmodestart".
// - Confetti wait as points (placed_layers.js): a hidden full-window layer still costs every frame.
// - Does not check for a drawn dialog itself: the toast waits for one.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { getDrawingAhead } from "../core/drawing_ahead.js";
import { STEAMBALL_COLORS } from "../drawing/steamball_palette.js";
import { createHiddenLayer, hideLayer } from "../drawing/placed_layers.js";
import config from "../core/config.js";

const SCRIPT_NAME = "ConfettiShower";

// In front of everything, the Achievement Toast (6500) included. Exported
// for the tests' reader.
export const CONFETTI_Z_INDEX = 7000;
const FRAME_MS = 16;
const COUNT = 342;
// react-confetti's defaults, per frame of DEFAULT_FRAME_MS, in pixels of a
// REFERENCE_HEIGHT-tall browser window.
const DEFAULT_FRAME_MS = 1000 / 60;
const REFERENCE_HEIGHT = 900;
const GRAVITY = 0.1;
const FRICTION = 0.99;
const INITIAL_VELOCITY_X = 4;
const INITIAL_VELOCITY_Y = 10;
const ROTATE_Y_STEP = 0.1;
// react-confetti's pieces are 5 to 20 px on each side.
const PIECE_MIN = 5;
const PIECE_MAX = 20;
// react-confetti releases its pieces over 5 s; shortened so the whole
// shower lasts about 8 s: a piece takes about 3.8 s to fall (4.7 s at
// worst), whatever the window height.
const EMIT_SECONDS = 3.3;
// canvas-confetti's palette, plus the Steamball gold.
const COLORS = [0x26CCFF, 0xA25AFD, 0xFF5E7E, 0x88FF5A, 0xFCFF42, 0xFFA62D, 0xFF36FF, STEAMBALL_COLORS.gold & 0xFFFFFF];
// Each confetto is a paper rectangle drawn tilted on a square canvas.
const CANVAS_SIDE = 32;
const PAPER_LENGTH = 17;
const PAPER_WIDTH = 9;
// Samples per pixel side, to soften the tilted edges.
const SUPERSAMPLE = 3;
// Width of the light and dark strips along the paper's long edges.
const EDGE_STRIP = 1.6;
// Below it, a confetto seen edge-on would vanish.
const MIN_SQUASH = 0.08;
const BACK_SHADE = 0.55;
// The shower's nominal length, from its start: what a Level Toast waiting
// for its end counts on, though the last confetti may fall a little longer.
const SHOWER_MS = 8000;

const random = (min, max) => min + Math.random() * (max - min);

// react-confetti's default tweenFunction.
const easeInOutQuad = p => (p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p);

// The colour scaled towards black (factor < 1) or white (factor > 1).
function shade(rgb, factor) {
    const channel = shift => {
        const value = (rgb >> shift) & 0xFF;
        return Math.round(factor <= 1 ? value * factor : value + (255 - value) * (factor - 1));
    };
    return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

const argb = (alpha, rgb) => Math.round(alpha * 255) * 2 ** 24 + rgb;

// Draws a paper rectangle tilted by angle, centred on the canvas: a light
// strip along one long edge, a dark one along the other, softened edges.
// Runs of identical pixels in a row are drawn as one rectangle.
function drawPaper(dc, rgb, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const centre = CANVAS_SIDE / 2;
    const light = shade(rgb, 1.35);
    const dark = shade(rgb, 0.7);
    for (let y = 0; y < CANVAS_SIDE; y++) {
        let runColor = 0;
        let runStart = 0;
        for (let x = 0; x <= CANVAS_SIDE; x++) {
            let color = 0;
            if (x < CANVAS_SIDE) {
                let covered = 0;
                let across = 0;
                for (let sy = 0; sy < SUPERSAMPLE; sy++) {
                    for (let sx = 0; sx < SUPERSAMPLE; sx++) {
                        const px = x + (sx + 0.5) / SUPERSAMPLE - centre;
                        const py = y + (sy + 0.5) / SUPERSAMPLE - centre;
                        const u = px * cos + py * sin;
                        const v = -px * sin + py * cos;
                        if (Math.abs(u) <= PAPER_LENGTH / 2 && Math.abs(v) <= PAPER_WIDTH / 2) {
                            covered++;
                            across += v;
                        }
                    }
                }
                if (covered > 0) {
                    const v = across / covered;
                    const tone = v < -PAPER_WIDTH / 2 + EDGE_STRIP ? light : v > PAPER_WIDTH / 2 - EDGE_STRIP ? dark : rgb;
                    color = argb(covered / (SUPERSAMPLE * SUPERSAMPLE), tone);
                }
            }
            if (color !== runColor || x === CANVAS_SIDE) {
                if (runColor !== 0) dc.fillRect(runStart, y, x - runStart, 1, runColor);
                runColor = color;
                runStart = x;
            }
        }
    }
}

// soundFile: absolute path played once per shower, empty for none.
export function createConfettiShower(host, { enabled = true, soundFile = "", drawingAhead } = {}) {
    if (!enabled) return { start() {}, endsAtMs: () => null, onStopped() {} };

    const log = text => host.log(`[${SCRIPT_NAME}] ${text}`);
    // A sound that cannot play is logged and never stops the shower.
    const playSound = safeHandler(SCRIPT_NAME, () => { if (soundFile) host.playSound(soundFile); });
    // One entry per confetto drawn so far: its front layer and its darker
    // back layer, reused from one shower to the next.
    const pool = [];
    let screenSize = null;
    // The layer the window was measured on, kept for the first confetto.
    let measureLayer = null;
    // The falling shower, or null.
    let shower = null;
    let frameTimer = null;
    const stopListeners = [];

    function paperLayer(layer, rgb, angle) {
        layer.draw(dc => drawPaper(dc, rgb, angle), CANVAS_SIDE, CANVAS_SIDE);
        return layer;
    }

    // First the window size, then one confetto (both sides) per step.
    drawingAhead.add(() => {
        if (!screenSize) {
            measureLayer = createHiddenLayer(host, CONFETTI_Z_INDEX);
            // A draw without a size gets a canvas the size of the window.
            measureLayer.draw(dc => { screenSize = dc.getSize(); });
            return true;
        }
        const rgb = COLORS[pool.length % COLORS.length];
        const angle = random(0, Math.PI);
        const frontLayer = measureLayer || createHiddenLayer(host, CONFETTI_Z_INDEX);
        measureLayer = null;
        const backLayer = createHiddenLayer(host, CONFETTI_Z_INDEX);
        pool.push({ front: paperLayer(frontLayer, rgb, angle), back: paperLayer(backLayer, shade(rgb, BACK_SHADE), angle) });
        return pool.length < COUNT;
    });

    function hide(piece) {
        hideLayer(piece.layers.front);
        hideLayer(piece.layers.back);
    }

    function stop() {
        if (frameTimer !== null) host.clearInterval(frameTimer);
        frameTimer = null;
        if (!shower) return;
        for (const piece of shower.pieces) hide(piece);
        shower = null;
        for (const listener of stopListeners) listener();
    }

    // A new piece on the top edge, as react-confetti's generator and
    // Particle constructor make it; pixelScale turns its pixels into the window's.
    function release(layers, pixelScale) {
        const side = random(PIECE_MIN, PIECE_MAX) * pixelScale;
        // The paper covers about half the canvas, which is scaled so the
        // paper is side long.
        const canvas = side * CANVAS_SIDE / PAPER_LENGTH;
        return {
            layers,
            canvas,
            // react-confetti's pieces each have their own width and height.
            stretch: random(0.6, 1.4),
            x: random(0, screenSize.width),
            y: -canvas / 2,
            vx: random(-INITIAL_VELOCITY_X, INITIAL_VELOCITY_X) * pixelScale,
            vy: random(-INITIAL_VELOCITY_Y, 0) * pixelScale,
            rotateY: random(0, 1),
            rotationDirection: Math.random() < 0.5 ? 1 : -1,
            flipsWidth: Math.random() < 0.5,
            done: false,
        };
    }

    // Runs every frame while the shower falls, then stops.
    function step() {
        const nowMs = host.now().getTime();
        // Each frame is weighted by its real length, so a slow frame never slows the fall.
        const elapsedMs = shower.lastFrameMs === null ? FRAME_MS : nowMs - shower.lastFrameMs;
        shower.lastFrameMs = nowMs;
        const { width, height } = screenSize;
        const pixelScale = height / REFERENCE_HEIGHT;
        const frameRatio = elapsedMs / DEFAULT_FRAME_MS;

        // react-confetti's generator: the number released so far follows
        // the tween, the newcomers join this frame.
        const progress = Math.min(1, (nowMs - shower.startMs) / (EMIT_SECONDS * 1000));
        const target = Math.round(shower.count * easeInOutQuad(progress));
        while (shower.pieces.length < target) shower.pieces.push(release(pool[shower.pieces.length], pixelScale));

        let falling = 0;
        for (const piece of shower.pieces) {
            if (piece.done) continue;
            // Particle.update(), with no wind.
            piece.x += piece.vx * frameRatio;
            piece.y += piece.vy * frameRatio;
            piece.vy += GRAVITY * pixelScale * frameRatio;
            piece.vx *= FRICTION ** frameRatio;
            piece.vy *= FRICTION ** frameRatio;
            // rotateY bounces between -1 and 1.
            if (piece.rotateY >= 1 && piece.rotationDirection > 0) piece.rotationDirection = -1;
            else if (piece.rotateY <= -1 && piece.rotationDirection < 0) piece.rotationDirection = 1;
            piece.rotateY += ROTATE_Y_STEP * piece.rotationDirection * frameRatio;

            if (piece.y - piece.canvas / 2 > height || piece.x < -piece.canvas || piece.x > width + piece.canvas) {
                piece.done = true;
                hide(piece);
                continue;
            }
            falling++;
            const squash = Math.max(MIN_SQUASH, Math.abs(piece.rotateY));
            const w = piece.canvas * (piece.flipsWidth ? squash : 1);
            const h = piece.canvas * piece.stretch * (piece.flipsWidth ? 1 : squash);
            const showsBack = piece.rotateY < 0;
            const shown = showsBack ? piece.layers.back : piece.layers.front;
            const hidden = showsBack ? piece.layers.front : piece.layers.back;
            shown.setScale({ xSpan: w / width, ySpan: h / height });
            shown.setPos(piece.x / width - 0.5, 0.5 - piece.y / height);
            // Only on a change: each assignment costs PinballY a redraw.
            if (shown.alpha !== 1) shown.alpha = 1;
            if (hidden.alpha !== 0) hidden.alpha = 0;
        }
        if (progress === 1 && falling === 0) stop();
    }

    // Does nothing while a shower falls: one return to the wheel brings one shower.
    function start() {
        if (shower) return;
        if (!screenSize || pool.length === 0) {
            log("Not started: no confetti drawn ahead yet.");
            return;
        }
        // The confetti still being drawn ahead wait for the next shower.
        shower = { pieces: [], count: pool.length, startMs: host.now().getTime(), lastFrameMs: null };
        log(`Started with ${shower.count} confetti.`);
        frameTimer = host.setInterval(safeHandler(SCRIPT_NAME, step), FRAME_MS);
        playSound();
    }

    // Fire when a table launches or attract mode starts: the confetti vanish at once.
    for (const eventName of ["prelaunch", "gamestarted", "attractmodestart"]) {
        host.on(eventName, safeHandler(SCRIPT_NAME, stop));
    }

    // The time (ms) the falling shower is due to end, or null when none falls.
    const endsAtMs = () => (shower ? shower.startMs + SHOWER_MS : null);

    // listener: runs when a shower stops, at its end or vanishing early.
    function onStopped(listener) {
        stopListeners.push(listener);
    }

    return { start, endsAtMs, onStopped };
}

let sharedConfettiShower = null;

export function getConfettiShower() {
    if (!sharedConfettiShower) {
        sharedConfettiShower = createConfettiShower(createPinballYHost(), {
            enabled: config.confetti,
            soundFile: config.confettiSoundFile,
            drawingAhead: getDrawingAhead(),
        });
    }
    return sharedConfettiShower;
}

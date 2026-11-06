// ============================================================
// Fireworks: about 8 s of rockets bursting over the wheel screen, in front
// of everything, started with a Level Toast. Each burst is a film drawn
// ahead (docs/adr/0012). Vanishes on "prelaunch", "gamestarted" and
// "attractmodestart".
// - Every layer waits as a point (placed_layers.js).
// - Does not check for a drawn dialog itself: the toast waits for one.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { createPinballYHost } from "../core/pinbally_host.js";
import { getDrawingAhead } from "../core/drawing_ahead.js";
import { STEAMBALL_COLORS } from "../drawing/steamball_palette.js";
import { CONFETTI_Z_INDEX } from "./confetti_shower.js";
import { createHiddenLayer, hideLayer } from "../drawing/placed_layers.js";
import config from "../core/config.js";

const SCRIPT_NAME = "Fireworks";

// Just above the Confetti Shower. Exported for the tests' reader.
export const FIREWORKS_Z_INDEX = CONFETTI_Z_INDEX + 100;
const FRAME_MS = 16;
// Sizes and speeds per frame of DEFAULT_FRAME_MS, in pixels of a
// REFERENCE_HEIGHT-tall browser window, as fireworks-js's.
const DEFAULT_FRAME_MS = 1000 / 60;
const REFERENCE_HEIGHT = 900;
// fireworks-js's Trace.
const TRACE_SPEED = 10;
const ACCELERATION = 1.05;
// When each rocket leaves, so the show lasts about 8 s.
const ROCKET_TIMES_S = [0, 0.8, 1.7, 2.7, 3.6, 4.6, 5.8];
const SHADOW = 0x000000;
const SHINE = 0xFFFFFF;
const GOLD = STEAMBALL_COLORS.gold & 0xFFFFFF;
const ROCKET_GOLD = 0xFFD27A;
// The Confetti Shower's colours plus the Steamball gold: the outer ring,
// the inner ring and the twinkling points. One film per scheme.
const COLOR_SCHEMES = [
    [0xFF5E7E, 0xFCFF42, GOLD],
    [0x26CCFF, 0xA25AFD, 0xFF36FF],
    [0x88FF5A, 0x26CCFF, 0xFCFF42],
    [0xFFA62D, 0xFF36FF, GOLD],
];
// A burst's film: its frames, square canvases of FILM_SIDE pixels showing
// FILM_SPAN browser pixels, the burst's centre CENTRE_Y down the canvas.
const FILM_FPS = 20;
const FILM_FRAMES = 30;
const FILM_SIDE = 320;
const FILM_SPAN = 480;
const CENTRE_Y = 0.42;
// Rocket sprites are drawn about the size they show at on the cabinet.
const SPRITE_SIDE = 64;
// In browser pixels.
const GLOW_HEAD_SIZE = 34;
const SPARK_SIZE = 22;
const TRAIL_SLOTS = 12;
const TRAIL_LIFE_MS = 380;
const TRAIL_EVERY_MS = 28;
// Painting time per drawing-ahead step, within its 12 ms slice.
const STEP_MS = 8;

const random = (min, max) => min + Math.random() * (max - min);
const clamp01 = value => Math.max(0, Math.min(1, value));

// The colour scaled towards black (factor < 1) or white (factor > 1).
function shade(rgb, factor) {
    const channel = shift => {
        const value = (rgb >> shift) & 0xFF;
        return Math.round(factor <= 1 ? value * factor : value + (255 - value) * (factor - 1));
    };
    return (channel(16) << 16) | (channel(8) << 8) | channel(0);
}

// ----- Shapes: signed distance, negative inside, in canvas pixels -----

function circle(cx, cy, r) {
    return {
        box: [cx - r, cy - r, cx + r, cy + r],
        distance(x, y) {
            const dx = x - cx;
            const dy = y - cy;
            return Math.sqrt(dx * dx + dy * dy) - r;
        },
    };
}

// A stroke from (x0, y0), tailWidth wide, to a round head at (x1, y1),
// headWidth wide: Inigo Quilez's uneven capsule, one distance in constant
// time where a polygon would take one per edge.
function taper(x0, y0, x1, y1, tailWidth, headWidth) {
    const tailR = tailWidth / 2;
    const headR = headWidth / 2;
    const bx = x1 - x0;
    const by = y1 - y0;
    const squaredLength = bx * bx + by * by;
    const narrowing = tailR - headR;
    // One end's circle holds the other: only the bigger one shows.
    if (squaredLength <= narrowing * narrowing) return tailR > headR ? circle(x0, y0, tailR) : circle(x1, y1, headR);
    const cx = Math.sqrt(squaredLength - narrowing * narrowing);
    return {
        box: [Math.min(x0 - tailR, x1 - headR), Math.min(y0 - tailR, y1 - headR), Math.max(x0 + tailR, x1 + headR), Math.max(y0 + tailR, y1 + headR)],
        distance(x, y) {
            const px = x - x0;
            const py = y - y0;
            const qx = Math.abs(px * by - py * bx) / squaredLength;
            const qy = (px * bx + py * by) / squaredLength;
            const k = cx * qy - narrowing * qx;
            if (k < 0) return Math.sqrt(squaredLength * (qx * qx + qy * qy)) - tailR;
            if (k > cx) return Math.sqrt(squaredLength * (qx * qx + qy * qy + 1 - 2 * qy)) - headR;
            return cx * qx + narrowing * qy - tailR;
        },
    };
}

// ----- Rasterizer: painted in order into a buffer, row by row over several
// drawing-ahead steps, then drawn by runs. One distance per pixel: edges
// are softened from how far the pixel's centre is from them. -----

// items: { shape, fill, soft (a glow's reach: full inside, fading to
// nothing soft pixels away), strength (0 to 1) }, later ones on top.
function createPaintJob(items, side) {
    const r = new Float32Array(side * side);
    const g = new Float32Array(side * side);
    const b = new Float32Array(side * side);
    const a = new Float32Array(side * side);
    let itemIndex = 0;
    let row = null;

    function paintRow(item, y, left, right) {
        const { shape, fill, soft = 0, strength = 1 } = item;
        const red = (fill >> 16) & 0xFF;
        const green = (fill >> 8) & 0xFF;
        const blue = fill & 0xFF;
        for (let x = left; x <= right; x++) {
            const d = shape.distance(x + 0.5, y + 0.5);
            const cover = strength * (soft > 0 ? (d <= 0 ? 1 : clamp01(1 - d / soft) ** 2) : clamp01(0.5 - d));
            if (cover <= 0) continue;
            const i = y * side + x;
            // Premultiplied "over".
            const keep = 1 - cover;
            r[i] = cover * red + r[i] * keep;
            g[i] = cover * green + g[i] * keep;
            b[i] = cover * blue + b[i] * keep;
            a[i] = cover + a[i] * keep;
        }
    }

    return {
        // Paints rows until timeLeft() returns false; true once all is painted.
        run(timeLeft) {
            while (itemIndex < items.length) {
                const item = items[itemIndex];
                const [x0, y0, x1, y1] = item.shape.box;
                const margin = (item.soft || 0) + 1;
                const top = Math.max(0, Math.floor(y0 - margin));
                const bottom = Math.min(side - 1, Math.ceil(y1 + margin));
                const left = Math.max(0, Math.floor(x0 - margin));
                const right = Math.min(side - 1, Math.ceil(x1 + margin));
                if (row === null) row = top;
                while (row <= bottom) {
                    paintRow(item, row, left, right);
                    row++;
                    if (!timeLeft()) return false;
                }
                itemIndex++;
                row = null;
            }
            return true;
        },
        // Runs of identical pixels in a row are drawn as one rectangle.
        drawTo(dc) {
            for (let y = 0; y < side; y++) {
                let runColor = 0;
                let runStart = 0;
                for (let x = 0; x <= side; x++) {
                    let color = 0;
                    if (x < side) {
                        const i = y * side + x;
                        const alpha = a[i];
                        if (alpha > 0.02) {
                            // Premultiplied channels never exceed alpha * 255.
                            const red = Math.min(255, Math.round(r[i] / alpha));
                            const green = Math.min(255, Math.round(g[i] / alpha));
                            const blue = Math.min(255, Math.round(b[i] / alpha));
                            color = Math.round(Math.min(1, alpha) * 255) * 2 ** 24 + (red << 16) + (green << 8) + blue;
                        }
                    }
                    if (color !== runColor || x === side) {
                        if (runColor !== 0) dc.fillRect(runStart, y, x - runStart, 1, runColor);
                        runColor = color;
                        runStart = x;
                    }
                }
            }
        },
    };
}

// ----- Rocket sprites -----

const C = SPRITE_SIDE / 2;

// A white-hot head in a golden glow, over a soft dark shadow.
const GLOW_HEAD = [
    { shape: circle(C, C, 5), fill: SHADOW, soft: 26, strength: 0.4 },
    { shape: circle(C, C, 4), fill: ROCKET_GOLD, soft: 20, strength: 0.85 },
    { shape: circle(C, C, 6), fill: SHINE },
];
const SPARK = [
    { shape: circle(C, C, 3), fill: SHADOW, soft: 22, strength: 0.3 },
    { shape: circle(C, C, 3), fill: ROCKET_GOLD, soft: 18, strength: 0.8 },
    { shape: circle(C, C, 4), fill: shade(ROCKET_GOLD, 1.5) },
];

// ----- The burst's film, in canvas pixels -----

// A glowing stroke: soft dark shadow, coloured glow, body, white-hot core.
function glowingStroke(items, x0, y0, x1, y1, width, rgb, strength, scale) {
    if (strength <= 0.01) return;
    items.push({ shape: taper(x0, y0, x1, y1, width * 0.3, width), fill: SHADOW, soft: 16 * scale, strength: 0.4 * strength });
    items.push({ shape: taper(x0, y0, x1, y1, width * 0.3, width * 0.8), fill: rgb, soft: 10 * scale, strength: 0.6 * strength });
    items.push({ shape: taper(x0, y0, x1, y1, width * 0.15, width), fill: rgb, strength });
    items.push({ shape: taper(x0, y0, x1, y1, 0.5, width * 0.45), fill: shade(rgb, 1.8), strength });
}

// A soft white flash, its coloured halo around it; p from 0 to 1.
function flash(items, cx, cy, p, rgb, size, scale) {
    if (p >= 1) return;
    const radius = (0.3 + 0.7 * p) * size * scale;
    items.push({ shape: circle(cx, cy, 0), fill: rgb, soft: radius * 1.5, strength: 0.6 * (1 - p) });
    items.push({ shape: circle(cx, cy, radius * 0.25), fill: SHINE, soft: radius, strength: 0.95 * (1 - p) });
}

// Two regular rings of streaks rushing out, slowing and drooping, then
// glowing points that twinkle out. seed tilts each streak a little.
function burstFrame(index, [outer, inner, twinkle], seed) {
    const scale = FILM_SIDE / FILM_SPAN;
    const cx = FILM_SIDE / 2;
    const cy = FILM_SIDE * CENTRE_Y;
    const t = index / FILM_FPS;
    const lastT = FILM_FRAMES / FILM_FPS;
    const items = [];
    flash(items, cx, cy, t / 0.22, outer, 90, scale);
    const rings = [
        { count: 14, reach: 165, color: outer, turn: 0, width: 9 },
        { count: 9, reach: 100, color: inner, turn: Math.PI / 9, width: 7 },
    ];
    for (const ring of rings) {
        for (let i = 0; i < ring.count; i++) {
            const angle = ring.turn + i * 2 * Math.PI / ring.count + seed[i % seed.length] * 0.05;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const out = 1 - (1 - Math.min(t, 1)) ** 3;
            const r = (30 + ring.reach * out) * scale;
            const length = (ring.reach * 0.55 * (1 - Math.min(t / 0.9, 1)) + 5) * scale;
            const droop = 40 * t * t * scale;
            const fade = t < 1 ? 1 : 1 - (t - 1) / (lastT - 1);
            const hx = cx + cos * r;
            const hy = cy + sin * r + droop;
            glowingStroke(items, hx - cos * length, hy - sin * length - droop * 0.3, hx, hy, ring.width * scale, ring.color, fade, scale);
            if (t > 0.85) {
                const light = (index + i) % 3 === 0 ? 1 : 0.55;
                items.push({ shape: circle(hx, hy, 2 * scale), fill: twinkle, soft: 9 * scale, strength: fade * light });
                items.push({ shape: circle(hx, hy, 1.2 * scale), fill: SHINE, strength: fade * light });
            }
        }
    }
    return items;
}

// soundFile: absolute path played once per show, empty for none.
export function createFireworks(host, { enabled = true, soundFile = "", drawingAhead }) {
    if (!enabled) return { start() {} };

    const log = text => host.log(`[${SCRIPT_NAME}] ${text}`);
    // A sound that cannot play is logged and never stops the show.
    const playSound = safeHandler(SCRIPT_NAME, () => { if (soundFile) host.playSound(soundFile); });
    let screenSize = null;
    // The layer the window was measured on, kept for the first sprite.
    let measureLayer = null;
    // Per rocket: its head and its trail's sparks.
    const rocketLayers = ROCKET_TIMES_S.map(() => ({ head: null, sparks: [] }));
    // Per colour scheme, its film's frames.
    const films = COLOR_SCHEMES.map(() => []);
    // The show playing, or null.
    let show = null;
    let frameTimer = null;
    // The scheme of the last burst, kept from one show to the next.
    let lastScheme = -1;

    // Everything to draw ahead, in order: [items, side, where the layer goes].
    const todo = [];
    for (const rocket of rocketLayers) {
        todo.push(() => [GLOW_HEAD, SPRITE_SIDE, layer => { rocket.head = layer; }]);
        for (let slot = 0; slot < TRAIL_SLOTS; slot++) todo.push(() => [SPARK, SPRITE_SIDE, layer => rocket.sparks.push(layer)]);
    }
    COLOR_SCHEMES.forEach((colors, scheme) => {
        const seed = Array.from({ length: 14 }, () => random(-1, 1));
        for (let index = 0; index < FILM_FRAMES; index++) {
            todo.push(() => [burstFrame(index, colors, seed), FILM_SIDE, layer => films[scheme].push(layer)]);
        }
    });
    let ready = false;

    // The layer being painted, over as many steps as it needs.
    let current = null;
    // First the window size, then each layer, painted for at most STEP_MS a step.
    drawingAhead.add(() => {
        const startMs = host.now().getTime();
        if (!screenSize) {
            measureLayer = createHiddenLayer(host, FIREWORKS_Z_INDEX);
            // A draw without a size gets a canvas the size of the window.
            measureLayer.draw(dc => { screenSize = dc.getSize(); });
            return true;
        }
        if (!current) {
            const [items, side, keep] = todo.shift()();
            current = { side, keep, job: createPaintJob(items, side) };
        }
        if (current.job.run(() => host.now().getTime() - startMs < STEP_MS)) {
            const layer = measureLayer || createHiddenLayer(host, FIREWORKS_Z_INDEX);
            measureLayer = null;
            const { job, side } = current;
            layer.draw(dc => job.drawTo(dc), side, side);
            current.keep(layer);
            current = null;
        }
        ready = todo.length === 0 && !current;
        return !ready;
    });

    function place(layer, x, y, size) {
        const { width, height } = screenSize;
        layer.setScale({ xSpan: size / width, ySpan: size / height });
        layer.setPos(x / width - 0.5, 0.5 - y / height);
        // Only on a change: each assignment costs PinballY a redraw.
        if (layer.alpha !== 1) layer.alpha = 1;
    }

    function hideAll() {
        for (const rocket of rocketLayers) for (const layer of [rocket.head, ...rocket.sparks]) hideLayer(layer);
        for (const frames of films) for (const layer of frames) hideLayer(layer);
    }

    function stop() {
        if (frameTimer !== null) host.clearInterval(frameTimer);
        frameTimer = null;
        if (!show) return;
        hideAll();
        log(`Ended after ${show.schemes.length} bursts, in colour schemes ${show.schemes.join(", ") || "none"}.`);
        show = null;
    }

    // Never the last burst's scheme, nor one whose film still plays.
    function pickScheme() {
        const playing = show.rockets.filter(rocket => rocket.burst && !rocket.over).map(rocket => rocket.burst.scheme);
        const schemes = COLOR_SCHEMES.map((_, scheme) => scheme);
        const notLast = schemes.filter(scheme => scheme !== lastScheme);
        const notPlaying = notLast.filter(scheme => !playing.includes(scheme));
        // Only when every other scheme still plays: a film shared by two bursts beats a frozen show.
        const free = notPlaying.length > 0 ? notPlaying : notLast;
        lastScheme = free[Math.min(free.length - 1, Math.floor(Math.random() * free.length))];
        return lastScheme;
    }

    // fireworks-js 2.10.8's Trace (crashmax-dev, MIT), rewritten: from the
    // bottom edge, speeding up towards a point in the upper half.
    function launchRocket(index, pixelScale, nowMs) {
        const { width, height } = screenSize;
        const x = width * random(0.15, 0.85);
        return {
            layers: rocketLayers[index], pixelScale, x, y: height, sx: x, sy: height,
            targetX: width * random(0.15, 0.85), targetY: height * random(0.12, 0.45),
            speed: TRACE_SPEED * pixelScale, lastTrailMs: nowMs, trail: [], nextSlot: 0, burst: null, over: false,
        };
    }

    // Trail sparks stay where they were left, shrinking and falling; true while one shows.
    function stepTrail(rocket, nowMs) {
        let alive = false;
        for (const piece of rocket.trail) {
            if (piece.done) continue;
            const layer = rocket.layers.sparks[piece.slot];
            const t = (nowMs - piece.startMs) / TRAIL_LIFE_MS;
            if (t >= 1) {
                piece.done = true;
                hideLayer(layer);
                continue;
            }
            alive = true;
            place(layer, piece.x, piece.y + t * t * 16 * rocket.pixelScale, rocket.pixelScale * Math.max(0.05, SPARK_SIZE * (1 - t)) * piece.size);
        }
        return alive;
    }

    // Moves a rocket, then plays its burst; true while either, or its trail, shows.
    function stepRocket(rocket, frameRatio, nowMs) {
        const trailAlive = stepTrail(rocket, nowMs);
        if (!rocket.burst) {
            rocket.speed *= ACCELERATION ** frameRatio;
            const angle = Math.atan2(rocket.targetY - rocket.sy, rocket.targetX - rocket.sx);
            const nx = rocket.x + Math.cos(angle) * rocket.speed * frameRatio;
            const ny = rocket.y + Math.sin(angle) * rocket.speed * frameRatio;
            if (Math.hypot(nx - rocket.sx, ny - rocket.sy) >= Math.hypot(rocket.targetX - rocket.sx, rocket.targetY - rocket.sy)) {
                hideLayer(rocket.layers.head);
                const scheme = pickScheme();
                rocket.burst = { scheme, frames: films[scheme], startMs: nowMs, frame: -1 };
                show.schemes.push(scheme + 1);
                return true;
            }
            rocket.x = nx;
            rocket.y = ny;
            if (nowMs - rocket.lastTrailMs >= TRAIL_EVERY_MS) {
                rocket.lastTrailMs = nowMs;
                const slot = rocket.nextSlot++ % TRAIL_SLOTS;
                const reused = rocket.trail.find(piece => piece.slot === slot && !piece.done);
                if (reused) reused.done = true;
                rocket.trail.push({ slot, x: rocket.x + random(-4, 4) * rocket.pixelScale, y: rocket.y + 6 * rocket.pixelScale, startMs: nowMs, size: random(0.7, 1.2) });
            }
            place(rocket.layers.head, rocket.x, rocket.y, GLOW_HEAD_SIZE * rocket.pixelScale);
            return true;
        }
        const { burst } = rocket;
        const frame = Math.floor((nowMs - burst.startMs) / (1000 / FILM_FPS));
        if (frame === burst.frame) return true;
        if (burst.frame >= 0 && burst.frame < burst.frames.length) hideLayer(burst.frames[burst.frame]);
        burst.frame = frame;
        if (frame >= burst.frames.length) return trailAlive;
        const shown = FILM_SPAN * rocket.pixelScale;
        // The burst's centre sits CENTRE_Y down the film: the film's centre is lower.
        place(burst.frames[frame], rocket.targetX, rocket.targetY + (0.5 - CENTRE_Y) * shown, shown);
        return true;
    }

    // Runs every frame while the show plays, then stops.
    function step() {
        const nowMs = host.now().getTime();
        // Each frame is weighted by its real length, so a slow frame never slows the rockets.
        const elapsedMs = show.lastFrameMs === null ? FRAME_MS : nowMs - show.lastFrameMs;
        show.lastFrameMs = nowMs;
        const pixelScale = screenSize.height / REFERENCE_HEIGHT;
        const frameRatio = elapsedMs / DEFAULT_FRAME_MS;
        const seconds = (nowMs - show.startMs) / 1000;
        while (show.rockets.length < ROCKET_TIMES_S.length && seconds >= ROCKET_TIMES_S[show.rockets.length]) {
            show.rockets.push(launchRocket(show.rockets.length, pixelScale, nowMs));
        }
        let onScreen = 0;
        for (const rocket of show.rockets) {
            if (rocket.over) continue;
            if (stepRocket(rocket, frameRatio, nowMs)) onScreen++;
            else rocket.over = true;
        }
        if (show.rockets.length === ROCKET_TIMES_S.length && onScreen === 0) stop();
    }

    // Does nothing while a show plays: one return to the wheel brings one show.
    function start() {
        if (show) return;
        if (!ready) {
            log("Not started: the Fireworks are still being drawn ahead.");
            return;
        }
        show = { rockets: [], schemes: [], startMs: host.now().getTime(), lastFrameMs: null };
        log(`Started with ${ROCKET_TIMES_S.length} rockets.`);
        frameTimer = host.setInterval(safeHandler(SCRIPT_NAME, step), FRAME_MS);
        playSound();
        // The first rocket leaves with the Level Toast, not a frame later.
        step();
    }

    // Fire when a table launches or attract mode starts: the Fireworks vanish at once.
    for (const eventName of ["prelaunch", "gamestarted", "attractmodestart"]) {
        host.on(eventName, safeHandler(SCRIPT_NAME, stop));
    }

    return { start };
}

let sharedFireworks = null;

export function getFireworks() {
    if (!sharedFireworks) {
        sharedFireworks = createFireworks(createPinballYHost(), {
            enabled: config.fireworks,
            soundFile: config.fireworksSoundFile,
            drawingAhead: getDrawingAhead(),
        });
    }
    return sharedFireworks;
}

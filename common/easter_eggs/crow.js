// ============================================================
// The Crow: an Easter Egg that crosses the wheel once, left to right, with a
// raven's call and a trail of dots, on non-blocking layers. The selected
// table is silent for the length of the call. A launch or attract mode
// removes it at once; a sound already started plays to its end.
// - A missing image means no Crow and no win; a missing sound, a silent one.
// - Its Achievement waits for rules.finish(), once every layer has gone.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { createPlacedLayers } from "../drawing/placed_layers.js";
import { STEAMBALL_COLORS } from "../drawing/steamball_palette.js";
import { EASTER_EGG } from "./easter_egg_rules.js";
import { createEasterEggSound } from "./easter_egg_sound.js";

const SCRIPT_NAME = "Crow";

const IMAGE_FOLDER = "assets\\images\\easter_eggs";
const POSE_FILES = ["crow_wing_up.png", "crow_wing_mid.png", "crow_wing_down.png"];
const DOT_FILE = "crow_dot.png";
const SOUND_FILE = "assets\\sounds\\easter_eggs\\raven_call.wav";

// Over the wheel, under the Drawn Menu (6200) and the toasts (6500).
const DOTS_Z_INDEX = 6100;
const BIRD_Z_INDEX = 6130;

// The images' own sizes.
const BIRD_CANVAS = Object.freeze({ width: 600, height: 413 });
const DOT_CANVAS = 64;

const FRAME_MS = 16;
const FLIGHT_MS = 9000;
const CALL_MS = 10200;
const DOT_HOLD_MS = 3000;
const DOT_FADE_MS = 800;
const POSE_MS = 125;

// Shares of the window: the bird's width, the flight's height from the top,
// a dot's step and size. DOTS_DROP is a share of the bird's height.
const BIRD_WIDTH = 0.2;
const FLIGHT_HEIGHT = 0.33;
const DOT_STEP = 0.07;
const DOT_SIZE = 0.013;
const DOTS_DROP = 0.2;
// Where the tail is, from the left of the bird's canvas, as a share of its width.
const TAIL_SHARE = 0.03;

const UP = 0;
const MID = 1;
const DOWN = 2;
const FLAP = [UP, MID, DOWN, MID];
// It flaps, then glides, in a loop.
const FLAPPING_MS = 2000;
const GLIDE_CYCLE_MS = 3000;
// How far it sinks during a glide, as a share of the window's height.
const GLIDE_SINK = 0.02;

function poseAt(elapsed) {
    if (elapsed % GLIDE_CYCLE_MS >= FLAPPING_MS) return MID;
    return FLAP[Math.floor(elapsed / POSE_MS) % FLAP.length];
}

// How far below its line the bird is, in window heights: climbing while it
// flaps, sinking while it glides.
function dropAt(elapsed) {
    const time = elapsed % GLIDE_CYCLE_MS;
    if (time < FLAPPING_MS) return GLIDE_SINK * (1 - time / FLAPPING_MS);
    return GLIDE_SINK * (time - FLAPPING_MS) / (GLIDE_CYCLE_MS - FLAPPING_MS);
}

// rules: the Easter Egg rules; quietWheel: what silences the selected table.
export function createCrow(host, { rules, quietWheel }) {
    const projectFolder = host.getProjectFolder();
    const imageOf = file => `${projectFolder}\\${IMAGE_FOLDER}\\${file}`;
    const poseImages = POSE_FILES.map(imageOf);
    const dotImage = imageOf(DOT_FILE);
    const call = createEasterEggSound(host, SCRIPT_NAME, SOUND_FILE);
    const nowMs = () => host.now().getTime();
    const log = message => host.log(`[${SCRIPT_NAME}] ${message}`);

    // The flight on screen, null otherwise.
    let running = null;

    function canPlay() {
        const missing = [...poseImages, dotImage].filter(path => !host.files.isImageReadable(path));
        if (missing.length > 0) log(`Missing or unreadable, no Crow: ${missing.join(", ")}`);
        return missing.length === 0;
    }

    // Every layer goes at once; the call, once started, plays to its end.
    function end(run) {
        if (run.timer !== null) host.clearInterval(run.timer);
        for (const layer of run.layers) run.placed.remove(layer);
        quietWheel.release(SCRIPT_NAME, { atOnce: true });
        running = null;
        rules.finish(EASTER_EGG.CROW);
    }

    function birdRect(run, elapsed) {
        const { size, birdWidth, birdHeight } = run;
        return {
            x: -birdWidth + (elapsed / FLIGHT_MS) * (size.width + birdWidth),
            y: (FLIGHT_HEIGHT + dropAt(elapsed)) * size.height - birdHeight / 2,
            w: birdWidth,
            h: birdHeight,
        };
    }

    function hideBird(run) {
        if (run.shownPose === null) return;
        run.placed.hide(run.poses[run.shownPose]);
        run.shownPose = null;
    }

    function moveBird(run, elapsed) {
        const rect = birdRect(run, elapsed);
        const pose = poseAt(elapsed);
        run.placed.place(run.poses[pose], rect);
        if (pose !== run.shownPose) {
            run.placed.show(run.poses[pose]);
            run.poses[pose].alpha = 1;
            hideBird(run);
            run.shownPose = pose;
        }
        return rect;
    }

    // Each dot appears when the tail passes it, holds, then fades on its own.
    function updateDots(run, elapsed, tail) {
        for (const dot of run.dots) {
            if (dot.shownAt === null) {
                if (tail <= dot.x) continue;
                dot.shownAt = elapsed;
                run.placed.show(dot.layer);
                dot.layer.alpha = 1;
            }
            if (dot.isGone || elapsed - dot.shownAt < DOT_HOLD_MS) continue;
            const alpha = 1 - (elapsed - dot.shownAt - DOT_HOLD_MS) / DOT_FADE_MS;
            if (alpha > 0) {
                dot.layer.alpha = alpha;
            } else {
                run.placed.hide(dot.layer);
                dot.isGone = true;
            }
        }
    }

    function frame(run) {
        const elapsed = nowMs() - run.startMs;
        // Safe to repeat: the quiet wheel ignores a holder it no longer has.
        if (elapsed >= CALL_MS) quietWheel.release(SCRIPT_NAME, { atOnce: true });
        if (elapsed >= FLIGHT_MS) {
            hideBird(run);
            updateDots(run, elapsed, Infinity);
            if (run.dots.every(dot => dot.isGone)) end(run);
            return;
        }
        const rect = moveBird(run, elapsed);
        updateDots(run, elapsed, rect.x + rect.w * TAIL_SHARE);
    }

    function newImageLayer(run, zIndex, path, canvasWidth, canvasHeight, rect) {
        const layer = run.placed.create(zIndex);
        run.layers.push(layer);
        layer.clear(STEAMBALL_COLORS.transparent);
        run.placed.place(layer, rect);
        layer.draw(dc => dc.drawImage(path, 0, 0, canvasWidth, canvasHeight), canvasWidth, canvasHeight);
        return layer;
    }

    // A draw without a size gets a canvas the size of the window.
    function measureWindow(placed) {
        const layer = placed.create(DOTS_Z_INDEX);
        let size = null;
        layer.draw(dc => { size = dc.getSize(); });
        placed.remove(layer);
        placed.measure(size);
        return size;
    }

    function prepare(run) {
        run.size = measureWindow(run.placed);
        const { width, height } = run.size;
        run.birdWidth = width * BIRD_WIDTH;
        run.birdHeight = run.birdWidth * BIRD_CANVAS.height / BIRD_CANVAS.width;
        const rect = birdRect(run, 0);
        run.poses = poseImages.map((path, index) => newImageLayer(run, BIRD_Z_INDEX + index, path, BIRD_CANVAS.width, BIRD_CANVAS.height, rect));
        const dotSize = width * DOT_SIZE;
        const y = FLIGHT_HEIGHT * height + DOTS_DROP * run.birdHeight - dotSize / 2;
        for (let index = 0; (index + 0.5) * DOT_STEP < 1; index++) {
            const x = (index + 0.5) * DOT_STEP * width;
            const layer = newImageLayer(run, DOTS_Z_INDEX + index, dotImage, DOT_CANVAS, DOT_CANVAS, { x: x - dotSize / 2, y, w: dotSize, h: dotSize });
            run.dots.push({ x, layer, shownAt: null, isGone: false });
        }
    }

    function fly() {
        // First of all: the table is silent when the bird appears.
        quietWheel.hold(SCRIPT_NAME, { ceiling: 0 });
        call.load();
        const run = {
            placed: createPlacedLayers(host), layers: [], poses: [], dots: [], shownPose: null, timer: null, startMs: 0, size: null, birdWidth: 0, birdHeight: 0,
        };
        running = run;
        try {
            prepare(run);
        } catch (error) {
            // Never left holding the table silent.
            end(run);
            throw error;
        }
        call.play();
        run.startMs = nowMs();
        run.timer = host.setInterval(safeHandler(SCRIPT_NAME, () => {
            try {
                frame(run);
            } catch (error) {
                // Logged once: the timer goes with the flight.
                end(run);
                throw error;
            }
        }), FRAME_MS);
    }

    // Fires at a launch or when the cabinet sits idle: nothing lingers over them.
    const interrupt = safeHandler(SCRIPT_NAME, () => {
        if (running) end(running);
    });
    for (const type of ["prelaunch", "attractmodestart"]) host.on(type, interrupt);

    return {
        // Draws the Crow, and flies it if it wins.
        tryFly() {
            if (rules.tryWin(EASTER_EGG.CROW, { canPlay })) fly();
        },
    };
}

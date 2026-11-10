// ============================================================
// The Maneki-neko: an Easter Egg drawn once per start, at a wheel move picked
// between the 5th and the 20th. A cat pops out of the left or right edge with
// a horn and goes back, on a non-blocking layer; the wheel and the table's
// sound carry on. A launch or attract mode removes it at once.
// - Only "gameselect" in wheel mode counts: the pack's own moves never fire it.
// - A missing image means no cat and no win; a missing sound, a silent one.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { createPlacedLayers } from "../drawing/placed_layers.js";
import { STEAMBALL_COLORS } from "../drawing/steamball_palette.js";
import { EASTER_EGG } from "./easter_egg_rules.js";
import { createEasterEggSound } from "./easter_egg_sound.js";

const SCRIPT_NAME = "ManekiNeko";

const IMAGE_FOLDER = "assets\\images\\easter_eggs";
const SOUND_FILE = "assets\\sounds\\easter_eggs\\horn.wav";

// Over the wheel, under the Drawn Menu (6200) and the toasts (6500).
const CAT_Z_INDEX = 6130;
// The images' own size.
const CANVAS = 1000;

const FIRST_MOVE = 5;
const LAST_MOVE = 20;

const FRAME_MS = 16;
const OUT_MS = 200;
const VISIBLE_MS = 2000;
const BACK_MS = 200;

// The image's side, as a share of the window's width.
const SIDE = 0.14;
// The whole image stays inside the central 60 % of its edge.
const EDGE_MARGIN = 0.2;

// A layer cannot rotate: one image per edge, the flat cut against that edge.
const EDGES = Object.freeze([
    { file: "maneki_left.png", outX: () => 0, away: -1 },
    { file: "maneki_right.png", outX: (width, side) => width - side, away: 1 },
]);

const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;

// 0: fully behind the edge, 1: fully out.
function outShare(elapsed) {
    if (elapsed < OUT_MS) return easeOut(elapsed / OUT_MS);
    if (elapsed < OUT_MS + VISIBLE_MS) return 1;
    return 1 - easeIn(Math.min(1, (elapsed - OUT_MS - VISIBLE_MS) / BACK_MS));
}

// rules: the Easter Egg rules.
export function createManekiNeko(host, { rules }) {
    const projectFolder = host.getProjectFolder();
    const imageOf = edge => `${projectFolder}\\${IMAGE_FOLDER}\\${edge.file}`;
    const horn = createEasterEggSound(host, SCRIPT_NAME, SOUND_FILE);
    const nowMs = () => host.now().getTime();
    const log = message => host.log(`[${SCRIPT_NAME}] ${message}`);

    const pickedMove = FIRST_MOVE + Math.floor(host.random() * (LAST_MOVE - FIRST_MOVE + 1));
    let moves = 0;
    // The cat on screen, null otherwise.
    let running = null;

    function canPlay() {
        const missing = EDGES.map(imageOf).filter(path => !host.files.isImageReadable(path));
        if (missing.length > 0) log(`Missing or unreadable, no cat: ${missing.join(", ")}`);
        return missing.length === 0;
    }

    function end(run) {
        if (run.timer !== null) host.clearInterval(run.timer);
        if (run.layer !== null) run.placed.remove(run.layer);
        running = null;
        rules.finish(EASTER_EGG.MANEKI_NEKO);
    }

    function placeCat(run, share) {
        const hidden = run.side * (1 - share);
        run.placed.place(run.layer, { x: run.x + run.edge.away * hidden, y: run.y, w: run.side, h: run.side });
    }

    function frame(run) {
        const elapsed = nowMs() - run.startMs;
        if (elapsed >= OUT_MS + VISIBLE_MS + BACK_MS) end(run);
        else placeCat(run, outShare(elapsed));
    }

    function prepare(run) {
        const { width, height } = run.placed.measureWindow(CAT_Z_INDEX);
        run.side = width * SIDE;
        run.edge = EDGES[host.random() < 0.5 ? 0 : 1];
        run.x = run.edge.outX(width, run.side);
        const room = Math.max(0, height * (1 - 2 * EDGE_MARGIN) - run.side);
        run.y = height * EDGE_MARGIN + host.random() * room;
        run.layer = run.placed.create(CAT_Z_INDEX);
        run.layer.clear(STEAMBALL_COLORS.transparent);
        run.layer.draw(dc => dc.drawImage(imageOf(run.edge), 0, 0, CANVAS, CANVAS), CANVAS, CANVAS);
        placeCat(run, 0);
        run.placed.show(run.layer);
        run.layer.alpha = 1;
    }

    function popOut() {
        horn.load();
        const run = { placed: createPlacedLayers(host), layer: null, timer: null, startMs: 0, edge: null, side: 0, x: 0, y: 0 };
        running = run;
        try {
            prepare(run);
        } catch (error) {
            end(run);
            throw error;
        }
        horn.play();
        run.startMs = nowMs();
        run.timer = host.setInterval(safeHandler(SCRIPT_NAME, () => {
            try {
                frame(run);
            } catch (error) {
                // Logged once: the timer goes with the cat.
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
        // A "gameselect": counts the player's wheel moves and draws at the picked one.
        onGameSelect() {
            if (host.getUIMode() !== "wheel") return;
            moves++;
            if (moves === pickedMove && rules.tryWin(EASTER_EGG.MANEKI_NEKO, { canPlay })) popOut();
        },
    };
}

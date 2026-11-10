// ============================================================
// The Menu Glitch: an Easter Egg played on the main menu as it opens. Normal
// for 0.4 s, then torn into strips for 3 s with corrupted entries, the
// Profile's name backwards among them, every button ignored. The selected
// table is silent from the opening and climbs back after the effect.
// - Everything that blocks (the strips, the volume drop) happens inside "menuopen", before the menu shows.
// - The menu is given back in every case; its Achievement waits for rules.finish().
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { createPlacedLayers } from "../drawing/placed_layers.js";
import { EASTER_EGG } from "./easter_egg_rules.js";
import { createEasterEggSound } from "./easter_egg_sound.js";
import { drawMenuCopy } from "./menu_glitch_painter.js";

const SCRIPT_NAME = "MenuGlitch";

const SOUND_FILE = "assets\\sounds\\easter_eggs\\distorted_echo.wav";
// Above the Drawn Menu's glass (6205), under the toasts (6500).
const FIRST_Z_INDEX = 6210;
const TRANSPARENT = 0x00000000;

const LEAD_IN_MS = 400;
const EFFECT_MS = 3000;
// The glitch changes by jumps, not smoothly.
const STEP_MS = 70;
const FRAME_MS = 33;
// The sound swells slowly: started ahead of the glitch.
const SOUND_LEAD_MS = 380;
// Each step is an update(), which flickers the wheel and the menu: wanted here.
const CLIMB = Object.freeze({ durationMs: 2500, steps: 12, exponent: 2 });

const STRIP_COUNT = 9;
const BAND_COUNT = 3;
const BAND_CANVAS = Object.freeze({ width: 96, height: 6 });
const FILL_CANVAS = 8;
const BLACK = 0xFF000000;
const WILD_COLORS = [0xFFFF2040, 0xFF20E0FF, 0xFF30FF70, 0xFFFF40E0, 0xFFFFF040, 0xFFFFFFFF];
const BAND_COLORS = [0xD0FF2040, 0xD020E0FF, 0xD030FF70, 0xD0FF40E0, 0xE0FFFFFF, 0xE0000000];
// Written as escapes: a non-ASCII character would need a BOM in this file.
const GLITCH_CHARS = "\u{2592}\u{2591}\u{2593}\u{2588}#%&@$?!/\\<>";

// Up fast, then full, then down at the end.
function envelope(progress) {
    if (progress < 0.08) return progress / 0.08;
    if (progress > 0.88) return (1 - progress) / 0.12;
    return 1;
}

// rules: the Easter Egg rules; quietWheel: what silences the selected table;
// menus: the Drawn Menus; shownProfileName(): the active Profile's name as shown.
export function createMenuGlitch(host, { rules, quietWheel, menus, shownProfileName }) {
    const sound = createEasterEggSound(host, SCRIPT_NAME, SOUND_FILE);
    const nowMs = () => host.now().getTime();
    const chance = probability => host.random() < probability;
    const between = (low, high) => low + host.random() * (high - low);
    const pick = list => list[Math.floor(host.random() * list.length)];

    // The effect playing, null otherwise.
    let running = null;

    const scramble = str => [...str].map(char => (char !== " " && chance(0.5) ? pick(GLITCH_CHARS) : char)).join("");

    function pickCorrupted(entries) {
        const pool = [...entries];
        const picked = [];
        const count = Math.min(pool.length, Math.max(2, Math.round(entries.length / 4)));
        while (picked.length < count) picked.push(pool.splice(Math.floor(host.random() * pool.length), 1)[0]);
        return picked;
    }

    function newLayer(run) {
        const layer = run.placed.create(FIRST_Z_INDEX + run.layers.length);
        layer.clear(TRANSPARENT);
        run.layers.push(layer);
        return layer;
    }

    // One version of the strip's canvas; version 0 shows the name backwards.
    function newStripVersion(run, strip, version, corrupted, reversedName) {
        const { view } = run.borrowed;
        const layer = newLayer(run);
        const box = { x: strip.x, y: strip.y, width: strip.w, height: strip.h };
        layer.draw(dc => drawMenuCopy(host, dc, box, view, {
            textOf(row, index) {
                if (!corrupted.includes(index)) return row.title;
                return index === corrupted[0] && version === 0 ? reversedName : scramble(row.title);
            },
            colorOf: (row, index) => (corrupted.includes(index) && chance(0.5) ? pick(WILD_COLORS) : null),
        }), strip.w, strip.h);
        return layer;
    }

    // Only the strips holding a corrupted entry flicker between two versions.
    function prepareStrips(run) {
        const { model, geometry, scroll } = run.borrowed.view;
        // Only rows in view: on a row scrolled away, the name would never show.
        const isInView = index => {
            const top = geometry.rowTops[index] - scroll;
            return top >= -0.5 && top + geometry.rowHeights[index] <= geometry.areaHeight + 0.5;
        };
        const corrupted = pickCorrupted(model.entries.filter(isInView));
        const reversedName = [...shownProfileName()].reverse().join("").toLocaleUpperCase();
        const listTop = geometry.contentTop + geometry.areaOffset;
        const holdsCorrupted = strip => corrupted.some(index => {
            const top = listTop + geometry.rowTops[index] - scroll;
            return top < strip.y + strip.h && top + geometry.rowHeights[index] > strip.y;
        });
        const { panel } = geometry;
        const edge = index => Math.round(panel.y + index * panel.height / STRIP_COUNT);
        for (let index = 0; index < STRIP_COUNT; index++) {
            const strip = { x: Math.round(panel.x), y: edge(index), w: Math.round(panel.width), h: edge(index + 1) - edge(index) };
            const versions = [newStripVersion(run, strip, 0, corrupted, reversedName)];
            if (holdsCorrupted(strip)) versions.push(newStripVersion(run, strip, 1, corrupted, reversedName));
            run.strips.push({ box: strip, versions });
        }
    }

    function prepare(run) {
        run.placed.measure(run.borrowed.view.windowSize);
        prepareStrips(run);
        run.dim = newLayer(run);
        run.dim.draw(dc => dc.fillRect(0, 0, FILL_CANVAS, FILL_CANVAS, BLACK), FILL_CANVAS, FILL_CANVAS);
        for (let index = 0; index < BAND_COUNT; index++) {
            const band = newLayer(run);
            band.draw(dc => {
                for (let x = 0; x < BAND_CANVAS.width;) {
                    const blockWidth = Math.ceil(between(2, 18));
                    dc.fillRect(x, 0, blockWidth, BAND_CANVAS.height, pick(BAND_COLORS));
                    x += blockWidth;
                }
            }, BAND_CANVAS.width, BAND_CANVAS.height);
            run.bands.push(band);
        }
    }

    // A layer at this alpha, reduced to a point when there is nothing to see.
    function setShown(run, layer, alpha) {
        if (alpha <= 0) {
            run.placed.hide(layer);
            return;
        }
        run.placed.show(layer);
        layer.alpha = alpha;
    }

    function stepStrips(run, strength) {
        const { k } = run.borrowed.view.geometry;
        const shove = chance(0.25) ? between(-130, 130) * k * strength : 0;
        for (const { box, versions } of run.strips) {
            const dx = chance(0.35) ? shove : shove + between(-110, 110) * k * strength;
            const dy = chance(0.12) ? pick([-1, 1]) * box.h * strength : 0;
            const shown = chance(0.08) ? null : pick(versions);
            for (const layer of versions) {
                if (layer === shown) run.placed.place(layer, { ...box, x: box.x + dx, y: box.y + dy });
                setShown(run, layer, layer === shown ? 1 : 0);
            }
        }
    }

    function stepBands(run, strength) {
        const { windowSize, geometry } = run.borrowed.view;
        for (const band of run.bands) {
            if (!chance(0.65)) {
                setShown(run, band, 0);
                continue;
            }
            run.placed.place(band, { x: 0, y: between(0, windowSize.height), w: windowSize.width, h: between(4, 46) * geometry.k }, { stretched: true });
            setShown(run, band, strength * between(0.45, 1));
        }
    }

    function stepEffect(run, progress) {
        const strength = envelope(progress);
        stepStrips(run, strength);
        setShown(run, run.dim, chance(0.08) ? 0.9 : strength * between(0.15, 0.5));
        stepBands(run, strength);
    }

    // completed: the table climbs back; otherwise it is back at once. The
    // menu first: nothing after it can keep it hidden.
    function end(run, completed) {
        if (running !== run) return;
        running = null;
        for (const timer of [run.soundTimer, run.leadInTimer]) host.clearTimeout(timer);
        if (run.frameTimer !== null) host.clearInterval(run.frameTimer);
        run.borrowed.giveBack();
        quietWheel.release(SCRIPT_NAME, completed ? { climb: CLIMB } : { atOnce: true });
        rules.finish(EASTER_EGG.MENU_GLITCH);
        for (const layer of run.layers) run.placed.remove(layer);
    }

    function guarded(run, step) {
        return safeHandler(SCRIPT_NAME, () => {
            try {
                step();
            } catch (error) {
                // Logged once: the timers go with the effect.
                end(run, false);
                throw error;
            }
        });
    }

    function frame(run) {
        const elapsed = nowMs() - run.startMs;
        if (elapsed >= EFFECT_MS) {
            end(run, true);
            return;
        }
        const step = Math.floor(elapsed / STEP_MS);
        if (step === run.lastStep) return;
        run.lastStep = step;
        stepEffect(run, elapsed / EFFECT_MS);
    }

    function begin(run) {
        run.borrowed.hideMenu();
        run.startMs = nowMs();
        run.frameTimer = host.setInterval(guarded(run, () => frame(run)), FRAME_MS);
        frame(run);
    }

    function play() {
        sound.load();
        const run = {
            placed: createPlacedLayers(host), layers: [], strips: [], bands: [], dim: null, borrowed: null,
            soundTimer: null, leadInTimer: null, frameTimer: null, startMs: 0, lastStep: -1,
        };
        running = run;
        run.borrowed = menus.borrow({ onLost: () => end(run, false) });
        guarded(run, () => {
            prepare(run);
            quietWheel.hold(SCRIPT_NAME, { ceiling: 0 });
            run.soundTimer = host.setTimeout(sound.play, LEAD_IN_MS - SOUND_LEAD_MS);
            run.leadInTimer = host.setTimeout(guarded(run, () => begin(run)), LEAD_IN_MS);
        })();
    }

    return {
        // At the "menuopen" of the main menu: a menu left native is no draw.
        tryPlay() {
            if (menus.isOpen() && rules.tryWin(EASTER_EGG.MENU_GLITCH, { over: menus })) play();
        },
    };
}

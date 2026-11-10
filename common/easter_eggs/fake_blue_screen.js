// ============================================================
// The Fake Blue Screen: an Easter Egg drawn back on the wheel after a table
// for which "gamestarted" fired (no capture), once the High Scores' read after
// the game has answered. The table falls silent, then 200 ms later a Windows
// 9x style blue screen in the player's language shows for 10 s with its sound.
// - Every button and attract mode go through the Drawn Screen controls; it always ends by itself.
// - The table's sound comes back at the cut, just before the layers go.
// - A draw at a given size starts from an empty canvas: the blue is painted inside it.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { createPlacedLayers } from "../drawing/placed_layers.js";
import { EASTER_EGG } from "./easter_egg_rules.js";
import { createEasterEggSound } from "./easter_egg_sound.js";

const SCRIPT_NAME = "FakeBlueScreen";

const SOUND_FILE = "assets\\sounds\\easter_eggs\\blue_screen.wav";
// Over everything of the pack, the Rocket (7500 to 7599) included.
const SCREEN_Z_INDEX = 7600;
const BAR_Z_INDEX = 7601;

const BLUE = 0xFF0000AA;
const GREY = 0xFFAAAAAA;
const WHITE = 0xFFFFFFFF;
const FONT = "Lucida Console";
const FONT_WEIGHT = 400;

// Between the table's cut and the screen: the table is silent first.
const SILENCE_LEAD_MS = 200;
const SCREEN_MS = 10000;
const JOLT_MIN_MS = 150;
const JOLT_MAX_MS = 800;
const JOLT_MAX_CELLS = 4;
const BAR_CELLS = 28;
const RUNNER_CELLS = 5;

// The text block's lines, and its share of the window's width, which sets the type's size.
const WRAP_COLUMNS = 60;
const BLOCK_WIDTH_SHARE = 0.66;
// On a very wide window the height limits the type: the rows (and the bar's) fill this share of it.
const BLOCK_HEIGHT_SHARE = 0.94;
const TRIAL_SIZE = 100;
const SAMPLE = "0".repeat(20);
const MEASURE_WIDTH = 100000;

function wrap(text, columns) {
    const lines = [];
    let line = "";
    for (const word of text.split(" ")) {
        const candidate = line === "" ? word : `${line} ${word}`;
        if (candidate.length > columns && line !== "") {
            lines.push(line);
            line = word;
        } else {
            line = candidate;
        }
    }
    lines.push(line);
    return lines;
}

// Each row is { text, centred, title }; an empty text is a blank line.
function rowsOf(texts) {
    const blank = { text: "" };
    const paragraph = text => wrap(text, WRAP_COLUMNS).map(line => ({ text: line }));
    return [
        { text: texts.title, centred: true, title: true },
        blank,
        ...paragraph(texts.intro),
        blank,
        ...paragraph(texts.enter),
        blank,
        ...paragraph(texts.restart),
        blank,
        { text: `${texts.errorLabel}${texts.errorCode}`, centred: true },
        blank,
        { text: texts.restarting, centred: true },
    ];
}

// controls: the Drawn Screen controls; rules: the Easter Egg rules;
// quietWheel: what silences the selected table; highScores: the High Score
// store, null with High Scores off; texts(): { title, intro, enter, restart, errorLabel, errorCode, restarting }.
export function createFakeBlueScreen(host, { controls, rules, quietWheel, highScores, texts }) {
    const screen = controls.register(SCRIPT_NAME);
    const sound = createEasterEggSound(host, SCRIPT_NAME, SOUND_FILE);
    const nowMs = () => host.now().getTime();
    const capture = host.getBuiltInCommand("CaptureGo");

    // The screen under way, null otherwise.
    let running = null;
    // Set at "gamestarted" for a table that really runs, spent at "postlaunch".
    let hasTableRun = false;
    // The return to the wheel waiting for its draw, null otherwise.
    let pendingReturn = null;

    function charWidthAt(size) {
        const styled = host.createStyledText({ textStyle: { font: FONT, size, weight: FONT_WEIGHT } });
        styled.add(SAMPLE);
        return styled.measure(MEASURE_WIDTH).width / SAMPLE.length;
    }

    // The type's size that makes one character targetWidth wide, from a measure:
    // the point-to-pixel ratio depends on the screen.
    function fitFont(targetWidth) {
        const trialWidth = charWidthAt(TRIAL_SIZE);
        if (!(trialWidth > 0)) throw new Error(`${FONT} cannot be measured.`);
        const size = Math.max(1, Math.floor(TRIAL_SIZE * targetWidth / trialWidth));
        return { size, charWidth: charWidthAt(size) };
    }

    // Where the rows and the bar go on the window: { fontSize, charWidth, rowHeight, left, top, barTop }.
    function layoutOf(size, rowCount) {
        // The bar takes one more row under the text.
        const rowLimit = size.height * BLOCK_HEIGHT_SHARE / (rowCount + 1);
        const fit = fitFont(Math.min(size.width * BLOCK_WIDTH_SHARE / WRAP_COLUMNS, rowLimit / 2));
        const rowHeight = Math.min(Math.round(fit.charWidth * 2), Math.floor(rowLimit));
        const top = Math.round((size.height - (rowCount + 1) * rowHeight) / 2);
        return {
            fontSize: fit.size, charWidth: fit.charWidth, rowHeight, top, barTop: top + rowCount * rowHeight,
            left: Math.round((size.width - WRAP_COLUMNS * fit.charWidth) / 2),
        };
    }

    function drawRow(dc, layout, row, y) {
        const { charWidth, rowHeight } = layout;
        const offset = row.centred ? Math.floor((WRAP_COLUMNS - row.text.length) / 2) : 0;
        const x = layout.left + offset * charWidth;
        if (row.title) dc.fillRect(x - charWidth, y, (row.text.length + 2) * charWidth, rowHeight, GREY);
        const styled = host.createStyledText({ textStyle: { font: FONT, size: layout.fontSize, weight: FONT_WEIGHT, color: row.title ? BLUE : WHITE } });
        styled.add(row.text);
        styled.draw(dc, { x, y, width: (row.text.length + 1) * charWidth, height: rowHeight });
    }

    function drawScreen(run) {
        const { width, height } = run.size;
        run.screen.draw(dc => {
            dc.fillRect(0, 0, width, height, BLUE);
            run.rows.forEach((row, index) => {
                if (row.text !== "") drawRow(dc, run.layout, row, run.layout.top + index * run.layout.rowHeight);
            });
        }, width, height);
    }

    function drawBar(run) {
        const { charWidth, rowHeight } = run.layout;
        const canvasWidth = Math.ceil(BAR_CELLS * charWidth);
        const gap = Math.max(1, Math.round(charWidth * 0.12));
        const blockHeight = Math.round(rowHeight * 0.7);
        const blockTop = Math.round((rowHeight - blockHeight) / 2);
        run.bar.draw(dc => {
            dc.fillRect(0, 0, canvasWidth, rowHeight, BLUE);
            for (let block = 0; block < RUNNER_CELLS; block++) {
                const cell = (run.barPosition + block) % BAR_CELLS;
                dc.fillRect(Math.round(cell * charWidth) + gap, blockTop, Math.ceil(charWidth) - 2 * gap, blockHeight, WHITE);
            }
        }, canvasWidth, rowHeight);
    }

    function prepare(run) {
        run.size = run.placed.measureWindow(SCREEN_Z_INDEX);
        run.layout = layoutOf(run.size, run.rows.length);
        run.screen = run.placed.create(SCREEN_Z_INDEX);
        run.bar = run.placed.create(BAR_Z_INDEX);
        drawScreen(run);
        const { charWidth, rowHeight, barTop } = run.layout;
        const barWidth = Math.ceil(BAR_CELLS * charWidth);
        run.placed.place(run.bar, { x: (run.size.width - barWidth) / 2, y: barTop, w: barWidth, h: rowHeight });
        drawBar(run);
    }

    const joltDelay = () => JOLT_MIN_MS + host.random() * (JOLT_MAX_MS - JOLT_MIN_MS);

    // The running blocks jump 1 to 4 cells, at uneven moments.
    function jolt(run) {
        run.barPosition = (run.barPosition + 1 + Math.floor(host.random() * JOLT_MAX_CELLS)) % BAR_CELLS;
        drawBar(run);
        run.joltTimer = host.setTimeout(guarded(run, () => jolt(run)), joltDelay());
    }

    function reveal(run) {
        // First of all, so that a failure below still ends the screen.
        run.endTimer = host.setTimeout(guarded(run, () => end(run)), SCREEN_MS);
        run.placed.show(run.screen);
        run.screen.alpha = 1;
        run.placed.show(run.bar);
        run.bar.alpha = 1;
        sound.play();
        run.joltTimer = host.setTimeout(guarded(run, () => jolt(run)), joltDelay());
    }

    // The table's sound first, its update()'s flicker hidden under the blue;
    // then the layers go with the buttons, through the opening's close().
    function end(run) {
        if (running !== run) return;
        for (const timer of [run.revealTimer, run.endTimer, run.joltTimer]) host.clearTimeout(timer);
        quietWheel.release(SCRIPT_NAME, { atOnce: true });
        run.opening.close();
    }

    function finish(run) {
        if (running !== run) return;
        running = null;
        // First: a layer that cannot be removed must not keep its Achievement away.
        rules.finish(EASTER_EGG.FAKE_BLUE_SCREEN);
        for (const layer of [run.screen, run.bar]) {
            if (layer !== null) run.placed.remove(layer);
        }
    }

    // A failure is logged once, and gives the wheel back.
    function guarded(run, step) {
        return safeHandler(SCRIPT_NAME, () => {
            if (running !== run) return;
            try {
                step();
            } catch (error) {
                end(run);
                throw error;
            }
        });
    }

    function play() {
        const run = {
            placed: createPlacedLayers(host), rows: rowsOf(texts()), opening: null, size: null, layout: null, screen: null, bar: null, barPosition: 1,
            revealTimer: null, endTimer: null, joltTimer: null,
        };
        running = run;
        const ignore = () => {};
        run.opening = screen.open({ onMove: ignore, onChoose: ignore, onExit: ignore, close: () => finish(run) }, { holdsAttractMode: true });
        run.opening.ready();
        guarded(run, () => {
            // The table first: the drawing below happens while it falls silent.
            quietWheel.hold(SCRIPT_NAME, { ceiling: 0 });
            const startMs = nowMs();
            prepare(run);
            run.revealTimer = host.setTimeout(guarded(run, () => reveal(run)), Math.max(0, SILENCE_LEAD_MS - (nowMs() - startMs)));
        })();
    }

    function draw() {
        pendingReturn = null;
        if (!running && rules.tryWin(EASTER_EGG.FAKE_BLUE_SCREEN)) play();
    }

    // Once the read after the game has answered: now if the wheel is back, else at its return.
    function onPlaysSettled(thisReturn) {
        if (pendingReturn !== thisReturn) return;
        if (host.getUIMode() === "wheel") draw();
        else thisReturn.isSettled = true;
    }

    // Fires as a table starts running; a capture is never followed.
    host.on("gamestarted", safeHandler(SCRIPT_NAME, ev => {
        hasTableRun = ev.command !== capture && !host.getFullUIMode().capture;
    }));

    // Fires a new launch: whatever the last return waited for is over.
    host.on("prelaunch", safeHandler(SCRIPT_NAME, () => {
        pendingReturn = null;
        hasTableRun = false;
    }));

    // Fires after every launch, a failed one included. A tick later, so the
    // High Scores' read after the game has begun whatever the listeners' order.
    host.on("postlaunch", safeHandler(SCRIPT_NAME, () => {
        if (!hasTableRun) return;
        hasTableRun = false;
        const thisReturn = { isSettled: false };
        pendingReturn = thisReturn;
        host.setTimeout(safeHandler(SCRIPT_NAME, () => {
            const settled = safeHandler(SCRIPT_NAME, () => onPlaysSettled(thisReturn));
            if (highScores) highScores.whenPlaysSettled(settled);
            else settled();
        }), 0);
    }));

    // Fires back on the wheel from a game, a menu or attract mode.
    host.on("wheelmode", safeHandler(SCRIPT_NAME, () => {
        if (pendingReturn && pendingReturn.isSettled) draw();
    }));

    // For the wheel dialog queue: nothing shows over the blue screen.
    return { screen };
}

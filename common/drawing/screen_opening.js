// ============================================================
// Screen opening: the shared opening of a screen the player waits for
// (docs/adr/0014). Dims the wheel at once under a veil, runs the screen's
// steps in the drawing ahead's foreground queue, turns the Loader over the
// veil if they last more than 150 ms, fades the screen in whole and times
// the reading and drawing for the one line logged per opening. Listens to no event, writes nothing.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { DIMMED_WHEEL } from "./steamball_drawing.js";
import { createLoader } from "./loader.js";

// A screen ready sooner shows no Loader: no flash of comet on a fast cabinet.
const LOADER_DELAY_MS = 150;
const FADE_MS = 220;
export const FRAME_MS = 16;

// setOpacity(opacity) every frame, from 0 to 1, then onFaded(); timed on
// the clock, since Windows timers fire late. Returns a way to stop it.
export function fadeIn(host, scriptName, setOpacity, onFaded = () => {}) {
    const startMs = host.now().getTime();
    let timer = null;
    const stop = () => {
        host.clearInterval(timer);
        timer = null;
    };
    timer = host.setInterval(safeHandler(scriptName, () => {
        const opacity = Math.min(1, (host.now().getTime() - startMs) / FADE_MS);
        setOpacity(opacity);
        if (opacity < 1) return;
        stop();
        onFaded();
    }), FRAME_MS);
    return stop;
}

// The reading time split by reader, largest first, the rest of readMs as
// "other". Each reader runs within a timed read step on the same
// whole-millisecond clock, so the readers never sum past readMs.
function readSplitText(readMs, { profileCount, msByReader }) {
    const readersMs = Object.values(msByReader).reduce((sum, ms) => sum + ms, 0);
    const shares = [...Object.entries(msByReader), ["other", Math.max(0, readMs - readersMs)]]
        .sort((a, b) => b[1] - a[1])
        .map(([reader, ms]) => `${reader} ${ms} ms`);
    return ` (${profileCount} Profile${profileCount === 1 ? "" : "s"}: ${shares.join(", ")})`;
}

// The line every slow screen logs once open; profileName: whose screen it
// is (null: nobody's), isReadOnly: another Profile's, to look at only;
// readSplit: { profileCount, msByReader } (null: the reading time alone).
export function openingTimeLine(scriptName, { totalMs, readMs, drawnMs, profileName = null, isReadOnly = false, readSplit = null }) {
    const whose = profileName === null ? "" : `${profileName}'s${isReadOnly ? ", read only," : ""} `;
    const split = readSplit === null ? "" : readSplitText(readMs, readSplit);
    return `[${scriptName}] Opened ${whose}in ${totalMs} ms: read in ${readMs} ms${split}, drawn in ${drawnMs} ms.`;
}

// zIndex: the veil's, just under the screen; the Loader sits right above
// it. drawingAhead: the shared drawing ahead (common/core/drawing_ahead.js).
export function createScreenOpening(host, scriptName, { zIndex, drawingAhead }) {
    const loader = createLoader(host, { zIndex: zIndex + 1 });
    let veil = null;
    let loaderTimer = null;
    let cancel = null;
    let stopFade = null;
    let openedAt = 0;
    const spentMs = { read: 0, draw: 0 };

    function timed(kind, work) {
        const startMs = host.now().getTime();
        const result = work();
        spentMs[kind] += host.now().getTime() - startMs;
        return result;
    }

    function hideLoader() {
        host.clearTimeout(loaderTimer);
        loaderTimer = null;
        loader.hide();
    }

    function showVeil() {
        // Cleared, not drawn: nothing to measure, so it shows at once.
        veil = host.createDrawingLayer(zIndex);
        veil.clear(DIMMED_WHEEL);
        loaderTimer = host.setTimeout(safeHandler(scriptName, () => {
            loaderTimer = null;
            loader.show();
        }), LOADER_DELAY_MS);
    }

    // Stops the foreground run and the fade in, takes the veil and the
    // Loader away; safe to call again.
    function remove() {
        if (cancel) cancel();
        cancel = null;
        if (stopFade) stopFade();
        stopFade = null;
        hideLoader();
        if (!veil) return;
        host.removeDrawingLayer(veil);
        veil = null;
    }

    return {
        // Starts the clock of a new opening.
        begin() {
            openedAt = host.now().getTime();
            spentMs.read = 0;
            spentMs.draw = 0;
        },
        // work() timed as reading or as drawing; returns what it returns.
        read: work => timed("read", work),
        draw: work => timed("draw", work),
        // Veils the wheel and runs step() in the foreground queue until it
        // returns false, then onDone(); onFailed(): a step threw (logged by
        // the drawing ahead), the veil already removed.
        runVeiled(step, { onDone, onFailed }) {
            showVeil();
            cancel = drawingAhead.runInForeground(step, {
                onDone: () => {
                    cancel = null;
                    onDone();
                },
                onFailed: () => {
                    cancel = null;
                    remove();
                    onFailed();
                },
            });
        },
        hideLoader,
        // Once the steps are over: the Loader goes, the screen fades in
        // through setOpacity(opacity), then the veil goes.
        fadeIn(setOpacity) {
            hideLoader();
            stopFade = fadeIn(host, scriptName, setOpacity, remove);
        },
        // whose: openingTimeLine()'s profileName, isReadOnly and readSplit.
        logOpened(whose = {}) {
            host.log(openingTimeLine(scriptName, {
                ...whose, totalMs: host.now().getTime() - openedAt, readMs: spentMs.read, drawnMs: spentMs.draw,
            }));
        },
        remove,
    };
}

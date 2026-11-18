// ============================================================
// Attract mode: whether the cabinet is in attract mode, and a listener for
// its start that a drawn screen holding it off never reaches. The wheel
// screen's own pieces (Challenge Card, Wheel Guides, the Wheel Marks of
// wheel_marks.js) hide with it and come back on "wheelmode", which fires when it ends.
// - Checked on the next tick: a listener after the caller's may still prevent "attractmodestart".
// ============================================================

import { safeHandler } from "./safe_handler.js";

export const isInAttractMode = host => host.getUIMode() === "attract";

export function onAttractModeStarted(host, scriptName, listener) {
    host.on("attractmodestart", safeHandler(scriptName, ev => {
        if (ev.defaultPrevented) return;
        host.setTimeout(safeHandler(scriptName, () => {
            if (isInAttractMode(host)) listener();
        }), 0);
    }));
}

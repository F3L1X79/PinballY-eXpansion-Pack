// ============================================================
// The Rocket: an Easter Egg drawn at "prelaunch", for a launch from the wheel
// (PlayGame, not started by the pack). The launch is cancelled, and the Rocket
// engine's game plays instead, then the wheel. The table is silent until just
// before it goes.
// - Its "prelaunch" listener must be the pack's first: a cancelled launch never fires "postlaunch".
// - Won at the start; its Achievement waits for the end, so that the toast shows on the wheel.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { EASTER_EGG } from "./easter_egg_rules.js";

const SCRIPT_NAME = "Rocket";

// engine: the Rocket engine; rules(): read at the launch, since the Rocket
// listens before main.js loads anything; texts(): { dodge, score }, as shown.
export function createRocket(host, { engine, rules, texts }) {
    const log = message => host.log(`[${SCRIPT_NAME}] ${message}`);

    // Fires at every launch, before any other listener of the pack.
    function onPrelaunch(ev) {
        if (engine.isRunning() || ev.command !== host.getBuiltInCommand("PlayGame") || host.isLaunchStartedByPack()) return;
        if (!rules().tryWin(EASTER_EGG.ROCKET, { canPlay: engine.canPlay })) return;
        ev.preventDefault();
        // Backglass Clock, High Scores, the NVRAM watch and the vpxtool runner
        // would wait for a "postlaunch" that a cancelled launch never fires.
        ev.stopImmediatePropagation();
        log(`The launch of "${ev.game ? ev.game.title : "?"}" turns into the Rocket.`);
        // Counted whether the game crashed or failed: it was won at the start.
        engine.start({ texts: texts(), onEnd: () => rules().finish(EASTER_EGG.ROCKET) });
    }

    host.on("prelaunch", safeHandler(SCRIPT_NAME, onPrelaunch));
}

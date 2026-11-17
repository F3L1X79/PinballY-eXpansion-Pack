// ============================================================
// The Rocket: an Easter Egg drawn at "prelaunch", for a launch from the wheel
// (PlayGame, not started by the pack). The launch is cancelled, and the Rocket
// engine's game plays instead, then the wheel. The table is silent until just
// before it goes.
// - Takes the launch over through the Launch Bracket, which cancels it: no other listener hears of it.
// - Won at the start; its Achievement waits for the end, so that the toast shows on the wheel.
// ============================================================

import { EASTER_EGG } from "./easter_egg_rules.js";

const SCRIPT_NAME = "Rocket";

// engine: the Rocket engine; rules(): read at the launch, since the Rocket
// listens before main.js loads anything; texts(): { dodge, score }, as shown;
// launchBracket: the one that cancels the launch it takes over.
export function createRocket(host, { engine, rules, texts, launchBracket }) {
    const log = message => host.log(`[${SCRIPT_NAME}] ${message}`);

    launchBracket.offerTakeover(SCRIPT_NAME, ev => {
        if (engine.isRunning() || ev.command !== host.getBuiltInCommand("PlayGame") || host.isLaunchStartedByPack()) return null;
        if (!rules().tryWin(EASTER_EGG.ROCKET, { canPlay: engine.canPlay })) return null;
        return () => {
            log(`The launch of "${ev.game ? ev.game.title : "?"}" turns into the Rocket.`);
            // Counted whether the game crashed or failed: it was won at the start.
            engine.start({ texts: texts(), onEnd: () => rules().finish(EASTER_EGG.ROCKET) });
        };
    });
}

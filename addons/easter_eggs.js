// ============================================================
// Easter Eggs: rare events tied to their own moments, turned off like any
// Add-on, under this name in the eXpansion Pack Settings.
// The rules live in common/easter_eggs/easter_egg_rules.js.
// - installFirstListeners() runs in main.js after the Launch Bracket, only when on: the Rocket's takeover.
// - The Crow is drawn once per start, a tick after the Startup Screen has closed.
// - The Menu Glitch is drawn at the main menu's "menuopen", after Drawn Menus' listener.
// - The Maneki-neko is drawn at one "gameselect" of the session.
// - The Fake Blue Screen is drawn back from a table, after the High Scores' read.
// ============================================================

import { createPinballYHost } from "../common/core/pinbally_host.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { getQuietWheel } from "../common/core/quiet_wheel.js";
import { onWheelArrival, isWheelArrivalAhead } from "../common/core/startup_screen.js";
import { getWindowLayout } from "../common/core/window_layout.js";
import config from "../common/core/config.js";
import { getDrawnMenus } from "../common/drawn_menu/drawn_menu.js";
import { displayNameOf } from "../common/profiles/profile_name.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getEasterEggRules } from "../common/easter_eggs/easter_egg_rules.js";
import { createCrow } from "../common/easter_eggs/crow.js";
import { createMenuGlitch } from "../common/easter_eggs/menu_glitch.js";
import { createManekiNeko } from "../common/easter_eggs/maneki_neko.js";
import { createRocket } from "../common/easter_eggs/rocket.js";
import { getRocketEngine } from "../common/rocket/rocket_engine.js";
import { createFakeBlueScreen } from "../common/easter_eggs/fake_blue_screen.js";
import { getHighScoreStore } from "../common/high_scores/high_score_store.js";
import { getDrawnScreenControls } from "../common/core/drawn_screen_controls.js";
import { getLaunchBracket } from "../common/core/launch_bracket.js";
import { getWheelDialogs } from "../common/core/wheel_dialog.js";
import lang from "../common/core/i18n.js";

const SCRIPT_NAME = "EasterEggs";

let rocketEngine = null;

// First of all, right after the Launch Bracket: the Drawn Screen controls'
// button and attract mode listeners come before any other of the pack.
export function installFirstListeners() {
    const host = createPinballYHost();
    rocketEngine = getRocketEngine();
    createRocket(host, { engine: rocketEngine, rules: getEasterEggRules, texts: () => lang.rocket, launchBracket: getLaunchBracket() });
}

export default function init() {
    const host = createPinballYHost();
    // For the wheel dialog queue: nothing shows over the game.
    if (rocketEngine) getWheelDialogs().waitFor(rocketEngine.screen);
    const rules = getEasterEggRules();
    const crow = createCrow(host, { rules, quietWheel: getQuietWheel() });
    const tryFly = safeHandler(SCRIPT_NAME, crow.tryFly);

    // Drawn Menus only: with the Add-on off, nothing to play on and nothing to load.
    if (config.addOns.drawnMenus !== false) {
        const store = getProfileStore();
        const glitch = createMenuGlitch(host, {
            rules, quietWheel: getQuietWheel(), menus: getDrawnMenus(),
            shownProfileName: () => displayNameOf(store.getActiveProfile()),
        });
        // Fires after Drawn Menus' listener (main.js's order): the menu is drawn.
        host.on("menuopen", safeHandler(SCRIPT_NAME, ev => {
            if (ev.id === "main") glitch.tryPlay();
        }));
    }

    const cat = createManekiNeko(host, { rules });
    host.onGameListEvent("gameselect", safeHandler(SCRIPT_NAME, cat.onGameSelect));

    const blueScreen = createFakeBlueScreen(host, {
        controls: getDrawnScreenControls(), rules, quietWheel: getQuietWheel(),
        highScores: config.addOns.highScores === false ? null : getHighScoreStore(), texts: () => lang.fakeBlueScreen,
    });
    getWheelDialogs().waitFor(blueScreen.screen);

    // A tick later: what the closing screen leads to has opened by then, and counts as busy.
    onWheelArrival(safeHandler(SCRIPT_NAME, () => host.setTimeout(tryFly, 0)));

    // The bare wheel with no Profile Greeting to wait for: no Wheel Arrival will come.
    if (!isWheelArrivalAhead()) {
        // A tick later, so what the other Add-ons submit at startup counts as busy.
        host.setTimeout(safeHandler(SCRIPT_NAME, () => getWindowLayout().whenLaidOut(tryFly)), 0);
    }
}

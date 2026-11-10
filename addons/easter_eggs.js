// ============================================================
// Easter Eggs: rare events tied to their own moments, part of the pack
// and impossible to turn off, so it has no entry among config.addOns or the
// eXpansion Pack Settings. The rules live in common/easter_eggs/easter_egg_rules.js.
// - The Crow is drawn once per start, a tick after the Startup Screen has closed.
// - The Menu Glitch is drawn at the main menu's "menuopen", after Drawn Menus' listener.
// ============================================================

import { createPinballYHost } from "../common/core/pinbally_host.js";
import { safeHandler } from "../common/core/safe_handler.js";
import { getQuietWheel } from "../common/core/quiet_wheel.js";
import { getStartupScreen, onStartupScreenClosed, STARTUP_SCREEN } from "../common/core/startup_screen.js";
import { getWindowLayout } from "../common/core/window_layout.js";
import config from "../common/core/config.js";
import { getDrawnMenus } from "../common/drawn_menu/drawn_menu.js";
import { displayNameOf } from "../common/profiles/profile_name.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { getEasterEggRules } from "../common/easter_eggs/easter_egg_rules.js";
import { createCrow } from "../common/easter_eggs/crow.js";
import { createMenuGlitch } from "../common/easter_eggs/menu_glitch.js";

const SCRIPT_NAME = "EasterEggs";

export default function init() {
    const host = createPinballYHost();
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

    // A tick later: what the closing screen leads to has opened by then, and counts as busy.
    onStartupScreenClosed(safeHandler(SCRIPT_NAME, () => host.setTimeout(tryFly, 0)));

    // The bare wheel with no Profile Greeting to wait for: nothing will close.
    if (getStartupScreen() === STARTUP_SCREEN.WHEEL && config.addOns.profilePicker === false) {
        // A tick later, so what the other Add-ons submit at startup counts as busy.
        host.setTimeout(safeHandler(SCRIPT_NAME, () => getWindowLayout().whenLaidOut(tryFly)), 0);
    }
}

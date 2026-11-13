// ============================================================
// Translates PinballY's native menu titles (through
// common/menus/menu_title_translation.js) and launch-overlay status
// messages into the active project language. Listens to "menuopen" and
// "launchoverlaymessage"; logs untranslated titles when
// logUntranslatedMenuTitles is on in common/core/config.js.
// ============================================================

import lang from "../common/core/i18n.js";
import { safeHandler } from "../common/core/safe_handler.js";
import config from "../common/core/config.js";
import { translateMenuTitle } from "../common/menus/menu_title_translation.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";

const SCRIPT_NAME = "UITranslation";

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

export default function init() {
    const host = createPinballYHost();
    const LAUNCH_OVERLAY_MESSAGES = lang.launchOverlayMessages || {};

    // The translated menu title, or the original one, logged when
    // logUntranslatedMenuTitles is on, when no translation applies.
    function translateOrLogMissing(title) {
        const translated = translateMenuTitle(title);
        if (translated !== null) return translated;

        if (config.logUntranslatedMenuTitles) {
            const charCodes = title.split("").map(c => c.charCodeAt(0)).join(",");
            host.log(`[UITranslation] Missing translation: "${title}" (char codes: ${charCodes})`);
        }

        return title;
    }

    function translateMenuItems(items) {
        if (!Array.isArray(items)) return;

        items.forEach(item => {
            if (!item) return;
            if (item.title) item.title = translateOrLogMissing(item.title);
            if (Array.isArray(item.submenu)) translateMenuItems(item.submenu);
        });
    }

    // Fires when any menu opens: translates every item title in place.
    mainWindow.on("menuopen", safeHandler(SCRIPT_NAME, ev => {
        translateMenuItems(ev.items);
        ev.menuUpdated = true;
    }));

    // Fires for each launch-overlay status message: replaces it with the
    // translation keyed by its language-independent id.
    mainWindow.on("launchoverlaymessage", safeHandler(SCRIPT_NAME, ev => {
        if (hasOwn(LAUNCH_OVERLAY_MESSAGES, ev.id)) {
            ev.message = LAUNCH_OVERLAY_MESSAGES[ev.id];
        }
    }));
}
// ============================================================
// Status Icons: small icons beside the wheel's clock, each shown while its
// state lasts: Discord showing the cabinet publicly, to everyone; a Pack Update
// waiting and the Update Check off, only to a Profile that sees the setup
// entries. Asked again on "wheelmode", on a Profile switch, when what Discord shows
// changes and once the Update Check's reply is handled.
// - A fixed slot right of the widest time: never follows the minute, nor moves with the clock off.
// - An icon that comes or goes while shown fades once; none at "wheelmode", never a loop.
// - Hidden (points) on "gamestarted", nothing drawn until "wheelmode".
// - Discord's symbol is an image, drawn as is: only its own layer's alpha can fade it.
// ============================================================

import { safeHandler } from "../common/core/safe_handler.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { fadeIn } from "../common/drawing/screen_opening.js";
import { createHiddenLayer, hideLayer, placeAligned } from "../common/drawing/placed_layers.js";
import { WHEEL_CLOCK, widestTimeWidth } from "../common/clock/wheel_clock_layout.js";
import { isCabinetPublicOnDiscord, onCabinetPublicChange } from "../common/discord/discord_client.js";
import { getProfileStore } from "../common/profiles/profile_store.js";
import { seesSetupEntries } from "../common/profiles/setup_entries.js";
import { installableRelease, isUpdateCheckOff, onUpdateCheckDone } from "../common/updates/update_check.js";
import { getUpdateState } from "../common/updates/update_state.js";
import { STATUS_ICON, drawStatusIcon } from "../common/status_icons/status_icon_glyphs.js";

const SCRIPT_NAME = "StatusIcons";

// The clock's height, so the same scale; wide enough for three icons right
// of the widest time.
const CANVAS = Object.freeze({ width: 460, height: WHEEL_CLOCK.height });
// Segoe UI's digits at the clock's 28 pt: about 26 px tall, 14 px under the
// top of the time's line.
const ICON = Object.freeze({ size: 26, top: WHEEL_CLOCK.top + 14, gap: 10 });
const SLOT_GAP = 14;
const TRANSPARENT = 0x00000000;
// Discord's official white symbol: 33 by 25 keeps its exact 1.32 proportions,
// never deformed (#393), one pixel under the digits' top, on their baseline.
const DISCORD_SYMBOL_FILE = "assets\\images\\discord_symbol.png";
const DISCORD_SYMBOL = Object.freeze({ width: 33, height: 25, top: ICON.top + 1 });

export default function init() {
    const host = createPinballYHost();
    const profileStore = getProfileStore();
    const updateState = getUpdateState();
    // At the clock's scale and place.
    function showLayer(iconLayer) {
        placeAligned(iconLayer, { ySpan: CANVAS.height / WHEEL_CLOCK.referenceHeight }, 0, 0, "top left");
        iconLayer.alpha = 1;
    }
    const glyphLayer = host.createDrawingLayer(WHEEL_CLOCK.zIndex);
    showLayer(glyphLayer);
    // A point until the symbol is drawn on it.
    const symbolLayer = createHiddenLayer(host, WHEEL_CLOCK.zIndex);
    const slotLeft = WHEEL_CLOCK.left + widestTimeWidth(host) + SLOT_GAP;
    // By absolute path: drawImage resolves relative paths from the PinballY folder.
    const symbolPath = `${host.getProjectFolder()}\\${DISCORD_SYMBOL_FILE}`;

    let isShown = true;
    // The icons on the layers, in order: { icon, opacity }.
    let drawn = [];
    let stopFade = null;
    let isSymbolDrawn = false;
    // What the glyphs' layer shows, so a fade of the symbol alone leaves it be.
    let drawnGlyphs = null;

    // Left to right, absent ones leaving no gap.
    function iconsToShow() {
        const icons = isCabinetPublicOnDiscord() ? [STATUS_ICON.DISCORD] : [];
        if (!seesSetupEntries(profileStore)) return icons;
        if (installableRelease(host, updateState)) icons.push(STATUS_ICON.PACK_UPDATE_WAITING);
        if (isUpdateCheckOff(host)) icons.push(STATUS_ICON.UPDATE_CHECK_OFF);
        return icons;
    }

    const fullyShown = icons => icons.map(icon => ({ icon, opacity: 1 }));

    // symbol: its entry, undefined for none. Drawn once, however long its
    // fade; its layer a point without it.
    function showSymbol(symbol) {
        if (Boolean(symbol) !== isSymbolDrawn) {
            isSymbolDrawn = Boolean(symbol);
            if (symbol) {
                symbolLayer.draw(dc => dc.drawImage(symbolPath, slotLeft, DISCORD_SYMBOL.top, DISCORD_SYMBOL.width, DISCORD_SYMBOL.height), CANVAS.width, CANVAS.height);
                showLayer(symbolLayer);
            } else {
                symbolLayer.clear(TRANSPARENT);
                hideLayer(symbolLayer);
            }
        }
        if (symbol) symbolLayer.alpha = symbol.opacity;
    }

    function showGlyphs(glyphs, left) {
        const glyphsNow = JSON.stringify({ glyphs, left });
        if (glyphsNow === drawnGlyphs) return;
        drawnGlyphs = glyphsNow;
        glyphLayer.clear(TRANSPARENT);
        if (glyphs.length === 0) return;
        glyphLayer.draw(dc => {
            glyphs.forEach(({ icon, opacity }, index) =>
                drawStatusIcon(dc, icon, left + index * (ICON.size + ICON.gap), ICON.top, ICON.size, opacity));
        }, CANVAS.width, CANVAS.height);
    }

    function draw(entries) {
        drawn = entries;
        const symbol = entries.find(({ icon }) => icon === STATUS_ICON.DISCORD);
        showSymbol(symbol);
        showGlyphs(entries.filter(entry => entry !== symbol), symbol ? slotLeft + DISCORD_SYMBOL.width + ICON.gap : slotLeft);
    }

    function finishFade() {
        if (!stopFade) return;
        stopFade();
        stopFade = null;
    }

    const sameIcons = (icons, entries) => icons.length === entries.length
        && icons.every((icon, index) => entries[index].icon === icon && entries[index].opacity === 1);

    // fade: whether the icons that come or go fade, the layer being shown.
    function refresh({ fade }) {
        if (!isShown) return;
        const icons = iconsToShow();
        if (sameIcons(icons, drawn)) return;
        finishFade();
        if (!fade) {
            draw(fullyShown(icons));
            return;
        }
        // The going ones keep their place while they fade out.
        const previousIcons = drawn.map(({ icon }) => icon);
        const coming = icons.filter(icon => !previousIcons.includes(icon));
        const going = previousIcons.filter(icon => !icons.includes(icon));
        const order = Object.values(STATUS_ICON).filter(icon => icons.includes(icon) || going.includes(icon));
        const opacityOf = (icon, progress) => {
            if (coming.includes(icon)) return progress;
            return going.includes(icon) ? 1 - progress : 1;
        };
        stopFade = fadeIn(host, SCRIPT_NAME, progress => {
            draw(order.map(icon => ({ icon, opacity: opacityOf(icon, progress) })));
        }, () => {
            stopFade = null;
            draw(fullyShown(icons));
        });
    }

    // Never over a game, and nothing drawn while hidden.
    host.on("gamestarted", safeHandler(SCRIPT_NAME, () => {
        isShown = false;
        finishFade();
        hideLayer(glyphLayer);
        hideLayer(symbolLayer);
    }));
    // Back on the wheel, after a game, a menu or a dialog: shown as they are now, without a fade.
    host.on("wheelmode", safeHandler(SCRIPT_NAME, () => {
        isShown = true;
        showLayer(glyphLayer);
        if (isSymbolDrawn) showLayer(symbolLayer);
        refresh({ fade: false });
    }));
    profileStore.onSwitch(safeHandler(SCRIPT_NAME, () => refresh({ fade: true })));
    onCabinetPublicChange(safeHandler(SCRIPT_NAME, () => refresh({ fade: true })));
    onUpdateCheckDone(safeHandler(SCRIPT_NAME, () => refresh({ fade: true })));

    draw(fullyShown(iconsToShow()));
}

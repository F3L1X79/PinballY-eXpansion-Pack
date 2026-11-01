// ============================================================
// Status Icons: small icons beside the wheel's clock, each shown while its
// state lasts: a Pack Update waiting, the Update Check off; both only to a
// Profile that sees the setup entries. Asked again on "wheelmode", on a
// Profile switch and once the Update Check's reply is handled.
// - A fixed slot right of the widest time: never follows the minute, nor moves with the clock off.
// - An icon that comes or goes while shown fades once; none at "wheelmode", never a loop.
// - Hidden on "gamestarted", nothing drawn until "wheelmode".
// ============================================================

import { safeHandler } from "../common/core/safe_handler.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { fadeIn } from "../common/drawing/screen_opening.js";
import { WHEEL_CLOCK, widestTimeWidth } from "../common/clock/wheel_clock_layout.js";
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

export default function init() {
    const host = createPinballYHost();
    const profileStore = getProfileStore();
    const updateState = getUpdateState();
    const layer = host.createDrawingLayer(WHEEL_CLOCK.zIndex);
    layer.setScale({ ySpan: CANVAS.height / WHEEL_CLOCK.referenceHeight });
    layer.setPos(0, 0, "top left");
    const slotLeft = WHEEL_CLOCK.left + widestTimeWidth(host) + SLOT_GAP;

    let isShown = true;
    // The icons on the layer, in order: { icon, opacity }.
    let drawn = [];
    let stopFade = null;

    // Left to right, absent ones leaving no gap; a Discord icon will come first.
    function iconsToShow() {
        if (!seesSetupEntries(profileStore)) return [];
        const icons = [];
        if (installableRelease(host, updateState)) icons.push(STATUS_ICON.PACK_UPDATE_WAITING);
        if (isUpdateCheckOff(host)) icons.push(STATUS_ICON.UPDATE_CHECK_OFF);
        return icons;
    }

    const fullyShown = icons => icons.map(icon => ({ icon, opacity: 1 }));

    function draw(entries) {
        drawn = entries;
        layer.clear(TRANSPARENT);
        if (entries.length === 0) return;
        layer.draw(dc => {
            entries.forEach(({ icon, opacity }, index) =>
                drawStatusIcon(dc, icon, slotLeft + index * (ICON.size + ICON.gap), ICON.top, ICON.size, opacity));
        }, CANVAS.width, CANVAS.height);
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
        layer.alpha = 0;
    }));
    // Back on the wheel, after a game, a menu or a dialog: shown as they are now, without a fade.
    host.on("wheelmode", safeHandler(SCRIPT_NAME, () => {
        isShown = true;
        layer.alpha = 1;
        refresh({ fade: false });
    }));
    profileStore.onSwitch(safeHandler(SCRIPT_NAME, () => refresh({ fade: true })));
    onUpdateCheckDone(safeHandler(SCRIPT_NAME, () => refresh({ fade: true })));

    draw(fullyShown(iconsToShow()));
}

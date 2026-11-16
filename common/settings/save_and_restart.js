// ============================================================
// Saves an Add-on's on/off value (or any other setting) in .env.local, then asks "Restart now / Later":
// the one save and restart path of the pack. One instance per caller, under the caller's own name and ids.
// Listens to "command" and "commandbuttondown"; writes .env.local; draws the restart veil and its Loader.
// - A failed read or write is caught here, not by safeHandler, for the owner to see "Setting not saved".
// - Wheel Order saved off gives PinballY's attract interval back, never leaving attract mode frozen.
// - From Restart now until PinballY quits, or the restart fails, no button moves the wheel or launches a table.
// ============================================================

import lang from "../core/i18n.js";
import { logHandlerError, safeHandler } from "../core/safe_handler.js";
import { logError } from "../core/error_log.js";
import { DRAWN_MENU_Z_INDEX } from "../drawn_menu/drawn_menu_painter.js";
import { createLoader } from "../drawing/loader.js";
import { DIMMED_WHEEL } from "../drawing/steamball_drawing.js";
import { DIALOG_PRIORITY, getWheelDialogs } from "../core/wheel_dialog.js";
import { giveAttractSwitchesBack } from "../tables/attract_order.js";
import { saveEnvSetting } from "./env_local_rewrite.js";

const SEPARATOR = { cmd: -1 };
// Just under the Drawn Menus, which the failure message may show over them.
const RESTART_VEIL_Z_INDEX = DRAWN_MENU_Z_INDEX.backdrop - 2;
const RESTART_LOADER_Z_INDEX = DRAWN_MENU_Z_INDEX.backdrop - 1;

// getMenus: what shows the Dialogs, asked on each one; scriptName: the log
// lines' prefix; idPrefix: starts the caller's own menu ids and command name.
export function createSaveAndRestart(host, profileStore, getMenus, { scriptName, idPrefix }) {
    const { saveAndRestart: TEXT } = lang;
    const menuReturnCommand = host.getBuiltInCommand("MenuReturn");
    const restartCommand = host.allocateCommand(`${idPrefix}_restart`);

    // reopen: what OK and Exit show after "Setting not saved", on the value
    // saved before. alsoWrite: what else the value writes once .env.local is saved.
    function saveSetting(keyPath, value, { onSaved, reopen, alsoWrite = null }) {
        try {
            saveEnvSetting(host, keyPath, value, scriptName);
            if (alsoWrite) alsoWrite();
        } catch (error) {
            logHandlerError(scriptName, error);
            getMenus().show(`${idPrefix}NotSaved`, [
                { title: TEXT.notSaved, cmd: -1 },
                SEPARATOR,
                { title: TEXT.ok, cmd: menuReturnCommand },
            ], { dialogStyle: true, onBack: reopen });
            return;
        }
        onSaved();
    }

    // The Attract Order belongs to the Wheel Order Add-on.
    function saveAddOn(key, value, { onSaved, reopen }) {
        const alsoWrite = key === "wheelOrder" && !value ? () => giveAttractSwitchesBack(host, profileStore) : null;
        saveSetting(`addOns.${key}`, value, { onSaved, reopen, alsoWrite });
    }

    // Later and Exit both run onLater.
    function askRestart(onLater) {
        getMenus().show(`${idPrefix}Restart`, [
            { title: TEXT.restartQuestion, cmd: -1 },
            SEPARATOR,
            { title: TEXT.restartNow, cmd: restartCommand },
            { title: TEXT.later, cmd: menuReturnCommand },
        ], { dialogStyle: true, onBack: onLater });
    }

    // From Restart now until PinballY quits: the wheel dimmed as a drawn
    // screen's backdrop dims it, with the Loader turning over it.
    let restartVeil = null;
    const restartLoader = createLoader(host, { zIndex: RESTART_LOADER_Z_INDEX });

    function showRestartVeil() {
        restartVeil = host.createDrawingLayer(RESTART_VEIL_Z_INDEX);
        restartVeil.clear(DIMMED_WHEEL);
        restartLoader.show();
    }

    function hideRestartVeil() {
        restartLoader.hide();
        if (!restartVeil) return;
        host.removeDrawingLayer(restartVeil);
        restartVeil = null;
    }

    // Shown once the wheel is free: the failure comes up to 15 s after the
    // screens closed.
    const restartFailed = safeHandler(scriptName, error => {
        hideRestartVeil();
        logError(scriptName, `ERROR Restart not possible: ${error.message}`, host, error);
        getWheelDialogs().submit({
            id: `${idPrefix}RestartFailed`, title: TEXT.restartFailedTitle, message: TEXT.restartFailed, buttons: [{ label: TEXT.ok }], priority: DIALOG_PRIORITY.RESTART_FAILED,
        });
    });

    function restart() {
        host.log(`[${scriptName}] Restart asked.`);
        showRestartVeil();
        try {
            host.restartPinballY({
                onQuitting: safeHandler(scriptName, () => host.log(`[${scriptName}] Restart helper ready, quitting.`)),
                onFailed: restartFailed,
            });
        } catch (error) {
            restartFailed(error);
        }
    }

    // Fires on every mapped button press: while PinballY gets ready to quit,
    // no button moves the wheel or launches a table.
    host.on("commandbuttondown", safeHandler(scriptName, ev => {
        if (restartVeil) ev.preventDefault();
    }));

    // Fires on every command: only Restart now is this module's.
    host.on("command", safeHandler(scriptName, ev => {
        if (ev.id === restartCommand) restart();
    }));

    return { saveSetting, saveAddOn, askRestart };
}

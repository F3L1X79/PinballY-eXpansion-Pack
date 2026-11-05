// ============================================================
// World Tour tracker: keeps in memory the tables selected in one go on the
// "All Tables" filter; once every table of that wheel the Profile can see has
// been seen, sets its worldTour flag in profile.json and calls onCompleted.
// - Listens to "gameselect", which the Add-ons' own wheel moves never fire.
// - Starts over on a launch, filter change, Profile switch, attract mode or wheel reload.
// - An unconfigured table on the wheel neither counts nor starts the tour over.
// ============================================================

import { safeHandler } from "../core/safe_handler.js";
import { ALL_TABLES_FILTER, isVisibleTable } from "../core/pinbally_host.js";

const SCRIPT_NAME = "WorldTour";
// A single table is no tour.
const MIN_TOUR_TABLES = 2;

// Equal for the same tables to tour, whatever the current one.
const signatureOf = tourTables => tourTables.map(table => table.configId).sort().join("\n");

export function createWorldTour(host, profileStore, { onCompleted }) {
    const seenConfigIds = new Set();
    // The signature of the tables to tour when the tour started; null while
    // the tour waits for its starting table.
    let tourTablesSignature = null;
    let isCompleted = false;

    const isOnAllTablesWheel = () => host.getCurrentFilterId() === ALL_TABLES_FILTER && host.getUIMode() === "wheel";

    function startOver() {
        seenConfigIds.clear();
        tourTablesSignature = null;
        isCompleted = false;
    }

    function startFrom(game, tourTables) {
        startOver();
        seenConfigIds.add(game.configId);
        tourTablesSignature = signatureOf(tourTables);
    }

    function startIfWaiting() {
        if (tourTablesSignature !== null || !isOnAllTablesWheel()) return;
        const wheel = host.getWheelTables();
        if (wheel[0]) startFrom(wheel[0], wheel.filter(isVisibleTable));
    }

    const safeStartIfWaiting = safeHandler(SCRIPT_NAME, startIfWaiting);

    // Starts over from the current table when it can count at once.
    function restart() {
        startOver();
        startIfWaiting();
    }

    // Starts over from the current table once PinballY has applied the
    // change: the event fires before it, and no "wheelmode" follows when the
    // player changes filter straight from the wheel.
    function restartNextTick() {
        startOver();
        host.setTimeout(safeStartIfWaiting, 0);
    }

    function recordSelection(game) {
        if (!game || !isOnAllTablesWheel()) return;
        // Read afresh: the metafilters keep Hidden tables, and Adult Tables
        // for a Child Profile, off this wheel, but not unconfigured tables:
        // once selected they join the seen ones, where nothing asks for them.
        // A refreshed filter can change the tables without any event: the
        // tour then starts over here.
        const tourTables = host.getWheelTables().filter(isVisibleTable);
        if (signatureOf(tourTables) === tourTablesSignature) seenConfigIds.add(game.configId);
        else startFrom(game, tourTables);
        if (isCompleted || tourTables.length < MIN_TOUR_TABLES || !tourTables.every(table => seenConfigIds.has(table.configId))) return;
        isCompleted = true;
        profileStore.updateProfileData(data => { data.worldTour = true; });
        onCompleted();
    }

    startIfWaiting();

    // Fires after the player moved the wheel to another table.
    host.onGameListEvent("gameselect", safeHandler(SCRIPT_NAME, ev => recordSelection(ev.game)));
    // Fires before the new filter is in effect.
    host.onGameListEvent("filterselect", safeHandler(SCRIPT_NAME, restartNextTick));
    // Fires once the launched table's window opened.
    host.on("gamestarted", safeHandler(SCRIPT_NAME, startOver));
    // Fires when the cabinet, left idle, starts moving the wheel by itself.
    host.on("attractmodestart", safeHandler(SCRIPT_NAME, startOver));
    // Fires on the return to the wheel from a menu, a popup, attract mode or a game.
    host.on("wheelmode", safeHandler(SCRIPT_NAME, startIfWaiting));
    // Fires on every Profile switch.
    profileStore.onSwitch(safeHandler(SCRIPT_NAME, restart));
    // Fires when PinballY reloads its settings, which reloads its game list.
    host.onSettingsEvent("settingsreload", safeHandler(SCRIPT_NAME, restartNextTick));
}

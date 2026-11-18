// ============================================================
// Launches a table the player was shown in advance (a Period Table, the
// Welcome Screen's Challenge Table): selected on the wheel first, so the
// wheel is on it when the game ends and at the next startup.
// - A filter that leaves the table out gives way to All Tables, through the Wheel Order (its sorted copy while by year).
// ============================================================

import { ALL_TABLES_FILTER } from "../core/pinbally_host.js";
import { showInWheelOrder } from "./wheel_order.js";

function selectOnWheel(host, game) {
    const offsetOf = () => host.getWheelTables().findIndex(table => table.configId === game.configId);
    let offset = offsetOf();
    if (offset < 0) {
        showInWheelOrder(ALL_TABLES_FILTER);
        offset = offsetOf();
    }
    if (offset > 0) host.setWheelGame(offset);
}

export function launchShownTable(host, game) {
    selectOnWheel(host, game);
    host.playGame(game);
}

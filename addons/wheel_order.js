// ============================================================
// Wheel Order (on by default): an entry of the Filter Picker, just before
// Back, naming the order the wheel lists its tables in and switching it
// between alphabetical and by year. Starts the Wheel Order module's sorted
// copy, which puts the saved order on the Active Filter at once.
// ============================================================

import lang from "../common/core/i18n.js";
import { getMainMenu } from "../common/menus/main_menu.js";
import { getWheelOrder } from "../common/tables/wheel_order.js";

export default function init() {
    const { wheelOrderAlphabetical, wheelOrderByYear } = lang.customMenuLabels;
    const wheelOrder = getWheelOrder();
    wheelOrder.start({ copyTitle: wheelOrderByYear });
    getMainMenu().filterPicker.addEntry({
        name: "wheelOrder",
        label: () => (wheelOrder.isByYear() ? wheelOrderByYear : wheelOrderAlphabetical),
        action: () => { wheelOrder.toggle(); },
    });
}

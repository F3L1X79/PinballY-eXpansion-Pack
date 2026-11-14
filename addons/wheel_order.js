// ============================================================
// Wheel Order (on by default): an entry of the Filter Picker, just before
// Back, naming the order the wheel lists its tables in and opening the
// Wheel Order page, which switches it between alphabetical and by year.
// Starts the Wheel Order module's sorted copy, which puts the saved order
// on the Active Filter at once.
// ============================================================

import lang from "../common/core/i18n.js";
import { getMainMenu } from "../common/menus/main_menu.js";
import { getWheelOrder } from "../common/tables/wheel_order.js";

export default function init() {
    const TEXT = lang.customMenuLabels;
    const wheelOrder = getWheelOrder();
    wheelOrder.start({ copyTitle: TEXT.wheelOrderByYear });
    // The Filter Picker runs a choice's action only for the other order.
    const switchOrder = () => { wheelOrder.toggle(); };
    getMainMenu().filterPicker.addEntry({
        name: "wheelOrder",
        label: () => (wheelOrder.isByYear() ? TEXT.wheelOrderByYear : TEXT.wheelOrderAlphabetical),
        page: {
            title: TEXT.wheelOrderPage,
            statusLabel: TEXT.wheelOrderLabel,
            choices: [
                { name: "wheelOrderAlphabetical", label: TEXT.wheelOrderPageAlphabetical, isCurrent: () => !wheelOrder.isByYear(), action: switchOrder },
                { name: "wheelOrderByYear", label: TEXT.wheelOrderPageByYear, isCurrent: () => wheelOrder.isByYear(), action: switchOrder },
            ],
        },
    });
}

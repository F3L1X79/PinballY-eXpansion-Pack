// ============================================================
// Adds an "Original Tables" filter to PinballY's native "Filter by
// Manufacturer" menu, selecting every table EXCEPT the community-made
// VPX tables (identified by config.communityTablesManufacturer), listed in
// the Wheel Order. Registered once at init; no event listeners.
// ============================================================

import lang from "../common/core/i18n.js";
import config from "../common/core/config.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { compareInWheelOrder } from "../common/tables/wheel_order.js";

export default function init() {
    const COMMUNITY_MANUFACTURER_NAME = config.communityTablesManufacturer;
    const { originalTablesFilter: FILTER_TITLE } = lang.customMenuLabels;

    // Through the host, which keeps compareForSort for the status line.
    createPinballYHost().createFilter({
        id: "project.OriginalTables",
        title: FILTER_TITLE,
        group: "[Manuf]",
        select: game => game.manufacturer !== COMMUNITY_MANUFACTURER_NAME,
        compareForSort: compareInWheelOrder,
    });
}

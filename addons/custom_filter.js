// ============================================================
// Adds an "Original Tables" Pack Filter to PinballY's native "Filter by
// Manufacturer" menu, selecting every table EXCEPT the community-made
// VPX tables (identified by config.communityTablesManufacturer), listed in
// the Wheel Order and paged in it.
// ============================================================

import lang from "../common/core/i18n.js";
import config from "../common/core/config.js";
import { createPinballYHost } from "../common/core/pinbally_host.js";
import { createPackFilter } from "../common/tables/pack_filter.js";

const SCRIPT_NAME = "CustomFilter";

export default function init() {
    const COMMUNITY_MANUFACTURER_NAME = config.communityTablesManufacturer;
    const host = createPinballYHost();

    createPackFilter(host, {
        scriptName: SCRIPT_NAME,
        id: "project.OriginalTables",
        title: lang.customMenuLabels.originalTablesFilter,
        group: "[Manuf]",
        // PinballY passes select() only the tables it can show: the hidden ones listed here never reach the wheel.
        selectConfigIds: () => host.getAllTables()
            .filter(game => game.manufacturer !== COMMUNITY_MANUFACTURER_NAME)
            .map(game => game.configId),
    });
}

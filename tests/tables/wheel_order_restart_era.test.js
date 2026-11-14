// ============================================================
// A restart by year on an era, through main.js: PinballY restores the
// sorted copy, which takes the era saved in cabinet.json as its source
// again; "Active filter: ..." names the era, and the Info Log names the
// filter PinballY restored.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { COPY_ID, activeFilterEntry, orderFrom, restart } from "./wheel_order_restart_scenario.js";

const SEVENTIES = "YearRange.1970.1979";
const INFO_LOG = "C:\\PinballY\\Scripts\\ExpansionPack\\logs\\info.log";

test("by year on an era, a restart shows the same era by year", async () => {
    const { fake, lang } = await restart({
        cabinet: { wheelOrder: "byYear", wheelOrderSource: SEVENTIES },
        restored: { filterId: COPY_ID, wheel: ["Gorgar", "Eight Ball"] },
    });

    assert.equal(fake.currentFilterId(), COPY_ID);
    assert.deepEqual(orderFrom(fake, "Eight Ball"), ["Eight Ball", "Gorgar"]);
    assert.equal(fake.getCurrentTable().title, "Gorgar", "the table PinballY restored stays selected");
    assert.equal(activeFilterEntry(fake, lang), lang.customMenuLabels.activeFilter("1970s Tables"));
    assert.match(fake.readFile(INFO_LOG), /\[WheelOrder\] filter restored at startup: User\.project\.WheelOrder,/);
    assertNoErrorLogged(fake);
});

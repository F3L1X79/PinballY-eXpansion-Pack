// ============================================================
// A restart with an unknown Wheel Order in cabinet.json, through main.js:
// the wheel falls back to alphabetical, on the filter PinballY restored, one
// line is logged, and the startup goes on.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { activeFilterEntry, restart } from "./wheel_order_restart_scenario.js";

const SEVENTIES = "YearRange.1970.1979";

test("an unknown Wheel Order falls back to alphabetical, logged", async () => {
    const { fake, lang } = await restart({
        cabinet: { wheelOrder: "sideways", wheelOrderSource: "All" },
        restored: { filterId: SEVENTIES, wheel: ["Eight Ball", "Gorgar"] },
    });

    assert.equal(fake.currentFilterId(), SEVENTIES);
    assert.deepEqual(fake.getWheelTables().map(game => game.title), ["Eight Ball", "Gorgar"]);
    assert.equal(activeFilterEntry(fake, lang), lang.customMenuLabels.activeFilter("1970s Tables"));
    const errors = errorLines(fake);
    assert.equal(errors.length, 1, errors.join("\n"));
    assert.match(errors[0], /\[WheelOrder\] ERROR .*"sideways".*alphabetical/);
});

// ============================================================
// A restart by year on the sorted copy whose saved source PinballY no
// longer knows (a manufacturer gone), through main.js: the copy falls back
// to All Tables by year, one line is logged, and the startup goes on.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { COPY_ID, activeFilterEntry, orderFrom, restart } from "./wheel_order_restart_scenario.js";

test("an unknown saved source falls back to All Tables by year, logged", async () => {
    const { fake, lang } = await restart({
        cabinet: { wheelOrder: "byYear", wheelOrderSource: "Manufacturer.Gone" },
        restored: { filterId: COPY_ID, wheel: ["Black Knight"] },
    });

    assert.equal(fake.currentFilterId(), COPY_ID);
    assert.deepEqual(orderFrom(fake, "Eight Ball"),
        ["Eight Ball", "Gorgar", "Black Knight", "Attack from Mars", "Cirqus Voltaire", "Medieval Madness", "Space Trip"]);
    assert.equal(activeFilterEntry(fake, lang), lang.customMenuLabels.activeFilter("All Tables"));
    const errors = errorLines(fake);
    assert.equal(errors.length, 1, errors.join("\n"));
    assert.match(errors[0], /\[WheelOrder\] ERROR .*"Manufacturer\.Gone".*All/);
});

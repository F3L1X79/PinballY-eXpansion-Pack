// ============================================================
// A restart by year on All Tables, through main.js: PinballY restores the
// sorted copy, which takes All Tables, saved in cabinet.json, as its source again.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { COPY_ID, activeFilterEntry, orderFrom, restart } from "./wheel_order_restart_scenario.js";

test("by year on All Tables, a restart shows All Tables by year", async () => {
    const { fake, lang } = await restart({
        cabinet: { wheelOrder: "byYear", wheelOrderSource: "All" },
        restored: { filterId: COPY_ID, wheel: ["Black Knight"] },
    });

    assert.equal(fake.currentFilterId(), COPY_ID);
    assert.deepEqual(orderFrom(fake, "Eight Ball"),
        ["Eight Ball", "Gorgar", "Black Knight", "Attack from Mars", "Cirqus Voltaire", "Medieval Madness", "Space Trip"]);
    assert.equal(activeFilterEntry(fake, lang), lang.customMenuLabels.activeFilter("All Tables"));
    assertNoErrorLogged(fake);
});

// ============================================================
// A restart by year where PinballY restored one of its own filters (an
// era), through main.js: the sorted copy takes it as its source, as when
// the player picks a filter, and saves it in cabinet.json.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { CABINET_FILE, COPY_ID, activeFilterEntry, orderFrom, restart } from "./wheel_order_restart_scenario.js";
const NINETIES = "YearRange.1990.1999";

test("by year, a PinballY filter restored becomes the copy's source", async () => {
    const { fake, lang } = await restart({
        cabinet: { wheelOrder: "byYear", wheelOrderSource: "All" },
        restored: { filterId: NINETIES, wheel: ["Medieval Madness", "Attack from Mars", "Cirqus Voltaire"] },
    });

    assert.equal(fake.currentFilterId(), COPY_ID);
    assert.deepEqual(orderFrom(fake, "Attack from Mars"), ["Attack from Mars", "Cirqus Voltaire", "Medieval Madness"]);
    assert.equal(fake.getCurrentTable().title, "Medieval Madness");
    assert.equal(activeFilterEntry(fake, lang), lang.customMenuLabels.activeFilter("1990s Tables"));
    assert.equal(JSON.parse(fake.readFile(CABINET_FILE)).wheelOrderSource, NINETIES);
    assertNoErrorLogged(fake);
});

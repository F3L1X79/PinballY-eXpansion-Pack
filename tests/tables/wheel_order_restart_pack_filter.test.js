// ============================================================
// A restart by year on a pack wheel selection, through main.js: PinballY
// restores Tables to Discover, which sorts itself by year again; no copy.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { assertNoErrorLogged } from "../support/error_log.js";
import { orderFrom, restart } from "./wheel_order_restart_scenario.js";

const TABLES_TO_DISCOVER = "User.project.TablesToDiscover";

test("by year on Tables to Discover, a restart shows it by year", async () => {
    const { fake } = await restart({
        cabinet: { wheelOrder: "byYear", wheelOrderSource: "All" },
        // As PinballY listed it before the pack's filter ran: alphabetical.
        restored: {
            filterId: TABLES_TO_DISCOVER,
            wheel: ["Attack from Mars", "Black Knight", "Cirqus Voltaire", "Eight Ball", "Gorgar", "Medieval Madness", "Space Trip"],
        },
    });

    assert.equal(fake.currentFilterId(), TABLES_TO_DISCOVER);
    assert.deepEqual(orderFrom(fake, "Eight Ball"),
        ["Eight Ball", "Gorgar", "Black Knight", "Attack from Mars", "Cirqus Voltaire", "Medieval Madness", "Space Trip"]);
    assert.equal(fake.getCurrentTable().title, "Attack from Mars", "the table PinballY restored stays selected");
    assertNoErrorLogged(fake);
});

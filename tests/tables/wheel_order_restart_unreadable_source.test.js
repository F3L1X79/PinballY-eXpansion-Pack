// ============================================================
// A restart, through main.js, where PinballY restored the sorted copy, the
// Wheel Order saved is alphabetical and the copy's source in cabinet.json
// is unreadable: the wheel falls back to All Tables, one line is logged.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { errorLines } from "../support/error_log.js";
import { COPY_ID, activeFilterEntry, restart } from "./wheel_order_restart_scenario.js";

test("an unreadable saved source falls back to All Tables, logged", async () => {
    const { fake, lang } = await restart({
        cabinet: { wheelOrder: "alphabetical", wheelOrderSource: 42 },
        restored: { filterId: COPY_ID, wheel: ["Black Knight"] },
    });

    assert.equal(fake.currentFilterId(), "All");
    assert.equal(activeFilterEntry(fake, lang), lang.customMenuLabels.activeFilter("All Tables"));
    const errors = errorLines(fake);
    assert.equal(errors.length, 1, errors.join("\n"));
    assert.match(errors[0], /\[WheelOrder\] ERROR .*42.*All/);
});

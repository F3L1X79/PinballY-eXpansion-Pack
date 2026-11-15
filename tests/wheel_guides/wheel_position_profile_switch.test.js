// ============================================================
// The Wheel Position through main.js follows a Profile switch: a Child
// Profile's wheel loses the Adult Tables, and the count follows at once.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownPosition, table } from "./wheel_guides_scenario.js";
import { settle } from "../support/fake_pinbally_host.js";
import { assertNoErrorLogged } from "../support/error_log.js";

const TABLES = [
    table("Addams Family", 1992),
    table("Black Knight", 1980, { categories: ["NSFW"] }),
    table("Cyclone", 1988),
    table("Dracula", 1993),
];

test("the Wheel Position follows the wheel of the Profile switched to", async () => {
    const { fake, switchTo } = await startWheelGuides({
        tables: TABLES, profiles: { Kid: { isChild: true }, Mom: {} }, active: "Mom",
    });
    fake.moveWheel(2);
    assert.equal(fake.getCurrentTable().title, "Cyclone");
    assert.equal(shownPosition(fake), "3/4");

    switchTo("Kid");
    assert.equal(fake.getCurrentTable().title, "Cyclone");
    assert.equal(shownPosition(fake), "2/3", "without the Adult Table, at once");
    await settle();
    assert.equal(shownPosition(fake), "2/3");

    switchTo("Mom");
    await settle();
    assert.equal(shownPosition(fake), "3/4");
    assertNoErrorLogged(fake);
});

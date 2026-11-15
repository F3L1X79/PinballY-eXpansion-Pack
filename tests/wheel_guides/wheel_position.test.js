// ============================================================
// The Wheel Position through main.js: the selected table's place in the
// wheel's order in the bottom right corner, following the player's moves,
// Next Page, a Wheel Order toggle and a filter choice; the lower status line
// without its "Table n/total", each message starting with a capital.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startWheelGuides, shownPosition, positionedMessages } from "./wheel_guides_scenario.js";
import { assertNoErrorLogged } from "../support/error_log.js";

test("the Wheel Position follows the wheel, in the wheel's order, and leaves the status line", async () => {
    const { fake, lang, chooseWheelOrder, chooseInFilterPicker } = await startWheelGuides();

    assert.equal(shownPosition(fake), "1/5", "on the first table at startup");
    assert.deepEqual(positionedMessages(fake), [], "no Table n/total in the lower status line");
    assert.ok(fake.lowerStatusLine().includes("Released in [Game.Year]."), "the message starts with a capital");
    assert.ok(fake.lowerStatusLine().includes("Made by [Game.Manuf]."));

    fake.moveWheel(3);
    assert.equal(fake.getCurrentTable().title, "Dracula");
    assert.equal(shownPosition(fake), "4/5");

    fake.pressPageButton("NextPage");
    assert.equal(fake.getCurrentTable().title, "Eight Ball");
    assert.equal(shownPosition(fake), "5/5", "Next Page");
    fake.pressPageButton("PrevPage");
    assert.equal(fake.getCurrentTable().title, "Dracula");
    assert.equal(shownPosition(fake), "4/5", "Previous Page");
    fake.pressPageButton("NextPage");

    await chooseWheelOrder(lang.customMenuLabels.wheelOrderAlphabetical, lang.customMenuLabels.wheelOrderPageByYear);
    assert.equal(fake.getCurrentTable().title, "Eight Ball");
    assert.equal(shownPosition(fake), "1/5", "by year, Eight Ball (1977) comes first");

    await chooseInFilterPicker("Favorites");
    assert.deepEqual(fake.getWheelTables().map(game => game.title).sort(), ["Addams Family", "Cyclone", "Eight Ball"]);
    assert.equal(fake.getCurrentTable().title, "Eight Ball");
    assert.equal(shownPosition(fake), "1/3", "by year among the Favorite Tables");
    fake.moveWheel(1);
    assert.equal(shownPosition(fake), "2/3");
    assertNoErrorLogged(fake);
});

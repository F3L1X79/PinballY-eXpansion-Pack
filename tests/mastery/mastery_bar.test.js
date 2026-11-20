// ============================================================
// The Table Mastery Add-on, started by main.js on the fake PinballY
// globals, shows the Mastery Bar of the selected table: "Discover" with
// an empty bar for a table never played, then the Mastery Level its Plays
// reached, from the first Play on; a game under a minute changes nothing.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { startScenario, shownMastery, shownTopEdge, play, select, errorLines, playedFor, TABLES, MINUTE, HOUR } from "./mastery_bar_scenario.js";
import { tierMetalOf, tierOf } from "../../common/mastery/table_mastery.js";

const [NEVER_PLAYED, FAVOURITE, OLD_HAND] = TABLES;

test("the Mastery Bar shows the selected table's Mastery Level, from the first Play on", async () => {
    // Guest already spent 12 hours on one table before Table Mastery came.
    const fake = await startScenario({ profiles: { guest: { plays: { [OLD_HAND.configId]: playedFor(12 * HOUR) } } } });

    assert.deepEqual(shownMastery(fake), { head: "Discover", number: null, fill: 0 }, "a table never played");
    assert.equal(shownTopEdge(fake), null, "no edge on a table to discover");

    await play(fake, NEVER_PLAYED, 59);
    assert.deepEqual(shownMastery(fake), { head: "Discover", number: null, fill: 0 }, "a game under a minute changes nothing");

    await play(fake, NEVER_PLAYED, MINUTE);
    assert.deepEqual(shownMastery(fake), { head: "Rookie", number: "1", fill: 0 }, "the first Play reaches level 1");
    assert.equal(shownTopEdge(fake), tierMetalOf(tierOf(1)), "an edge of the bar's own metal");

    // 1 + 14 = 15 minutes: halfway to level 2, at 30 minutes.
    await play(fake, NEVER_PLAYED, 14 * MINUTE);
    assert.deepEqual(shownMastery(fake), { head: "Rookie", number: "1", fill: 0.5 });

    await play(fake, NEVER_PLAYED, 15 * MINUTE);
    assert.deepEqual(shownMastery(fake), { head: "Apprentice", number: "2", fill: 0 }, "30 minutes in all reach level 2");

    select(fake, OLD_HAND);
    assert.deepEqual(shownMastery(fake), { head: "Pinball Wizard", number: "10", fill: 1 }, "12 hours: level 10, a full bar");
    assert.equal(shownTopEdge(fake), tierMetalOf(tierOf(10)));
    assert.notEqual(tierMetalOf(tierOf(10)), tierMetalOf(tierOf(1)), "the edge follows the tier");

    select(fake, FAVOURITE);
    assert.deepEqual(shownMastery(fake), { head: "Discover", number: null, fill: 0 });

    assert.deepEqual(errorLines(fake), []);
});

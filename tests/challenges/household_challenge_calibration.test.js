// ============================================================
// Household Challenge targets calibrated on the Household's weeks: the
// calibration scenarios' Play Logs (calibration_scenario.js), the Challenges
// off so that every template can be drawn, the target read from cabinet.json.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHouseholdChallenge } from "../../common/challenges/household_challenge.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { FRIDAY, WEEK, CABINET_FILE, scripted, drawing, dayOf, logged, weekOfTables, longAgo, setUpPlayLogs } from "./calibration_scenario.js";

// The drawn Household Challenge, checked to be the template asked for.
function drawn(template, { draw, ...options }) {
    const { fake, store, modules } = setUpPlayLogs(options);
    const household = createHouseholdChallenge(fake, store,
        { ...modules, challenges: null, random: scripted(drawing(template, draw)) });
    household.getCurrent();
    const { current } = JSON.parse(fake.readFile(CABINET_FILE)).householdChallenge;
    assert.equal(current.template, template);
    assertNoErrorLogged(fake);
    return current;
}
const targetOf = (template, options) => drawn(template, options).target;

test("the target is the Household's second best week together plus 1", () => {
    // Distinct tables together by week: 4, 3 (both played the same ones) and 5.
    const logs = {
        Alice: [...weekOfTables(1, [1, 2]), ...weekOfTables(2, [1, 2, 3]), ...weekOfTables(3, [5, 6]), ...longAgo()],
        Bob: [...weekOfTables(1, [3, 4]), ...weekOfTables(2, [1, 2, 3]), ...weekOfTables(3, [7, 8, 9])],
    };
    assert.equal(targetOf("differentTables", { profiles: ["Alice", "Bob"], logs }), 5);

    // Minutes together by week: 130 and 100, against a range of 60 to 120.
    const minutes = {
        Alice: [logged(dayOf(1), 1, 60), logged(dayOf(2), 1, 100), ...longAgo()],
        Bob: [logged(dayOf(1, 2), 2, 70)],
    };
    assert.equal(targetOf("marathon", { profiles: ["Alice", "Bob"], logs: minutes }), 101);
});

test("the Household's target has the Challenge's floor and caps", () => {
    // One table a week together: the range's minimum.
    const few = { Alice: [...weekOfTables(1, [1]), ...weekOfTables(2, [2]), ...longAgo()], Bob: weekOfTables(2, [1]) };
    assert.equal(targetOf("differentTables", { profiles: ["Alice", "Bob"], logs: few }), 4);

    // 14 distinct tables together two weeks running, gone ones included: 10 visible tables.
    const many = {
        Alice: [...weekOfTables(1, [1, 2, 3, 4, 5, 90, 91]), ...weekOfTables(2, [1, 2, 3, 4, 5, 90, 91]), ...longAgo()],
        Bob: [...weekOfTables(1, [6, 7, 8, 9, 10, 92, 93]), ...weekOfTables(2, [6, 7, 8, 9, 10, 92, 93])],
    };
    assert.equal(targetOf("differentTables", { profiles: ["Alice", "Bob"], logs: many }), 10);

    // 5 active days together two weeks running, on a Friday: 3 days left.
    const days = (weeksBack, list) => list.map(day => logged(dayOf(weeksBack, day), 1));
    const busyDays = { Alice: [...days(1, [0, 1, 2]), ...days(2, [0, 1]), ...longAgo()], Bob: [...days(1, [3, 4]), ...days(2, [2, 3, 4])] };
    assert.equal(targetOf("activeDays", { now: FRIDAY, profiles: ["Alice", "Bob"], logs: busyDays }), 3);
});

test("Guest's Plays are left out of the Household's weeks", () => {
    const alice = [...weekOfTables(1, [1, 2, 3, 4]), ...weekOfTables(2, [1, 2, 3, 4]), ...longAgo()];
    const guest = [...weekOfTables(1, [5, 6, 7, 8]), ...weekOfTables(2, [5, 6, 7, 8])];
    assert.equal(targetOf("differentTables", { logs: { Alice: alice, guest } }), 5);
});

test("the templates the Play Log cannot recompute keep their fixed ranges", () => {
    const busy = [];
    for (let weeksBack = 1; weeksBack <= 8; weeksBack++) {
        for (const day of [0, 1, 2, 3, 4, 5, 6]) busy.push(...[1, 2, 3, 4, 5, 6, 7, 8].map(id => logged(dayOf(weeksBack, day), id, 30)));
    }
    const logs = { Alice: [...busy, ...longAgo()], Bob: busy };
    const ranges = [["neverPlayedTables", 3, 5], ["tableOfTheDayDays", 3, 5], ["tableOfTheWeekGames", 4, 8], ["randomGames", 3, 6]];
    for (const [template, lowest, highest] of ranges) {
        assert.equal(targetOf(template, { profiles: ["Alice", "Bob"], logs, draw: { target: 0.99 } }), highest, template);
        assert.equal(targetOf(template, { profiles: ["Alice", "Bob"], logs, draw: { target: 0 } }), lowest, template);
    }
});

test("a Household of one Profile gets its own calibrated Household Challenge", () => {
    // Distinct tables by week: 2, 5, 3 and 6.
    const alice = [
        ...weekOfTables(1, [1, 2]), ...weekOfTables(3, [1, 2, 3, 4, 5]), ...weekOfTables(5, [1, 2, 3]),
        ...weekOfTables(8, [1, 2, 3, 4, 5, 6]), ...longAgo(),
    ];
    assert.deepEqual(drawn("differentTables", { logs: { Alice: alice } }),
        { week: WEEK, template: "differentTables", param: null, target: 6, games: [] });
});

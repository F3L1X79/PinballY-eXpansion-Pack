// ============================================================
// Household Challenge targets calibrated on the Household's weeks: the
// calibration scenarios' Play Logs (calibration_scenario.js), the Challenges
// off so that every template can be drawn, the target read from cabinet.json.
// Each range is the Challenge's times the household factor (2 at least).
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHouseholdChallenge } from "../../common/challenges/household_challenge.js";
import { CHALLENGE_TEMPLATE_IDS, drawTemplate } from "../../common/challenges/challenge_templates.js";
import { assertNoErrorLogged } from "../support/error_log.js";
import { TABLES, WEEK, CABINET_FILE, scripted, drawing, dayOf, logged, weekOfTables, longAgo, setUpPlayLogs } from "./calibration_scenario.js";

// The templates feasible on the scenarios' 10 tables with a doubled range,
// on a Monday: no manufacturer, decade nor count of them reaches 6.
const DOUBLED_DRAWABLE = ["differentTables", "neverPlayedTables", "tableOfTheDayDays", "tableOfTheWeekGames", "activeDays",
    "endurance", "marathon", "randomGames", "sameTableGames"];
// Tripled: differentTables (12), tableOfTheDayDays and activeDays (9 days) are out too.
const TRIPLED_DRAWABLE = ["neverPlayedTables", "tableOfTheWeekGames", "endurance", "marathon", "randomGames", "sameTableGames"];

// The drawn Household Challenge, checked to be the template asked for.
function drawn(template, { draw = {}, ...options }) {
    const { fake, store, modules } = setUpPlayLogs(options);
    const household = createHouseholdChallenge(fake, store,
        { ...modules, challenges: null, random: scripted(drawing(template, { drawable: DOUBLED_DRAWABLE, ...draw })) });
    household.getCurrent();
    const { current } = JSON.parse(fake.readFile(CABINET_FILE)).householdChallenge;
    assert.equal(current.template, template);
    assertNoErrorLogged(fake);
    return current;
}
const targetOf = (template, options) => drawn(template, options).target;
const days = (weeksBack, list, minutes) => list.map(day => logged(dayOf(weeksBack, day), 1, minutes));

test("a calibrated target above the scaled minimum is the Household's second best week together plus 1", () => {
    // Distinct tables together by week: 9, 8 (both played tables 1 to 4) and 2.
    const logs = {
        Alice: [...weekOfTables(1, [1, 2, 3, 4]), ...weekOfTables(2, [1, 2, 3, 4]), ...weekOfTables(3, [1, 2]), ...longAgo()],
        Bob: [...weekOfTables(1, [5, 6, 7, 8, 9]), ...weekOfTables(2, [1, 2, 3, 4, 5, 6, 7, 8])],
    };
    assert.equal(targetOf("differentTables", { profiles: ["Alice", "Bob"], logs }), 9);

    // Minutes together by week: 250 and 200, against a doubled range of 120 to 240.
    const minutes = {
        Alice: [logged(dayOf(1), 1, 150), logged(dayOf(2), 1, 200), ...longAgo()],
        Bob: [logged(dayOf(1, 2), 2, 100)],
    };
    assert.equal(targetOf("marathon", { profiles: ["Alice", "Bob"], logs: minutes }), 201, "above the max");
});

test("a calibrated target is floored at the scaled minimum and capped by the option", () => {
    // One table a week together: the doubled minimum.
    const few = { Alice: [...weekOfTables(1, [1]), ...weekOfTables(2, [2]), ...longAgo()], Bob: weekOfTables(2, [1]) };
    assert.equal(targetOf("differentTables", { profiles: ["Alice", "Bob"], logs: few }), 8);

    // 14 distinct tables together two weeks running, gone ones included: 10 visible tables.
    const many = {
        Alice: [...weekOfTables(1, [1, 2, 3, 4, 5, 90, 91]), ...weekOfTables(2, [1, 2, 3, 4, 5, 90, 91]), ...longAgo()],
        Bob: [...weekOfTables(1, [6, 7, 8, 9, 10, 92, 93]), ...weekOfTables(2, [6, 7, 8, 9, 10, 92, 93])],
    };
    assert.equal(targetOf("differentTables", { profiles: ["Alice", "Bob"], logs: many }), 10);

    // 7 active days together two weeks running, on a Monday: 7 days left.
    const busyDays = { Alice: [...days(1, [0, 1, 2]), ...days(2, [0, 1, 2, 3]), ...longAgo()], Bob: [...days(1, [3, 4, 5, 6]), ...days(2, [4, 5, 6])] };
    assert.equal(targetOf("activeDays", { profiles: ["Alice", "Bob"], logs: busyDays }), 7);
});

test("three Profiles that played triple the minimum; one without a Play in the weeks does not count", () => {
    // 90 minutes together at best, against a tripled range of 180 to 360.
    const logs = {
        Alice: [...days(1, [0], 30), ...days(2, [0], 30), ...longAgo()],
        Bob: days(1, [1], 30),
        Carol: days(2, [2], 30),
        Dan: longAgo(),
    };
    const profiles = ["Alice", "Bob", "Carol", "Dan"];
    assert.equal(targetOf("marathon", { profiles, logs, draw: { drawable: TRIPLED_DRAWABLE } }), 180);
    // Fixed ranges are tripled too: SOME 3-6 becomes 9-18.
    assert.equal(targetOf("randomGames", { profiles, logs, draw: { drawable: TRIPLED_DRAWABLE, target: 0.99 } }), 18);
});

test("Guest's Plays are left out of the Household's weeks and of its size", () => {
    // Alice alone: doubled. Guest's tables would make 8 a week together.
    const alice = [...weekOfTables(1, [1, 2, 3, 4]), ...weekOfTables(2, [1, 2, 3, 4]), ...longAgo()];
    const guest = [...weekOfTables(1, [5, 6, 7, 8]), ...weekOfTables(2, [5, 6, 7, 8])];
    assert.equal(targetOf("differentTables", { logs: { Alice: alice, guest } }), 8);
});

test("the templates the Play Log cannot recompute draw in their range times the household factor, capped by the option", () => {
    const busy = [];
    for (let weeksBack = 1; weeksBack <= 8; weeksBack++) {
        for (const day of [0, 1, 2, 3, 4, 5, 6]) busy.push(...[1, 2, 3, 4, 5, 6, 7, 8].map(id => logged(dayOf(weeksBack, day), id, 30)));
    }
    const logs = { Alice: [...busy, ...longAgo()], Bob: busy };
    // Two players: FEW 3-5 becomes 6-10, 10 tables never played; 7 days left on Monday.
    const ranges = [["neverPlayedTables", 6, 10], ["tableOfTheDayDays", 6, 7], ["tableOfTheWeekGames", 8, 16], ["randomGames", 6, 12]];
    for (const [template, lowest, highest] of ranges) {
        assert.equal(targetOf(template, { profiles: ["Alice", "Bob"], logs, draw: { target: 0.99 } }), highest, template);
        assert.equal(targetOf(template, { profiles: ["Alice", "Bob"], logs, draw: { target: 0 } }), lowest, template);
    }
});

test("a Household of one Profile gets a calibrated Household Challenge, at least double the Challenge's minimum", () => {
    // Distinct tables by week: 2, 9, 3 and 8.
    const alice = [
        ...weekOfTables(1, [1, 2]), ...weekOfTables(3, [1, 2, 3, 4, 5, 6, 7, 8, 9]), ...weekOfTables(5, [1, 2, 3]),
        ...weekOfTables(8, [1, 2, 3, 4, 5, 6, 7, 8]), ...longAgo(),
    ];
    assert.deepEqual(drawn("differentTables", { logs: { Alice: alice } }),
        { week: WEEK, template: "differentTables", param: null, target: 9, games: [] });
});

test("an option capped below the scaled minimum is never drawn; with none feasible, nothing is", () => {
    const context = { visibleTables: TABLES, now: new Date(2026, 8, 21), daysLeft: 7, reachableCount: () => TABLES.length };
    const firstOf = (excluded, factor) => {
        const result = drawTemplate(context, excluded, () => 0, factor);
        return result && result.id;
    };
    // differentDecades: 5 decades, FEW 3-5.
    const allBut = id => CHALLENGE_TEMPLATE_IDS.filter(other => other !== id);
    assert.equal(firstOf(allBut("differentDecades"), 1), "differentDecades");
    assert.equal(firstOf(allBut("differentDecades"), 2), null, "5 decades, 6 needed");
});

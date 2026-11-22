// ============================================================
// The Household Challenge's completion over the fake host with real modules:
// the Household Challenge Toast and its Confetti Shower for the completing
// Profile, the same toast once for each other helper on its next arrival,
// and the credited count in profile.json, which a Profile Reset takes back.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createPeriodTable, TABLE_OF_THE_DAY, TABLE_OF_THE_WEEK } from "../../common/tables/period_table.js";
import { createRandomGame } from "../../common/tables/random_game.js";
import { createHouseholdChallenge } from "../../common/challenges/household_challenge.js";
import { createHouseholdChallengeCard } from "../../common/challenges/challenge_card.js";
import { createWheelMarks } from "../../common/core/wheel_marks.js";
import { createAchievementToasts } from "../../common/achievements/achievement_toast.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import lang from "../../common/core/i18n.js";
import { assertNoErrorLogged } from "../support/error_log.js";

// Monday 21 September 2026, 20:00.
const MONDAY = new Date(2026, 8, 21, 20, 0, 0);
const NEXT_MONDAY = new Date(2026, 8, 28, 20, 0, 0);

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const CABINET_FILE = `${PROFILES}\\cabinet.json`;
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;

const table = (id, manufacturer, year) =>
    ({ id, configId: `Table ${id}`, title: `Table ${id}`, manufacturer, year, isHidden: false });
const TABLES = [table(1, "Williams", 1992), table(2, "Bally", 1995), table(3, "Stern", 2016), table(4, "Gottlieb", 1978)];
const HOUSE_TEXT = lang.householdChallenge;
// The week's Household Challenge with the draw below: 4 different tables.
const TITLE = lang.challenges.titles.differentTables(4);
const toastOf = count => [HOUSE_TEXT.toastHeader.toLocaleUpperCase(), TITLE, HOUSE_TEXT.toastDescription(count)].join(" | ");

// Alice's Play five complete weeks back: the Household's Play Log covers 4 weeks.
const PLAY_LOG = JSON.stringify({ version: 1, plays: [{ start: "2026-08-17T20:00:00", configId: "Table 1", seconds: 120 }] });

// The Challenges off; the Household Challenge drawn as differentTables, target 4.
function setUp({ profiles = ["Alice", "Bob"], active = "Alice" } = {}) {
    const fake = createFakePinballYHost({ now: MONDAY, tables: TABLES, layoutSize: { width: 1080, height: 1920 } });
    fake.installGlobals();
    for (const name of profiles) fake.addFolder(`${PROFILES}\\${name}`);
    fake.addFile(`${PROFILES}\\Alice\\play-log-2026.json`, PLAY_LOG);
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: active }));
    const store = createProfileStore(fake);
    const showers = [];
    const toasts = createAchievementToasts(fake, { confettiShower: { start: () => showers.push(true), endsAtMs: () => null, onStopped() {} } });
    const household = createHouseholdChallenge(fake, store, {
        challenges: null,
        tableOfTheDay: createPeriodTable(fake, TABLE_OF_THE_DAY, store),
        tableOfTheWeek: createPeriodTable(fake, TABLE_OF_THE_WEEK, store),
        randomGame: createRandomGame(fake, store, { animateTo: async () => {}, skipAnimation: true }),
        toasts,
        random: () => 0,
    });
    // The card as the pack wires it: each arrival on the wheel shows it.
    const marks = createWheelMarks(fake, { attractOrder: { onMove: () => {} }, profileStore: store, underBadge: true });
    const card = createHouseholdChallengeCard(fake, household, { topOf: () => mark.top() });
    const mark = marks.register("HouseholdChallenge", card);
    marks.start();
    return { fake, store, showers };
}

const readJson = (fake, path) => JSON.parse(fake.readFile(path));
const toastsDrawn = fake => toastDrawings(fake).map(drawing => drawing.texts.join(" | "));
// The Household Challenges the named Profile was credited for.
function creditedCount(fake, name) {
    const text = fake.readFile(profileFile(name));
    if (text === undefined) return 0;
    const { householdChallenge } = JSON.parse(text);
    return householdChallenge ? householdChallenge.creditedCount : 0;
}

// The named Profile becomes the active one, a second given to the toasts'
// arrival gap.
function arrive(fake, store, name) {
    store.switchTo(name);
    fake.advanceTime(1000);
}

function play(fake, game) {
    fake.gameStarted(game);
    fake.advanceTime(90 * 1000);
    fake.gameOver(game);
}

test("the completing Play gives the active Profile the toast and the Confetti Shower at once, and credits it", () => {
    const { fake, store, showers } = setUp();
    play(fake, TABLES[0]);
    play(fake, TABLES[1]);
    arrive(fake, store, "Bob");
    play(fake, TABLES[2]);
    assert.deepEqual(toastsDrawn(fake), [], "not completed yet");

    play(fake, TABLES[3]);
    assert.deepEqual(toastsDrawn(fake), [toastOf(1)]);
    assert.equal(showers.length, 1, "the Confetti Shower");
    assert.equal(creditedCount(fake, "Bob"), 1);
    assert.equal(creditedCount(fake, "Alice"), 0, "Alice is not here yet");

    play(fake, TABLES[0]);
    assert.equal(toastsDrawn(fake).length, 1, "completed once");
    assertNoErrorLogged(fake);
});

test("another helper gets the toast on its next arrival as the active Profile, once only, and is credited then", () => {
    const { fake, store, showers } = setUp();
    play(fake, TABLES[0]);
    arrive(fake, store, "Bob");
    for (const game of TABLES.slice(1)) play(fake, game);
    assert.equal(toastsDrawn(fake).length, 1, "Bob's");

    arrive(fake, store, "Alice");
    assert.deepEqual(toastsDrawn(fake), [toastOf(1), toastOf(1)]);
    assert.equal(showers.length, 2, "Alice's Confetti Shower");
    assert.equal(creditedCount(fake, "Alice"), 1);

    arrive(fake, store, "Bob");
    arrive(fake, store, "Alice");
    fake.fire("wheelmode");
    assert.equal(toastsDrawn(fake).length, 2, "once only");
    assert.equal(creditedCount(fake, "Alice"), 1);
    assert.equal(creditedCount(fake, "Bob"), 1);
    assertNoErrorLogged(fake);
});

test("a helper's toast dropped by a switch before it showed comes back on its next arrival", () => {
    const { fake, store } = setUp();
    play(fake, TABLES[0]);
    arrive(fake, store, "Bob");
    for (const game of TABLES.slice(1)) play(fake, game);

    // Within the arrival gap of Bob's toast: Alice's waits, then goes stale.
    store.switchTo("Alice");
    store.switchTo("Bob");
    fake.advanceTime(1000);
    assert.equal(toastsDrawn(fake).length, 1, "Bob's only");
    assert.equal(creditedCount(fake, "Alice"), 0);

    arrive(fake, store, "Alice");
    assert.equal(toastsDrawn(fake).length, 2);
    assert.equal(creditedCount(fake, "Alice"), 1);
    assertNoErrorLogged(fake);
});

test("a helper away until the next week still gets the toast and the credit", () => {
    const { fake, store } = setUp({ active: "Bob" });
    play(fake, TABLES[0]);
    arrive(fake, store, "Alice");
    for (const game of TABLES.slice(1)) play(fake, game);

    fake.setNow(NEXT_MONDAY);
    fake.fire("wheelmode");
    arrive(fake, store, "Bob");
    assert.deepEqual(toastsDrawn(fake), [toastOf(1), toastOf(1)], "last week's Household Challenge");
    assert.equal(creditedCount(fake, "Bob"), 1);
    assertNoErrorLogged(fake);
});

test("a Profile that did not help gets no toast and no credit, even with a Play after the completion", () => {
    const { fake, store } = setUp({ profiles: ["Alice", "Bob", "Carol"] });
    for (const game of TABLES) play(fake, game);

    arrive(fake, store, "Carol");
    play(fake, TABLES[0]);
    arrive(fake, store, "Bob");
    assert.equal(toastsDrawn(fake).length, 1, "Alice's only");
    assert.equal(creditedCount(fake, "Carol"), 0);
    assert.equal(creditedCount(fake, "Bob"), 0);
    assertNoErrorLogged(fake);
});

test("a Profile Reset takes the credited count back, leaving the other Profiles' credits and cabinet.json's weeks", () => {
    const { fake, store } = setUp();
    play(fake, TABLES[0]);
    arrive(fake, store, "Bob");
    for (const game of TABLES.slice(1)) play(fake, game);
    arrive(fake, store, "Alice");
    const cabinetBefore = readJson(fake, CABINET_FILE).householdChallenge;

    store.resetProfile("Alice");
    assert.equal(creditedCount(fake, "Alice"), 0);
    assert.equal(creditedCount(fake, "Bob"), 1);
    assert.deepEqual(readJson(fake, CABINET_FILE).householdChallenge, cabinetBefore);

    arrive(fake, store, "Bob");
    arrive(fake, store, "Alice");
    assert.equal(toastsDrawn(fake).length, 2, "no second toast after the reset");
    assertNoErrorLogged(fake);
});

test("a helper reset before its toast showed starts over: no toast and no credit for that week", () => {
    const { fake, store } = setUp();
    play(fake, TABLES[0]);
    arrive(fake, store, "Bob");
    for (const game of TABLES.slice(1)) play(fake, game);
    const games = readJson(fake, CABINET_FILE).householdChallenge.current.games;

    store.resetProfile("Alice");
    arrive(fake, store, "Alice");
    assert.equal(toastsDrawn(fake).length, 1, "Bob's only");
    assert.equal(creditedCount(fake, "Alice"), 0);
    assert.deepEqual(readJson(fake, CABINET_FILE).householdChallenge.current.games, games, "the week's Plays kept");
    assertNoErrorLogged(fake);
});

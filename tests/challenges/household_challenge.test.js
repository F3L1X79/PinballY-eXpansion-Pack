// ============================================================
// The Household Challenge over the fake host with real modules, a scripted
// random source and fixed dates: the week's draw in cabinet.json, every
// Profile's counted Plays recorded there, contributors, and the Household
// Challenge Card under the Challenge Card (a point while hidden).
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createPeriodTable, TABLE_OF_THE_DAY, TABLE_OF_THE_WEEK } from "../../common/tables/period_table.js";
import { createRandomGame } from "../../common/tables/random_game.js";
import { createChallenges } from "../../common/challenges/challenge.js";
import { createHouseholdChallenge } from "../../common/challenges/household_challenge.js";
import {
    createChallengeCard, createHouseholdChallengeCard, CHALLENGE_CARD_Z_INDEX, HOUSEHOLD_CHALLENGE_CARD_Z_INDEX, CHALLENGE_VERDICT_MS,
} from "../../common/challenges/challenge_card.js";
import { createWheelMarks } from "../../common/core/wheel_marks.js";
import { TOP_RIGHT_STACK } from "../../common/drawing/top_right_stack.js";
import { createAchievementToasts } from "../../common/achievements/achievement_toast.js";
import lang from "../../common/core/i18n.js";
import { isPoint, layersBreakingTheRule } from "../support/hidden_layer_rule.js";
import { assertNoErrorLogged } from "../support/error_log.js";

// Monday 21 September 2026, 20:00; its week is keyed "2026-09-21".
const MONDAY = new Date(2026, 8, 21, 20, 0, 0);
const SUNDAY_NIGHT = new Date(2026, 8, 27, 23, 59, 0);
const NEXT_MONDAY = new Date(2026, 8, 28, 20, 0, 0);
const WEEK = "2026-09-21";
const LAST_WEEK = "2026-09-14";
const NEXT_WEEK = "2026-09-28";
const REFERENCE_HEIGHT = 1920;
const BADGE = 170;

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const CABINET_FILE = `${PROFILES}\\cabinet.json`;
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;
const playLogFile = (name, year) => `${PROFILES}\\${name}\\play-log-${year}.json`;

const table = (id, manufacturer, year) =>
    ({ id, configId: `Table ${id}`, title: `Table ${id}`, manufacturer, year, isHidden: false });
const TABLES = [table(1, "Williams", 1992), table(2, "Bally", 1995), table(3, "Stern", 2016), table(4, "Gottlieb", 1978)];
const TEXT = lang.challenges;
const HOUSE_TEXT = lang.householdChallenge;

// A random source that returns these values in turn, then 0.
const scripted = values => () => (values.length > 0 ? values.shift() : 0);
// One logged Play on that day.
const logged = day => ({ start: `${day}T20:00:00`, configId: "Table 1", seconds: 120 });
// Alice's Play five complete weeks back: the Household's Play Log covers 4 weeks.
const ENOUGH_LOG = { Alice: [logged("2026-08-17")] };
// A lock of the week, as cabinet.json keeps it.
const lockOf = (template, target, { param = null, week = WEEK, games = [] } = {}) => ({ week, template, param, target, games });

// saved: the Household Challenge's locks already in cabinet.json; plays:
// each Profile's play records; logs: each Profile's Play Log, Guest's under
// "guest"; challenges: whether the Challenges are on, their draw scripted by
// challengeRandoms; randoms: the Household Challenge's draw.
function setUp({
    now = MONDAY, tables = TABLES, profiles = ["Alice", "Bob"], active = "Alice", randoms = [], challengeRandoms = [0, 0, 0.99],
    saved, plays = {}, logs = ENOUGH_LOG, challenges = true, underBadge = true,
} = {}) {
    const fake = createFakePinballYHost({ now, tables, layoutSize: { width: 1080, height: 1920 } });
    fake.installGlobals();
    for (const name of [...profiles, ...(logs.guest ? ["guest"] : [])]) {
        fake.addFolder(`${PROFILES}\\${name}`);
        if (plays[name]) fake.addFile(profileFile(name), JSON.stringify({ plays: plays[name] }));
        for (const play of logs[name] || []) fake.addFile(playLogFile(name, play.start.slice(0, 4)), JSON.stringify({ version: 1, plays: [play] }));
    }
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: active, ...(saved ? { householdChallenge: saved } : {}) }));
    const store = createProfileStore(fake);
    const tableOfTheDay = createPeriodTable(fake, TABLE_OF_THE_DAY, store);
    const tableOfTheWeek = createPeriodTable(fake, TABLE_OF_THE_WEEK, store);
    const randomGame = createRandomGame(fake, store, { animateTo: async () => {}, skipAnimation: true });
    const toasts = createAchievementToasts(fake);
    const challengeModule = challenges
        ? createChallenges(fake, store, { tableOfTheDay, tableOfTheWeek, randomGame, toasts, random: scripted([...challengeRandoms]) })
        : null;
    const household = createHouseholdChallenge(fake, store,
        { challenges: challengeModule, tableOfTheDay, tableOfTheWeek, randomGame, toasts, random: scripted([...randoms]) });
    // The cards as the pack wires them: Wheel Marks, their tops from the stack.
    const marks = createWheelMarks(fake, { attractOrder: { onMove: () => {} }, profileStore: store, underBadge });
    if (challengeModule) {
        const card = createChallengeCard(fake, challengeModule, { topOf: () => challengeMark.top() });
        const challengeMark = marks.register("Challenges", card);
    }
    const houseCard = createHouseholdChallengeCard(fake, household, { topOf: () => houseMark.top() });
    const houseMark = marks.register("HouseholdChallenge", houseCard);
    marks.start();
    return { fake, store, household, marks };
}

const readJson = (fake, path) => JSON.parse(fake.readFile(path));
const cabinetLocks = fake => readJson(fake, CABINET_FILE).householdChallenge;
const recorded = fake => cabinetLocks(fake).current.games.map(game => [game.profile, game.configId]);

function layerAt(fake, zIndex) {
    const layers = fake.drawingLayers().filter(layer => layer.zIndex === zIndex);
    assert.equal(layers.length, 1, `one card layer at ${zIndex}`);
    return layers[0];
}
const houseCard = fake => layerAt(fake, HOUSEHOLD_CHALLENGE_CARD_Z_INDEX);
const cardShown = fake => houseCard(fake).alpha > 0 && houseCard(fake).texts().length > 0;
const cardShows = (fake, text) => cardShown(fake) && houseCard(fake).texts().includes(text);
// How far below the window's top a card's canvas sits, in reference px.
const topOf = layer => Math.round(-layer.position().y * REFERENCE_HEIGHT);

function play(fake, game, seconds = 90) {
    fake.gameStarted(game);
    fake.advanceTime(seconds * 1000);
    fake.gameOver(game);
}

test("the week's Household Challenge is drawn once, locked in cabinet.json, never with the week's Challenge template", () => {
    // The Challenge draws differentTables; the Household Challenge the first
    // template left, calibrated on Alice's single Play: the range's minimum.
    const { fake } = setUp({ randoms: [0, 0, 0.99] });

    assert.equal(readJson(fake, CABINET_FILE).challenge.current.template, "differentTables");
    assert.deepEqual(cabinetLocks(fake), { current: lockOf("differentManufacturers", 3), previous: null });
    assert.ok(cardShows(fake, HOUSE_TEXT.cardHeader.toLocaleUpperCase()));
    assert.ok(cardShows(fake, TEXT.titles.differentManufacturers(3)));
    assert.ok(cardShows(fake, TEXT.progress(0, 3, TEXT.daysLeft(7))));

    fake.setNow(SUNDAY_NIGHT);
    fake.fire("wheelmode");
    assert.deepEqual(cabinetLocks(fake), { current: lockOf("differentManufacturers", 3), previous: null }, "the same all week");
    assertNoErrorLogged(fake);
});

test("a new week's Household Challenge never has last week's template", () => {
    const lastWeek = lockOf("differentTables", 4, { week: LAST_WEEK });
    const { fake } = setUp({ challenges: false, saved: { current: lastWeek, previous: null }, randoms: [0, 0, 0.99] });

    assert.deepEqual(cabinetLocks(fake), {
        current: lockOf("differentManufacturers", 3),
        previous: { ...lastWeek, verdictSeenBy: ["Alice"] },
    }, "last week's verdict shown to Alice at startup");
});

test("with the Challenges off, any template can be drawn, the target in its range capped by what the Household can reach", () => {
    const { fake } = setUp({ challenges: false, randoms: [0, 0, 0.99] });

    assert.equal(readJson(fake, CABINET_FILE).challenge, undefined, "no Challenge drawn");
    assert.deepEqual(cabinetLocks(fake).current, lockOf("differentTables", 4), "min(8, 4 visible tables)");
});

test("no Household Challenge before the Household's Play Log covers 4 complete weeks, Guest's Plays not counting", () => {
    // Alice's first Play three weeks back; Guest's long ago.
    const { fake } = setUp({ logs: { Alice: [logged("2026-08-31")], guest: [logged("2026-01-05")] } });

    assert.deepEqual(cabinetLocks(fake), { current: lockOf("", 0), previous: null });
    assert.ok(!cardShown(fake));
    assert.ok(isPoint(houseCard(fake)), "nothing to show: a point");
    assert.deepEqual(layersBreakingTheRule(fake), []);
});

test("every Profile's Plays add up, Guest's included, recorded in cabinet.json with their Profile", () => {
    const { fake, store } = setUp({ challenges: false, randoms: [0, 0, 0] });

    play(fake, TABLES[0]);
    store.switchTo("Bob");
    play(fake, TABLES[1]);
    play(fake, TABLES[0]);
    store.switchTo("guest");
    play(fake, TABLES[2]);
    play(fake, TABLES[3], 59);

    assert.deepEqual(recorded(fake), [["Alice", "Table 1"], ["Bob", "Table 2"], ["Bob", "Table 1"], ["guest", "Table 3"]],
        "a game under a minute is no Play");
    assert.ok(cardShows(fake, TEXT.progress(3, 4, TEXT.daysLeft(7))), "Guest sees the house's progress");
    store.switchTo("Alice");
    assert.ok(cardShows(fake, TEXT.progress(3, 4, TEXT.daysLeft(7))), "the same for every Profile");
    assertNoErrorLogged(fake);
});

test("a never played table is judged for the Profile who plays it", () => {
    const { fake, store } = setUp({
        saved: { current: lockOf("neverPlayedTables", 3), previous: null },
        plays: { Alice: { "Table 1": { count: 2, seconds: 300, lastPlayed: "2026-09-01T20:00:00" } } },
    });

    play(fake, TABLES[0]);
    assert.ok(cardShows(fake, TEXT.progress(0, 3, TEXT.daysLeft(7))), "Alice already knows Table 1");
    store.switchTo("Bob");
    play(fake, TABLES[0]);
    assert.ok(cardShows(fake, TEXT.progress(1, 3, TEXT.daysLeft(7))), "Bob never played it");
});

test("a dusty table is judged for the Profile who plays it", () => {
    const { fake, store } = setUp({
        active: "Bob",
        saved: { current: lockOf("dustyTables", 3), previous: null },
        plays: {
            Alice: { "Table 1": { count: 2, seconds: 300, lastPlayed: "2025-01-05T20:00:00" } },
            Bob: { "Table 1": { count: 2, seconds: 300, lastPlayed: "2026-09-01T20:00:00" } },
        },
    });

    play(fake, TABLES[0]);
    assert.ok(cardShows(fake, TEXT.progress(0, 3, TEXT.daysLeft(7))), "Bob played Table 1 this month");
    store.switchTo("Alice");
    play(fake, TABLES[0]);
    assert.ok(cardShows(fake, TEXT.progress(1, 3, TEXT.daysLeft(7))), "dusty for Alice");
});

test("a Profile contributed with a counted Play that meets the template's condition", () => {
    const { fake, store, household } = setUp({ saved: { current: lockOf("manufacturerTables", 3, { param: "Williams" }), previous: null } });

    play(fake, TABLES[1]);
    assert.deepEqual(household.getContributors(), [], "Bally is not Williams");
    store.switchTo("Bob");
    play(fake, TABLES[0], 30);
    assert.deepEqual(household.getContributors(), [], "not a Play");
    play(fake, TABLES[0]);
    store.switchTo("guest");
    play(fake, TABLES[0]);
    assert.deepEqual(household.getContributors(), ["Bob", "guest"]);
});

test("without a condition, any counted Play makes a contributor", () => {
    const { fake, store, household } = setUp({ saved: { current: lockOf("marathon", 60), previous: null } });

    store.switchTo("Bob");
    play(fake, TABLES[1]);
    store.switchTo("Alice");
    play(fake, TABLES[1]);
    assert.deepEqual(household.getContributors(), ["Bob", "Alice"]);
});

test("the card shows the Household Challenge completed until Sunday, then last week's verdict once per Profile", () => {
    const { fake, store } = setUp({ challenges: false, randoms: [0, 0, 0] });
    play(fake, TABLES[0]);
    play(fake, TABLES[1]);
    store.switchTo("Bob");
    play(fake, TABLES[2]);
    play(fake, TABLES[3]);
    assert.ok(cardShows(fake, HOUSE_TEXT.completed));
    store.switchTo("Alice");
    assert.ok(cardShows(fake, HOUSE_TEXT.completed), "completed for the whole house");

    fake.setNow(SUNDAY_NIGHT);
    fake.fire("wheelmode");
    assert.ok(cardShows(fake, HOUSE_TEXT.completed), "until Sunday");

    fake.setNow(NEXT_MONDAY);
    fake.fire("wheelmode");
    assert.equal(cabinetLocks(fake).current.week, NEXT_WEEK);
    assert.ok(cardShows(fake, HOUSE_TEXT.verdictHeader.toLocaleUpperCase()));
    assert.ok(cardShows(fake, TEXT.titles.differentTables(4)));
    assert.ok(cardShows(fake, HOUSE_TEXT.completed));
    fake.advanceTime(CHALLENGE_VERDICT_MS);
    assert.ok(cardShows(fake, HOUSE_TEXT.cardHeader.toLocaleUpperCase()), "then the week's");

    store.switchTo("Bob");
    assert.ok(cardShows(fake, HOUSE_TEXT.verdictHeader.toLocaleUpperCase()), "Bob sees it too");
    fake.advanceTime(CHALLENGE_VERDICT_MS);
    store.switchTo("Alice");
    assert.ok(cardShows(fake, HOUSE_TEXT.cardHeader.toLocaleUpperCase()), "Alice saw it already");
    assertNoErrorLogged(fake);
});

test("a missed Household Challenge's verdict shows how far the house got", () => {
    const { fake } = setUp({ challenges: false, randoms: [0, 0, 0] });
    play(fake, TABLES[0]);
    play(fake, TABLES[1]);

    fake.setNow(NEXT_MONDAY);
    fake.fire("wheelmode");
    assert.ok(cardShows(fake, HOUSE_TEXT.verdictHeader.toLocaleUpperCase()));
    assert.ok(cardShows(fake, TEXT.missed(2, 4)));
});

test("the card sits right under the Challenge Card, the same width", () => {
    const { fake } = setUp({ randoms: [0, 0, 0.99] });
    const challengeCard = layerAt(fake, CHALLENGE_CARD_Z_INDEX);

    assert.equal(topOf(challengeCard), BADGE);
    // The Challenge Card's panel (124 px canvas, 10 px under it), the gap, then this card's 8 px canvas margin.
    assert.equal(topOf(houseCard(fake)), BADGE + 124 - 10 + 24 - 8);
    assert.deepEqual(houseCard(fake).canvasSize(), challengeCard.canvasSize());
    assert.equal(houseCard(fake).position().align, "top right");
});

test("with the Challenges off, the card takes the Challenge Card's place", () => {
    const { fake } = setUp({ challenges: false });

    assert.equal(topOf(houseCard(fake)), BADGE);
});

test("the card adds its panel and a gap to the stack while it shows, nothing in a week without a Household Challenge", () => {
    const shown = setUp();
    assert.equal(shown.marks.addedToStackBy(TOP_RIGHT_STACK.HOUSEHOLD_CHALLENGE_CARD), 106 + 24);

    const none = setUp({ logs: {} });
    assert.equal(none.marks.addedToStackBy(TOP_RIGHT_STACK.HOUSEHOLD_CHALLENGE_CARD), 0);
});

test("the card is a point while a game runs and in attract mode, and comes back on the wheel", () => {
    const { fake } = setUp();
    const usual = { scale: houseCard(fake).scale(), position: houseCard(fake).position() };

    fake.gameStarted(TABLES[0]);
    assert.ok(isPoint(houseCard(fake)), "a point while a game runs");
    assert.deepEqual(layersBreakingTheRule(fake), []);
    fake.advanceTime(30 * 1000);
    fake.gameOver(TABLES[0]);
    assert.deepEqual({ scale: houseCard(fake).scale(), position: houseCard(fake).position() }, usual);
    assert.ok(cardShown(fake));

    fake.enterAttractMode();
    fake.advanceTime(1);
    assert.ok(isPoint(houseCard(fake)), "a point in attract mode");
    fake.exitAttractMode();
    assert.ok(cardShown(fake));
    assert.deepEqual(layersBreakingTheRule(fake), []);
});

test("the card lights up once after a Play that moved the Household Challenge forward", () => {
    const { fake } = setUp({ challenges: false });
    fake.advanceTime(5000);
    const resting = houseCard(fake).frames().length;

    play(fake, TABLES[0]);
    assert.ok(houseCard(fake).frames().length > resting, "lit up");
    fake.advanceTime(5000);
    play(fake, TABLES[0]);
    assert.equal(houseCard(fake).frames().length, resting, "the same table again: nothing new");
});

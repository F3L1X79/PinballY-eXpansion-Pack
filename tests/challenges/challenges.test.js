// ============================================================
// Challenges over the fake host with real modules and a scripted random
// source: the week's draw in cabinet.json, counted games in profile.json,
// the card, the Challenge Toast and the previous week's verdict.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { toastDrawings } from "../achievements/achievement_toast_reader.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createPeriodTable, TABLE_OF_THE_DAY, TABLE_OF_THE_WEEK } from "../../common/tables/period_table.js";
import { createRandomGame } from "../../common/tables/random_game.js";
import { createChallenges, CHALLENGE_TEMPLATE_IDS } from "../../common/challenges/challenge.js";
import { createChallengeCard, CHALLENGE_CARD_Z_INDEX, CHALLENGE_VERDICT_MS } from "../../common/challenges/challenge_card.js";
import { createAchievementToasts } from "../../common/achievements/achievement_toast.js";
import config from "../../common/core/config.js";
import lang from "../../common/core/i18n.js";

// Monday 21 September 2026, 20:00; its week is keyed "2026-09-21".
const MONDAY = new Date(2026, 8, 21, 20, 0, 0);
const TUESDAY = new Date(2026, 8, 22, 20, 0, 0);
const WEDNESDAY = new Date(2026, 8, 23, 20, 0, 0);
const FRIDAY = new Date(2026, 8, 25, 20, 0, 0);
const SATURDAY = new Date(2026, 8, 26, 20, 0, 0);
const SUNDAY_NIGHT = new Date(2026, 8, 27, 23, 59, 0);
const NEXT_MONDAY = new Date(2026, 8, 28, 20, 0, 0);
const WEEK = "2026-09-21";
const NEXT_WEEK = "2026-09-28";
const MINUTE_MS = 60 * 1000;
const HIGHLIGHT_OVER_MS = 5000;
// Longer than a toast's whole life (rise, hold, fade).
const ONE_TOAST_MS = 6000;

const PROFILES = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";
const CABINET_FILE = `${PROFILES}\\cabinet.json`;
const profileFile = name => `${PROFILES}\\${name}\\profile.json`;

const table = (id, manufacturer, year) =>
    ({ id, configId: `Table ${id}`, title: `Table ${id}`, manufacturer, year, isHidden: false });
const TABLES = [table(1, "Williams", 1992), table(2, "Bally", 1995), table(3, "Stern", 2016), table(4, "Gottlieb", 1978)];
const TEXT = lang.challenges;

// A random source that returns these values in turn, then 0.
const scripted = values => () => (values.length > 0 ? values.shift() : 0);

// saved: the week's lock already in cabinet.json and each Profile's
// "challenge" record already in its profile.json; plays: each Profile's
// play records already there, Guest's under "guest".
function setUp({ now = MONDAY, tables = TABLES, profiles = ["Alice", "Bob"], active = "Alice", randoms = [], saved = {}, plays = {}, underBadge = true } = {}) {
    const fake = createFakePinballYHost({ now, tables, layoutSize: { width: 1080, height: 1920 } });
    fake.installGlobals();
    for (const name of [...profiles, ...(plays.guest ? ["guest"] : [])]) {
        fake.addFolder(`${PROFILES}\\${name}`);
        if (saved[name] || plays[name]) fake.addFile(profileFile(name), JSON.stringify({ challenge: saved[name], plays: plays[name] }));
    }
    fake.addFile(CABINET_FILE, JSON.stringify({ version: 1, activeProfile: active, challenge: saved.cabinet }));
    const store = createProfileStore(fake);
    const tableOfTheDay = createPeriodTable(fake, TABLE_OF_THE_DAY, store);
    const tableOfTheWeek = createPeriodTable(fake, TABLE_OF_THE_WEEK, store);
    const randomGame = createRandomGame(fake, store, { animateTo: async () => {}, skipAnimation: true });
    const toasts = createAchievementToasts(fake);
    const challenges = createChallenges(fake, store,
        { tableOfTheDay, tableOfTheWeek, randomGame, toasts, random: scripted([...randoms]) });
    createChallengeCard(fake, challenges, store, { underBadge });
    return { fake, store, toasts, challenges, tableOfTheDay, tableOfTheWeek, randomGame };
}

const readJson = (fake, path) => JSON.parse(fake.readFile(path));
const cabinetChallenge = fake => readJson(fake, CABINET_FILE).challenge;
const profileChallenge = (fake, name) => readJson(fake, profileFile(name)).challenge;

function card(fake) {
    const layers = fake.drawingLayers().filter(layer => layer.zIndex === CHALLENGE_CARD_Z_INDEX);
    assert.equal(layers.length, 1, "one Challenge Card layer");
    return layers[0];
}
const cardShown = fake => card(fake).alpha > 0 && card(fake).texts().length > 0;
const cardShows = (fake, text) => cardShown(fake) && card(fake).texts().includes(text);
// The highlight glows around the card: frames the resting card doesn't have.
const restingFrames = fake => {
    fake.advanceTime(HIGHLIGHT_OVER_MS);
    return card(fake).frames().length;
};

// Every toast drawn so far, its texts joined: header | title | description.
const toastsDrawn = fake => toastDrawings(fake)
    .map(drawing => drawing.texts.join(" | "));

function play(fake, game, seconds) {
    fake.gameStarted(game);
    fake.advanceTime(seconds * 1000);
    fake.gameOver(game);
}

test("the week's Challenge is drawn once, locked in cabinet.json and shown on the card", () => {
    // Template, option, then the highest target: min(8, 4 visible tables).
    const { fake } = setUp({ randoms: [0, 0, 0.99] });

    assert.deepEqual(cabinetChallenge(fake), {
        current: { week: WEEK, template: "differentTables", param: null, target: 4 },
        previous: null,
    });
    assert.ok(cardShows(fake, TEXT.titles.differentTables(4)));
    assert.ok(cardShows(fake, TEXT.progress(0, 4, TEXT.daysLeft(7))));
    assert.ok(cardShows(fake, TEXT.cardHeader.toLocaleUpperCase()));
});

test("the Challenge stays the same all week, even when tables are hidden or added", () => {
    const { fake } = setUp({ randoms: [0, 0, 0.99] });
    const drawn = cabinetChallenge(fake);

    fake.setNow(SUNDAY_NIGHT);
    fake.setTables([...TABLES.slice(0, 1), table(5, "Stern", 2020), table(6, "Stern", 2021)]);
    fake.fire("wheelmode");

    assert.deepEqual(cabinetChallenge(fake), drawn);
    assert.ok(cardShows(fake, TEXT.progress(0, 4, TEXT.lastDay)));
});

test("differentTables draws its target between 4 and 8, at most the number of visible tables", () => {
    const nineTables = [...TABLES, table(5, "Stern", 2020), table(6, "Stern", 2021), table(7, "Data East", 1990),
        table(8, "Bally", 1980), table(9, "Williams", 1985)];
    assert.deepEqual(drawnOf(nineTables, "differentTables"), ["differentTables:null:4", "differentTables:null:8"]);
    assert.deepEqual(drawnOf([...TABLES, table(5, "Stern", 2020)], "differentTables"),
        ["differentTables:null:4", "differentTables:null:5"]);
    assert.deepEqual(drawnOf(TABLES.slice(0, 3), "differentTables"), [], "3 visible tables: below 4");
});

test("with no visible table there is no Challenge and no card", () => {
    const { fake } = setUp({ tables: [{ ...table(1, "Williams", 1992), isHidden: true }] });

    assert.deepEqual(cabinetChallenge(fake).current, { week: WEEK, template: "", param: null, target: 0 });
    assert.ok(!cardShown(fake));
});

test("an unconfigured table counts neither in a draw nor in a Challenge's progress", () => {
    const unconfigured = { ...table(5, "Stern", 2020), isConfigured: false };
    assert.deepEqual(drawnOf([...TABLES, unconfigured], "differentTables"),
        ["differentTables:null:4"], "the target stays within the 4 configured tables");

    const { fake } = setUp({ tables: [...TABLES, unconfigured], randoms: [0, 0, 0.99] });
    play(fake, TABLES[0], 60);
    assert.ok(cardShows(fake, TEXT.progress(1, 4, TEXT.daysLeft(7))));
    play(fake, unconfigured, 5 * 60);
    assert.ok(cardShows(fake, TEXT.progress(1, 4, TEXT.daysLeft(7))), "a Play on it adds nothing");
});

test("a Challenge never points to an unconfigured table", () => {
    const unconfigured = { ...table(5, "Stern", 2020), isConfigured: false };
    const { challenges } = setUpDrawn([...TABLES, unconfigured], "neverPlayedTables");

    assert.deepEqual(challenges.getTablesToPlay().map(game => game.configId), TABLES.map(game => game.configId));
});

test("a new week draws a new Challenge, never with the previous template", () => {
    const { fake } = setUp({ randoms: [0, 0, 0.99] });
    const lastWeek = cabinetChallenge(fake).current;

    fake.setNow(NEXT_MONDAY);
    fake.fire("wheelmode");

    // The first candidate left once differentTables is out: no manufacturer
    // or decade has 3 visible tables, but there are 4 manufacturers.
    assert.deepEqual(cabinetChallenge(fake), {
        current: { week: "2026-09-28", template: "differentManufacturers", param: null, target: 3 },
        previous: lastWeek,
    });
    fake.advanceTime(CHALLENGE_VERDICT_MS);
    assert.ok(cardShows(fake, TEXT.titles.differentManufacturers(3)));
});

test("a game counts from 60 seconds on a visible table, and progress counts distinct tables", () => {
    const { fake } = setUp({ randoms: [0, 0, 0.99] });

    play(fake, TABLES[0], 59);
    assert.ok(cardShows(fake, TEXT.progress(0, 4, TEXT.daysLeft(7))), "a game under a minute doesn't count");

    play(fake, TABLES[0], 60);
    assert.ok(cardShows(fake, TEXT.progress(1, 4, TEXT.daysLeft(7))));

    play(fake, TABLES[0], 5 * 60);
    assert.ok(cardShows(fake, TEXT.progress(1, 4, TEXT.daysLeft(7))), "the same table again adds nothing");

    fake.gameStarted(TABLES[1]);
    fake.advanceTime(2 * MINUTE_MS);
    fake.setTables([TABLES[0], { ...TABLES[1], isHidden: true }, TABLES[2], TABLES[3]]);
    fake.gameOver(TABLES[1]);
    assert.ok(cardShows(fake, TEXT.progress(1, 4, TEXT.daysLeft(7))), "a table hidden by the end doesn't count");

    play(fake, TABLES[2], 90);
    assert.ok(cardShows(fake, TEXT.progress(2, 4, TEXT.daysLeft(7))));

    const games = profileChallenge(fake, "Alice").games;
    assert.deepEqual(games.map(game => [game.configId, game.seconds]), [["Table 1", 60], ["Table 1", 300], ["Table 3", 90]]);
});

test("with Guest as the only Profile, the week's Challenge is drawn and shown to Guest", () => {
    const { fake } = setUp({ profiles: [], active: "guest", randoms: [0, 0, 0.99] });

    assert.equal(cabinetChallenge(fake).current.template, "differentTables");
    assert.ok(cardShows(fake, TEXT.progress(0, 4, TEXT.daysLeft(7))));
    play(fake, TABLES[0], 90);
    assert.ok(cardShows(fake, TEXT.progress(1, 4, TEXT.daysLeft(7))));
});

test("each Profile has its own progress, Guest included", () => {
    const { fake, store } = setUp({ randoms: [0, 0, 0.99] });
    play(fake, TABLES[0], 90);

    store.switchTo("Bob");
    assert.ok(cardShows(fake, TEXT.progress(0, 4, TEXT.daysLeft(7))), "Bob starts from zero");

    store.switchTo("guest");
    assert.ok(cardShows(fake, TEXT.progress(0, 4, TEXT.daysLeft(7))), "Guest starts from zero");
    play(fake, TABLES[1], 90);
    play(fake, TABLES[2], 90);
    assert.ok(cardShows(fake, TEXT.progress(2, 4, TEXT.daysLeft(7))));

    store.switchTo("Alice");
    assert.ok(cardShows(fake, TEXT.progress(1, 4, TEXT.daysLeft(7))));
    store.switchTo("guest");
    assert.ok(cardShows(fake, TEXT.progress(2, 4, TEXT.daysLeft(7))), "Guest keeps its own progress");
});

test("a game started on Sunday night counts for the week it started in", () => {
    const { fake } = setUp({ now: SUNDAY_NIGHT, randoms: [0, 0, 0.99] });

    fake.playGame(TABLES[0]);
    fake.gameStarted(TABLES[0]);
    fake.advanceTime(5 * MINUTE_MS);
    // Read before the wheel: the Profile has not shown up on the new week's wheel yet.
    let challenge;
    fake.on("postlaunch", () => { challenge = profileChallenge(fake, "Alice"); });
    fake.gameOver(TABLES[0]);

    assert.equal(challenge.week, WEEK);
    assert.deepEqual(challenge.games.map(game => [game.configId, game.day]), [["Table 1", "2026-09-27"]]);
});

test("a game started in a week whose Challenge the Profile doesn't follow doesn't count", () => {
    const { fake } = setUp({ now: SUNDAY_NIGHT, randoms: [0, 0, 0.99] });
    fake.setNow(NEXT_MONDAY);

    // Still following last week's Challenge: nobody showed up on the wheel
    // since, so it is read before the wheel.
    fake.playGame(TABLES[0]);
    fake.gameStarted(TABLES[0]);
    fake.advanceTime(5 * MINUTE_MS);
    let challenge;
    fake.on("postlaunch", () => { challenge = profileChallenge(fake, "Alice"); });
    fake.gameOver(TABLES[0]);
    assert.equal(challenge.week, WEEK);
    assert.deepEqual(challenge.games, []);
});

test("the card hides while a game runs and comes back on the wheel", () => {
    const { fake } = setUp({ randoms: [0, 0, 0.99] });

    fake.gameStarted(TABLES[0]);
    assert.equal(card(fake).alpha, 0);
    fake.advanceTime(30 * 1000);
    fake.gameOver(TABLES[0]);
    assert.ok(cardShown(fake));
});

test("the card lights up once on a new Challenge, a Profile switch and progress after a game", () => {
    const { fake, store } = setUp({ randoms: [0, 0, 0.99] });
    const lit = card(fake).frames().length;
    const resting = restingFrames(fake);
    assert.ok(lit > resting, "lit up for the new Challenge, then back to rest");

    store.switchTo("Bob");
    assert.equal(card(fake).frames().length, lit, "lit up for the Profile switch");
    restingFrames(fake);

    play(fake, TABLES[0], 90);
    assert.equal(card(fake).frames().length, lit, "lit up after a game that moved the Challenge forward");
    restingFrames(fake);

    play(fake, TABLES[0], 90);
    assert.equal(card(fake).frames().length, resting, "the same table again: nothing new");

    fake.fire("wheelmode");
    assert.equal(card(fake).frames().length, resting, "back on the wheel with nothing new");
});

test("the card keeps its size and sits under the Profile badge", () => {
    const { fake, store } = setUp({ randoms: [0, 0, 0.99] });
    const size = card(fake).canvasSize();
    store.switchTo("Bob");
    play(fake, TABLES[0], 90);

    assert.deepEqual(card(fake).canvasSize(), size);
    assert.equal(card(fake).position().align, "top right");
    assert.ok(card(fake).position().y < 0, "moved down, below the badge");
    assert.equal(Object.keys(card(fake).scale()).length, 1, "only one span set: it keeps its proportions");
});

test("a title that wraps makes the card one line taller, with the same proportions", () => {
    const short = setUp({ randoms: [0, 0, 0.99] });
    const shortCard = card(short.fake);
    const manufacturer = "Very Long Manufacturer Name Amusements";
    const long = setUp({ saved: { cabinet: { current: { week: WEEK, template: "manufacturerTables", param: manufacturer, target: 2 }, previous: null } } });
    const longCard = card(long.fake);
    assert.ok(cardShows(long.fake, TEXT.titles.manufacturerTables(2, manufacturer)));

    assert.ok(longCard.canvasSize().height > shortCard.canvasSize().height);
    assert.equal(longCard.canvasSize().width, shortCard.canvasSize().width);
    const proportion = layer => layer.scale().ySpan / layer.canvasSize().height;
    assert.ok(Math.abs(proportion(longCard) - proportion(shortCard)) < 1e-12);
});

test("without a Profile badge, the card sits in the top right corner, whatever the Profile", () => {
    const { fake, store } = setUp({ underBadge: false, randoms: [0, 0, 0.99] });
    assert.deepEqual(card(fake).position(), { x: 0, y: 0, align: "top right" });

    store.switchTo("Bob");
    play(fake, TABLES[0], 90);
    assert.deepEqual(card(fake).position(), { x: 0, y: 0, align: "top right" });
});

test("reaching the target completes the Challenge once: completed count, Challenge Toast, completed card", () => {
    // Target 4.
    const { fake } = setUp({ randoms: [0, 0, 0] });
    const title = TEXT.titles.differentTables(4);

    play(fake, TABLES[0], 90);
    play(fake, TABLES[1], 90);
    play(fake, TABLES[2], 90);
    assert.equal(profileChallenge(fake, "Alice").completed, false);
    play(fake, TABLES[3], 90);

    const challenge = profileChallenge(fake, "Alice");
    assert.equal(challenge.completed, true);
    assert.equal(challenge.completedCount, 1);
    assert.deepEqual(toastsDrawn(fake), [[TEXT.toastHeader.toLocaleUpperCase(), title, TEXT.toastDescription(1)].join(" | ")]);
    assert.ok(cardShows(fake, TEXT.completed));

    play(fake, TABLES[0], 90);
    fake.advanceTime(ONE_TOAST_MS);
    assert.equal(profileChallenge(fake, "Alice").completedCount, 1, "completed once");
    assert.equal(toastsDrawn(fake).length, 1, "one Challenge Toast");
});

test("the card shows the Challenge completed until the end of the week", () => {
    const { fake, store } = setUp({ randoms: [0, 0, 0] });
    for (const game of TABLES) play(fake, game, 90);

    store.switchTo("Bob");
    assert.ok(cardShows(fake, TEXT.progress(0, 4, TEXT.daysLeft(7))), "Bob has not completed it");
    store.switchTo("Alice");
    fake.setNow(SUNDAY_NIGHT);
    fake.fire("wheelmode");
    assert.ok(cardShows(fake, TEXT.completed));
});

test("each Profile completes the Challenge on its own", () => {
    const { fake, store } = setUp({ randoms: [0, 0, 0] });
    for (const game of TABLES) play(fake, game, 90);
    store.switchTo("Bob");
    for (const game of TABLES) play(fake, game, 90);

    assert.equal(profileChallenge(fake, "Alice").completedCount, 1);
    assert.equal(profileChallenge(fake, "Bob").completedCount, 1);
    fake.advanceTime(ONE_TOAST_MS);
    assert.equal(toastsDrawn(fake).length, 2);
});

test("a game started on Sunday night completes that week's Challenge", () => {
    const { fake } = setUp({ now: new Date(2026, 8, 27, 22, 0, 0), randoms: [0, 0, 0] });
    for (const game of TABLES.slice(0, 3)) play(fake, game, 90);

    fake.setNow(SUNDAY_NIGHT);
    fake.gameStarted(TABLES[3]);
    fake.advanceTime(5 * MINUTE_MS);
    fake.gameOver(TABLES[3]);

    assert.equal(profileChallenge(fake, "Alice").completedCount, 1);
    assert.equal(toastsDrawn(fake).length, 1);
});

// Last week's Challenge (target 2) and this week's (target 3), already
// locked in cabinet.json, both below their template's range: they are kept.
const TWO_WEEKS_LOCKED = {
    current: { week: NEXT_WEEK, template: "differentTables", param: null, target: 3 },
    previous: { week: WEEK, template: "differentTables", param: null, target: 2 },
};
const followed = (week, games = [], more = {}) => ({
    firstWeek: week, week, games, completed: false, completedCount: 0, judgedWeek: "", history: [], ...more,
});
const countedGame = (configId, day) => ({
    configId, manufacturer: "Williams", decade: 1990, day, seconds: 90, randomGame: false,
    isTableOfTheDay: false, isTableOfTheWeek: false, wasNeverPlayed: true, wasDusty: false,
});
const verdictHeader = TEXT.verdictHeader.toLocaleUpperCase();

test("a missed Challenge gets its verdict once, on the card, with the value reached and no toast", () => {
    const { fake } = setUp({ randoms: [0, 0, 0] });
    play(fake, TABLES[0], 90);

    fake.setNow(NEXT_MONDAY);
    fake.fire("wheelmode");

    const challenge = profileChallenge(fake, "Alice");
    assert.deepEqual(challenge.history, [{ week: WEEK, template: "differentTables", param: null, target: 4, reached: 1, completed: false }]);
    assert.equal(challenge.judgedWeek, WEEK);
    assert.ok(cardShows(fake, verdictHeader));
    assert.ok(cardShows(fake, TEXT.titles.differentTables(4)));
    assert.ok(cardShows(fake, TEXT.missed(1, 4)));

    fake.advanceTime(CHALLENGE_VERDICT_MS + ONE_TOAST_MS);
    assert.deepEqual(toastsDrawn(fake), [], "no toast for a missed Challenge");
    assert.ok(cardShows(fake, TEXT.titles.differentManufacturers(3)), "the verdict gives way to this week's Challenge");

    fake.fire("wheelmode");
    assert.ok(!cardShows(fake, verdictHeader), "the verdict is shown once");
    assert.equal(profileChallenge(fake, "Alice").history.length, 1);
});

test("a completed Challenge gets its verdict, then the new Challenge lights up", () => {
    const games = [countedGame("Table 1", "2026-09-22"), countedGame("Table 2", "2026-09-23")];
    const { fake } = setUp({
        now: NEXT_MONDAY,
        saved: { cabinet: TWO_WEEKS_LOCKED, Alice: followed(WEEK, games, { completed: true, completedCount: 1 }) },
    });

    assert.ok(cardShows(fake, verdictHeader));
    assert.ok(cardShows(fake, TEXT.completed));
    assert.deepEqual(profileChallenge(fake, "Alice").history,
        [{ week: WEEK, template: "differentTables", param: null, target: 2, reached: 2, completed: true }]);

    fake.advanceTime(CHALLENGE_VERDICT_MS);
    assert.ok(cardShows(fake, TEXT.cardHeader.toLocaleUpperCase()));
    assert.ok(cardShows(fake, TEXT.progress(0, 3, TEXT.daysLeft(7))));
    const lit = card(fake).frames().length;
    assert.ok(lit > restingFrames(fake), "the new Challenge lights up");

    const challenge = profileChallenge(fake, "Alice");
    assert.equal(challenge.week, NEXT_WEEK);
    assert.equal(challenge.completedCount, 1);
    assert.equal(challenge.firstWeek, WEEK);
});

test("a Profile that didn't play the previous week gets a verdict with 0", () => {
    // Bob last followed a Challenge three weeks ago, and was judged on it.
    const old = followed("2026-09-07", [countedGame("Table 1", "2026-09-08")], { judgedWeek: "2026-08-31" });
    const { fake } = setUp({ now: NEXT_MONDAY, active: "Bob", saved: { cabinet: TWO_WEEKS_LOCKED, Bob: old } });

    assert.ok(cardShows(fake, TEXT.missed(0, 2)));
    assert.deepEqual(profileChallenge(fake, "Bob").history,
        [{ week: WEEK, template: "differentTables", param: null, target: 2, reached: 0, completed: false }],
        "only the last Challenge is judged: the weeks in between leave no trace");
});

test("a Profile that never saw the previous Challenge gets no verdict", () => {
    const { fake, store } = setUp({
        now: NEXT_MONDAY,
        saved: { cabinet: TWO_WEEKS_LOCKED, Alice: followed(WEEK), Bob: followed(NEXT_WEEK) },
    });
    fake.advanceTime(CHALLENGE_VERDICT_MS);

    // Bob first saw a Challenge this week.
    store.switchTo("Bob");
    assert.ok(!cardShows(fake, verdictHeader));
    assert.deepEqual(profileChallenge(fake, "Bob").history, []);

    fake.addFolder(`${PROFILES}\\Carol`);
    store.switchTo("Carol");
    assert.ok(!cardShows(fake, verdictHeader), "a Profile created after the previous Challenge");
    assert.ok(cardShows(fake, TEXT.progress(0, 3, TEXT.daysLeft(7))));
    assert.deepEqual(profileChallenge(fake, "Carol").history, []);
    assert.equal(profileChallenge(fake, "Carol").firstWeek, NEXT_WEEK);
});

test("a game across Monday midnight completes the old week's Challenge: the toast and the verdict both show", () => {
    const { fake } = setUp({ now: new Date(2026, 8, 27, 22, 0, 0), randoms: [0, 0, 0] });
    for (const game of TABLES.slice(0, 3)) play(fake, game, 90);

    fake.setNow(SUNDAY_NIGHT);
    fake.gameStarted(TABLES[3]);
    fake.setNow(NEXT_MONDAY);
    fake.gameOver(TABLES[3]);

    const challenge = profileChallenge(fake, "Alice");
    assert.equal(challenge.completedCount, 1);
    assert.deepEqual(challenge.history,
        [{ week: WEEK, template: "differentTables", param: null, target: 4, reached: 4, completed: true }]);
    assert.ok(cardShows(fake, verdictHeader));
    assert.ok(cardShows(fake, TEXT.completed));
    fake.advanceTime(ONE_TOAST_MS);
    assert.equal(toastsDrawn(fake).length, 1);
});

test("a menu or a dialog closing over the verdict shows it again, in full, then the new Challenge lights up", () => {
    const { fake } = setUp({
        now: NEXT_MONDAY,
        saved: { cabinet: TWO_WEEKS_LOCKED, Alice: followed(WEEK) },
    });
    fake.advanceTime(CHALLENGE_VERDICT_MS - 1000);

    fake.fire("wheelmode");
    fake.advanceTime(CHALLENGE_VERDICT_MS - 1000);
    assert.ok(cardShows(fake, TEXT.missed(0, 2)), "still the verdict");
    fake.advanceTime(1000);
    assert.ok(cardShows(fake, TEXT.progress(0, 3, TEXT.daysLeft(7))));
    const lit = card(fake).frames().length;
    assert.ok(lit > restingFrames(fake), "the new Challenge lights up");
    assert.equal(profileChallenge(fake, "Alice").history.length, 1);

    fake.fire("wheelmode");
    assert.ok(!cardShows(fake, verdictHeader), "once seen, the verdict is gone");

    // A Profile switch drops a verdict still on screen.
    const withVerdict = setUp({ now: NEXT_MONDAY, saved: { cabinet: TWO_WEEKS_LOCKED, Alice: followed(WEEK) } });
    withVerdict.store.switchTo("Bob");
    assert.ok(!cardShows(withVerdict.fake, verdictHeader));
});

test("a previous week without a Challenge gets no verdict", () => {
    const { fake } = setUp({
        now: NEXT_MONDAY,
        saved: {
            cabinet: {
                current: TWO_WEEKS_LOCKED.current,
                previous: { week: WEEK, template: "", param: null, target: 0 },
            },
            Alice: followed("2026-09-14"),
        },
    });

    assert.ok(!cardShows(fake, verdictHeader));
    assert.ok(cardShows(fake, TEXT.progress(0, 3, TEXT.daysLeft(7))));
    assert.deepEqual(profileChallenge(fake, "Alice").history, []);
});

test("a Challenge locked in cabinet.json keeps its target, even below its template's range", () => {
    const { fake } = setUp({ saved: { cabinet: { current: TWO_WEEKS_LOCKED.previous, previous: null } } });

    assert.ok(cardShows(fake, TEXT.progress(0, 2, TEXT.daysLeft(7))));
    play(fake, TABLES[0], 90);
    play(fake, TABLES[1], 90);
    assert.equal(profileChallenge(fake, "Alice").completed, true);
    assert.deepEqual(cabinetChallenge(fake).current, TWO_WEEKS_LOCKED.previous);
});

// Every Challenge a draw can give on this collection, as "template:param:target"
// for the lowest and highest target, by walking the random source through
// each template and option; options go to setUp.
function drawable(tables, options = {}) {
    const steps = Array.from({ length: 20 }, (_, index) => index / 20);
    const drawn = new Set();
    for (const templateRandom of steps) {
        for (const optionRandom of steps) {
            for (const targetRandom of [0, 0.99]) {
                const { fake, challenges } = setUp({ ...options, tables, randoms: [templateRandom, optionRandom, targetRandom] });
                challenges.getCurrent();
                const { template, param, target } = cabinetChallenge(fake).current;
                drawn.add(`${template}:${param}:${target}`);
            }
        }
    }
    return [...drawn].sort();
}
const drawableTemplates = (tables, options) =>
    drawable(tables, options).map(key => key.split(":")[0]).filter((id, index, ids) => ids.indexOf(id) === index);
const drawnOf = (tables, template, options) => drawable(tables, options).filter(key => key.startsWith(`${template}:`));

// Draws this template's option at this index, among options, with this
// target; setUpOptions go to setUp.
function setUpDrawn(tables, template, { option = 0, options = 1, target = 0 } = {}, setUpOptions = {}) {
    const templates = drawableTemplates(tables, setUpOptions);
    const ordered = CHALLENGE_TEMPLATE_IDS.filter(id => templates.includes(id));
    const randoms = [(ordered.indexOf(template) + 0.5) / ordered.length, (option + 0.5) / options, target];
    const set = setUp({ ...setUpOptions, tables, randoms });
    assert.equal(cabinetChallenge(set.fake).current.template, template);
    return set;
}

// Community tables first: were they an option, they would come first.
const MANUFACTURER_TABLES = [
    table(11, "VPX Community", 2021), table(12, "VPX Community", 2022), table(13, "VPX Community", 2023),
    table(14, "Stern", 2016), table(15, "Stern", 2020), table(16, "Stern", 2021), { ...table(17, "Stern", 2022), isHidden: true },
    table(18, "Williams", 1992), table(19, "Williams", 1993),
    table(20, "Bally", 1980), table(21, "", 1995), table(22, "", 1996),
];

test("manufacturerTables: one option per manufacturer with 3 visible tables, never the community tables' one", () => {
    // Stern has 3 visible tables, Williams only 2.
    assert.deepEqual(drawnOf(MANUFACTURER_TABLES, "manufacturerTables"), ["manufacturerTables:Stern:3"]);

    const sixStern = [...MANUFACTURER_TABLES, table(23, "Stern", 2023), table(24, "Stern", 2024), table(25, "Stern", 2025)];
    assert.deepEqual(drawnOf(sixStern, "manufacturerTables"), ["manufacturerTables:Stern:3", "manufacturerTables:Stern:6"]);

    // Only the community tables' manufacturer has 3 tables: no option.
    const communityOnly = [table(11, "VPX Community", 2021), table(12, "VPX Community", 2022), table(13, "VPX Community", 2023),
        table(18, "Williams", 1992)];
    assert.deepEqual(drawnOf(communityOnly, "manufacturerTables"), []);
});

test("manufacturerTables counts the manufacturer's distinct tables", () => {
    const { fake } = setUpDrawn(MANUFACTURER_TABLES, "manufacturerTables", { target: 0.99 });
    assert.deepEqual(cabinetChallenge(fake).current, { week: WEEK, template: "manufacturerTables", param: "Stern", target: 3 });
    assert.ok(cardShows(fake, TEXT.titles.manufacturerTables(3, "Stern")));

    play(fake, MANUFACTURER_TABLES[3], 90);
    play(fake, MANUFACTURER_TABLES[3], 90);
    play(fake, MANUFACTURER_TABLES[7], 90);
    play(fake, MANUFACTURER_TABLES[0], 90);
    assert.ok(cardShows(fake, TEXT.progress(1, 3, TEXT.daysLeft(7))), "the same table twice, other manufacturers: 1");

    play(fake, MANUFACTURER_TABLES[4], 90);
    play(fake, MANUFACTURER_TABLES[5], 90);
    assert.equal(profileChallenge(fake, "Alice").completed, true);
});

test("decadeTables: one option per decade with 3 visible tables, counting its distinct tables", () => {
    // The 1990s have 4 visible tables, the 2020s 5; the 2010s and 1980s one each.
    assert.deepEqual(drawnOf(MANUFACTURER_TABLES, "decadeTables"), [
        "decadeTables:1990:3", "decadeTables:1990:4",
        "decadeTables:2020:3", "decadeTables:2020:5",
    ]);

    const { fake } = setUpDrawn(MANUFACTURER_TABLES, "decadeTables", { option: 1, options: 2, target: 0 });
    assert.deepEqual(cabinetChallenge(fake).current, { week: WEEK, template: "decadeTables", param: 1990, target: 3 });
    assert.ok(cardShows(fake, TEXT.titles.decadeTables(3, 1990)));

    play(fake, MANUFACTURER_TABLES[7], 90);
    play(fake, MANUFACTURER_TABLES[7], 90);
    play(fake, MANUFACTURER_TABLES[9], 90);
    assert.ok(cardShows(fake, TEXT.progress(1, 3, TEXT.daysLeft(7))));
    play(fake, MANUFACTURER_TABLES[10], 90);
    play(fake, MANUFACTURER_TABLES[11], 90);
    assert.equal(profileChallenge(fake, "Alice").completed, true);
});

test("differentManufacturers: up to the visible tables' distinct manufacturers, counting distinct manufacturers played", () => {
    // Stern, Williams and Bally: target 3.
    const tables = [table(1, "Stern", 2016), table(2, "Stern", 2020), table(3, "Williams", 1992), table(4, "Bally", 1995),
        table(5, "", 1996), { ...table(6, "Gottlieb", 1978), isHidden: true }];
    assert.deepEqual(drawnOf(tables, "differentManufacturers"), ["differentManufacturers:null:3"]);
    const sevenMakers = [...tables, table(7, "Gottlieb", 1978), table(8, "Data East", 1990), table(9, "Sega", 1996),
        table(10, "Spooky", 2019)];
    assert.deepEqual(drawnOf(sevenMakers, "differentManufacturers"),
        ["differentManufacturers:null:3", "differentManufacturers:null:6"]);
    assert.deepEqual(drawnOf(tables.slice(0, 3), "differentManufacturers"), [], "Stern and Williams: below 3");

    const { fake } = setUpDrawn(tables, "differentManufacturers", { target: 0.99 });
    assert.ok(cardShows(fake, TEXT.titles.differentManufacturers(3)));
    play(fake, tables[0], 90);
    play(fake, tables[1], 90);
    play(fake, tables[4], 90);
    assert.ok(cardShows(fake, TEXT.progress(1, 3, TEXT.daysLeft(7))), "two Stern tables and one without a manufacturer: 1");
    play(fake, tables[2], 90);
    play(fake, tables[3], 90);
    assert.equal(profileChallenge(fake, "Alice").completed, true);
});

test("differentDecades: up to the visible tables' distinct decades, counting distinct decades played", () => {
    // The 2010s, 1990s and 1970s: target 3.
    const tables = [table(1, "Stern", 2016), table(2, "Stern", 2017), table(3, "Williams", 1992), table(4, "Bally", 1978),
        table(5, "Gottlieb", 0), { ...table(6, "Gottlieb", 1965), isHidden: true }];
    assert.deepEqual(drawnOf(tables, "differentDecades"), ["differentDecades:null:3"]);
    const sixDecades = [...tables, table(7, "Gottlieb", 1965), table(8, "Bally", 1985), table(9, "Stern", 2020)];
    assert.deepEqual(drawnOf(sixDecades, "differentDecades"), ["differentDecades:null:3", "differentDecades:null:5"]);

    const { fake } = setUpDrawn(tables, "differentDecades", { target: 0 });
    assert.ok(cardShows(fake, TEXT.titles.differentDecades(3)));
    play(fake, tables[0], 90);
    play(fake, tables[1], 90);
    play(fake, tables[4], 90);
    assert.ok(cardShows(fake, TEXT.progress(1, 3, TEXT.daysLeft(7))), "two 2010s tables and one without a year: 1");
    play(fake, tables[2], 90);
    play(fake, tables[3], 90);
    assert.equal(profileChallenge(fake, "Alice").completed, true);
});

test("a manufacturer or decade with fewer than 3 visible tables is never drawn", () => {
    // Two manufacturers and two decades, 2 tables each; nobody played yet.
    const twoEach = [table(1, "Stern", 2016), table(2, "Stern", 2017), table(3, "Williams", 1992), table(4, "Williams", 1993)];
    assert.deepEqual(drawableTemplates(twoEach), ["activeDays", "differentTables", "endurance", "marathon",
        "neverPlayedTables", "randomGames", "sameTableGames", "tableOfTheDayDays", "tableOfTheWeekGames"]);

    const sameEra = [table(1, "Stern", 2016), table(2, "Stern", 2017), table(3, "Stern", 2018)];
    assert.deepEqual(drawableTemplates(sameEra), ["activeDays", "decadeTables", "endurance",
        "manufacturerTables", "marathon", "neverPlayedTables", "randomGames", "sameTableGames",
        "tableOfTheDayDays", "tableOfTheWeekGames"]);
});

// Tables 1 to 9, the 7th hidden. Alice never played 5, 6, 8 and 9, and last
// played 2, 3 and 4 (and the hidden 7) more than six months ago; Bob never
// played 3, 4, 6, 8 and 9, and last played 1, 2 and 5 more than six months
// ago. Guest played them all this week: while Guest sets the bar, neither
// template is feasible.
const PLAYED_TABLES = Array.from({ length: 9 }, (_, index) =>
    ({ ...table(index + 1, `Maker ${index + 1}`, 1950 + 10 * index), isHidden: index === 6 }));
const played = lastPlayed => ({ count: 1, seconds: 600, lastPlayed });
const RECENTLY = played("2026-06-13T20:00:00");
// 184 days before MONDAY.
const LONG_AGO = played("2026-03-21T20:00:00");
const PLAYS = {
    Alice: { "Table 1": RECENTLY, "Table 2": LONG_AGO, "Table 3": LONG_AGO, "Table 4": LONG_AGO, "Table 7": LONG_AGO },
    Bob: { "Table 1": LONG_AGO, "Table 2": LONG_AGO, "Table 5": LONG_AGO, "Table 7": RECENTLY },
    guest: Object.fromEntries(PLAYED_TABLES.map(game => [game.configId, played("2026-09-21T10:00:00")])),
};
const GUEST_ALONE = { profiles: [], active: "guest" };
// Guest never played tables 1, 2 and 3, and last played 4, 5 and 6 more than six months ago.
const GUEST_SOME = {
    guest: { ...PLAYS.guest, "Table 1": undefined, "Table 2": undefined, "Table 3": undefined,
        "Table 4": LONG_AGO, "Table 5": LONG_AGO, "Table 6": LONG_AGO },
};

// Runs check with the Profile picker turned off in addOns.
function withPickerOff(check) {
    const previous = config.addOns.profilePicker;
    config.addOns.profilePicker = false;
    try {
        check();
    } finally {
        config.addOns.profilePicker = previous;
    }
}

test("neverPlayedTables: with the picker on and other Profiles, Guest's plays are left out", () => {
    // Alice never played 4 visible tables, Bob 5.
    assert.deepEqual(drawnOf(PLAYED_TABLES, "neverPlayedTables", { plays: PLAYS }),
        ["neverPlayedTables:null:3", "neverPlayedTables:null:4"]);

    // Alice never played only 2 visible tables: below 3.
    const aliceTwoNever = { ...PLAYS, Alice: { ...PLAYS.Alice, "Table 5": RECENTLY, "Table 6": RECENTLY } };
    assert.deepEqual(drawnOf(PLAYED_TABLES, "neverPlayedTables", { plays: aliceTwoNever }), []);
});

test("neverPlayedTables: Guest sets the bar when it is the only one playing", () => {
    // Guest alone: it played every table, then 3 of them never.
    assert.deepEqual(drawnOf(PLAYED_TABLES, "neverPlayedTables", { plays: PLAYS, ...GUEST_ALONE }), []);
    assert.deepEqual(drawnOf(PLAYED_TABLES, "neverPlayedTables", { plays: GUEST_SOME, ...GUEST_ALONE }),
        ["neverPlayedTables:null:3"]);

    // Picker off: Guest joins Alice and Bob.
    withPickerOff(() => {
        assert.deepEqual(drawnOf(PLAYED_TABLES, "neverPlayedTables", { plays: PLAYS }), []);
        assert.deepEqual(drawnOf(PLAYED_TABLES, "neverPlayedTables", { plays: { ...PLAYS, ...GUEST_SOME } }),
            ["neverPlayedTables:null:3"]);
    });
});

test("dustyTables: with the picker on and other Profiles, Guest's plays are left out, never played tables excluded", () => {
    // Alice's hidden table 7 does not count: 3 for her, 3 for Bob.
    assert.deepEqual(drawnOf(PLAYED_TABLES, "dustyTables", { plays: PLAYS }), ["dustyTables:null:3"]);

    // Bob left out, Alice alone has two dusty tables: below 3.
    const aliceTwoDusty = { Alice: { ...PLAYS.Alice, "Table 4": RECENTLY } };
    assert.deepEqual(drawnOf(PLAYED_TABLES, "dustyTables", { plays: aliceTwoDusty, profiles: ["Alice"] }), []);
});

test("dustyTables: Guest sets the bar when it is the only one playing", () => {
    assert.deepEqual(drawnOf(PLAYED_TABLES, "dustyTables", { plays: PLAYS, ...GUEST_ALONE }), []);
    assert.deepEqual(drawnOf(PLAYED_TABLES, "dustyTables", { plays: GUEST_SOME, ...GUEST_ALONE }),
        ["dustyTables:null:3"]);
    // Two dusty tables for Guest: below 3.
    const guestTwoDusty = { guest: { ...GUEST_SOME.guest, "Table 5": RECENTLY } };
    assert.deepEqual(drawnOf(PLAYED_TABLES, "dustyTables", { plays: guestTwoDusty, ...GUEST_ALONE }), []);

    withPickerOff(() => {
        assert.deepEqual(drawnOf(PLAYED_TABLES, "dustyTables", { plays: PLAYS }), []);
        assert.deepEqual(drawnOf(PLAYED_TABLES, "dustyTables", { plays: { ...PLAYS, ...GUEST_SOME } }),
            ["dustyTables:null:3"]);
    });
});

test("neverPlayedTables counts distinct tables never played when the game started", () => {
    const { fake } = setUpDrawn(PLAYED_TABLES, "neverPlayedTables", { target: 0 }, { plays: PLAYS });
    assert.ok(cardShows(fake, TEXT.titles.neverPlayedTables(3)));

    play(fake, PLAYED_TABLES[4], 90);
    assert.ok(cardShows(fake, TEXT.progress(1, 3, TEXT.daysLeft(7))), "the game that plays it for the first time counts");
    play(fake, PLAYED_TABLES[4], 90);
    play(fake, PLAYED_TABLES[0], 90);
    play(fake, PLAYED_TABLES[2], 90);
    assert.ok(cardShows(fake, TEXT.progress(1, 3, TEXT.daysLeft(7))), "the same table again, and tables already played: 1");

    play(fake, PLAYED_TABLES[5], 90);
    play(fake, PLAYED_TABLES[7], 90);
    assert.equal(profileChallenge(fake, "Alice").completed, true);
});

test("dustyTables counts distinct tables last played more than six months before the game started", () => {
    const { fake } = setUpDrawn(PLAYED_TABLES, "dustyTables", { target: 0 }, { plays: PLAYS });
    assert.ok(cardShows(fake, TEXT.titles.dustyTables(3)));

    play(fake, PLAYED_TABLES[2], 90);
    assert.ok(cardShows(fake, TEXT.progress(1, 3, TEXT.daysLeft(7))), "the game that dusts it off counts");
    play(fake, PLAYED_TABLES[2], 90);
    play(fake, PLAYED_TABLES[0], 90);
    play(fake, PLAYED_TABLES[4], 90);
    assert.ok(cardShows(fake, TEXT.progress(1, 3, TEXT.daysLeft(7))), "the same table again, a recent one, a never played one: 1");

    play(fake, PLAYED_TABLES[3], 90);
    play(fake, PLAYED_TABLES[1], 90);
    assert.equal(profileChallenge(fake, "Alice").completed, true);
});

test("a single visible table leaves only the templates that one table can satisfy", () => {
    assert.deepEqual(drawableTemplates([table(1, "Stern", 2016), { ...table(2, "Stern", 2017), isHidden: true }]),
        ["activeDays", "endurance", "marathon", "randomGames", "sameTableGames", "tableOfTheDayDays", "tableOfTheWeekGames"]);
});

test("tableOfTheDayDays and activeDays draw 3 to 5 days, never more than are left in the week, today included", () => {
    const newTemplates = drawn => drawn.filter(key => /^(tableOfTheDayDays|activeDays|tableOfTheWeekGames):/.test(key));
    assert.deepEqual(newTemplates(drawable(TABLES)), [
        "activeDays:null:3", "activeDays:null:5", "tableOfTheDayDays:null:3", "tableOfTheDayDays:null:5",
        "tableOfTheWeekGames:null:4", "tableOfTheWeekGames:null:8",
    ]);
    assert.deepEqual(newTemplates(drawable(TABLES, { now: FRIDAY })), [
        "activeDays:null:3", "tableOfTheDayDays:null:3", "tableOfTheWeekGames:null:4", "tableOfTheWeekGames:null:8",
    ]);
    assert.deepEqual(newTemplates(drawable(TABLES, { now: SATURDAY })),
        ["tableOfTheWeekGames:null:4", "tableOfTheWeekGames:null:8"], "Saturday: two days left, the day-based templates drop out");
});

test("tableOfTheDayDays counts distinct days on which the game was that day's Table of the Day", () => {
    const { fake, tableOfTheDay } = setUpDrawn(TABLES, "tableOfTheDayDays", { target: 0 });
    assert.ok(cardShows(fake, TEXT.titles.tableOfTheDayDays(3)));

    const mondayTable = tableOfTheDay.getTable();
    play(fake, mondayTable, 90);
    assert.ok(cardShows(fake, TEXT.progress(1, 3, TEXT.daysLeft(7))));
    play(fake, mondayTable, 90);
    play(fake, TABLES.find(game => game.configId !== mondayTable.configId), 90);
    assert.ok(cardShows(fake, TEXT.progress(1, 3, TEXT.daysLeft(7))), "the same day again, another table: 1");

    fake.setNow(TUESDAY);
    fake.fire("wheelmode");
    const tuesdayTable = tableOfTheDay.getTable();
    assert.notEqual(tuesdayTable.configId, mondayTable.configId);
    play(fake, mondayTable, 90);
    assert.ok(cardShows(fake, TEXT.progress(1, 3, TEXT.daysLeft(6))), "yesterday's Table of the Day: nothing");
    play(fake, tuesdayTable, 90);
    assert.ok(cardShows(fake, TEXT.progress(2, 3, TEXT.daysLeft(6))));

    fake.setNow(WEDNESDAY);
    fake.fire("wheelmode");
    play(fake, tableOfTheDay.getTable(), 90);
    assert.equal(profileChallenge(fake, "Alice").completed, true);
});

test("tableOfTheWeekGames counts every game on the Table of the Week", () => {
    const { fake, tableOfTheWeek } = setUpDrawn(TABLES, "tableOfTheWeekGames", { target: 0 });
    assert.ok(cardShows(fake, TEXT.titles.tableOfTheWeekGames(4)));

    const weekTable = tableOfTheWeek.getTable();
    play(fake, TABLES.find(game => game.configId !== weekTable.configId), 90);
    play(fake, weekTable, 90);
    assert.ok(cardShows(fake, TEXT.progress(1, 4, TEXT.daysLeft(7))));
    for (let game = 0; game < 3; game++) play(fake, weekTable, 90);
    assert.equal(profileChallenge(fake, "Alice").completed, true, "the same table again counts");
});

test("activeDays counts distinct days played", () => {
    const { fake } = setUpDrawn(TABLES, "activeDays", { target: 0 });
    assert.ok(cardShows(fake, TEXT.titles.activeDays(3)));

    play(fake, TABLES[0], 90);
    play(fake, TABLES[1], 90);
    assert.ok(cardShows(fake, TEXT.progress(1, 3, TEXT.daysLeft(7))), "two games the same day: 1");

    fake.setNow(TUESDAY);
    fake.fire("wheelmode");
    play(fake, TABLES[0], 30);
    assert.ok(cardShows(fake, TEXT.progress(1, 3, TEXT.daysLeft(6))), "a short game doesn't make a day");
    play(fake, TABLES[0], 90);
    assert.ok(cardShows(fake, TEXT.progress(2, 3, TEXT.daysLeft(6))));

    fake.setNow(WEDNESDAY);
    fake.fire("wheelmode");
    play(fake, TABLES[0], 90);
    assert.equal(profileChallenge(fake, "Alice").completed, true);
});

test("endurance and marathon targets are drawn in their minute ranges, randomGames in [3, 6], sameTableGames in [4, 8]", () => {
    const newTemplates = drawable(TABLES).filter(key => /^(endurance|marathon|randomGames|sameTableGames):/.test(key));
    assert.deepEqual(newTemplates, [
        "endurance:null:20", "endurance:null:45", "marathon:null:120", "marathon:null:60",
        "randomGames:null:3", "randomGames:null:6", "sameTableGames:null:4", "sameTableGames:null:8",
    ]);
});

test("endurance counts the best table's total, in whole minutes", () => {
    const { fake } = setUpDrawn(TABLES, "endurance", { target: 0 });
    assert.ok(cardShows(fake, TEXT.titles.endurance(20)));

    play(fake, TABLES[0], 10 * 60);
    play(fake, TABLES[1], 12 * 60);
    play(fake, TABLES[0], 9 * 60 + 59);
    play(fake, TABLES[0], 59);
    assert.ok(cardShows(fake, TEXT.progress(19, 20, TEXT.daysLeft(7))),
        "19 min 59 s on the first table, a game under a minute left out: 19");

    play(fake, TABLES[0], 60);
    assert.equal(profileChallenge(fake, "Alice").completed, true);
});

test("marathon counts the sum of every game, in whole minutes", () => {
    const { fake } = setUpDrawn(TABLES, "marathon", { target: 0 });
    assert.ok(cardShows(fake, TEXT.titles.marathon(60)));

    play(fake, TABLES[0], 20 * 60);
    play(fake, TABLES[1], 20 * 60);
    play(fake, TABLES[2], 19 * 60 + 30);
    assert.ok(cardShows(fake, TEXT.progress(59, 60, TEXT.daysLeft(7))));

    play(fake, TABLES[3], 60);
    assert.equal(profileChallenge(fake, "Alice").completed, true);
});

test("sameTableGames counts the best table's games", () => {
    const { fake } = setUpDrawn(TABLES, "sameTableGames", { target: 0 });
    assert.ok(cardShows(fake, TEXT.titles.sameTableGames(4)));

    for (const game of [TABLES[0], TABLES[1], TABLES[1], TABLES[2], TABLES[1], TABLES[0]]) play(fake, game, 90);
    assert.ok(cardShows(fake, TEXT.progress(3, 4, TEXT.daysLeft(7))));

    play(fake, TABLES[1], 90);
    assert.equal(profileChallenge(fake, "Alice").completed, true);
});

test("randomGames counts the games the Random Game module launched", async () => {
    const { fake, randomGame } = setUpDrawn(TABLES, "randomGames", { target: 0 });
    assert.ok(cardShows(fake, TEXT.titles.randomGames(3)));
    const playRandomGame = async () => {
        await randomGame.launch();
        play(fake, fake.launches().at(-1), 90);
    };

    await playRandomGame();
    play(fake, TABLES[0], 90);
    assert.ok(cardShows(fake, TEXT.progress(1, 3, TEXT.daysLeft(7))), "a game the player picked doesn't count");

    await randomGame.launch();
    fake.launchError(fake.launches().at(-1));
    play(fake, TABLES[1], 90);
    assert.ok(cardShows(fake, TEXT.progress(1, 3, TEXT.daysLeft(7))), "nor one picked after a Random Game failed to launch");

    await playRandomGame();
    await playRandomGame();
    assert.equal(profileChallenge(fake, "Alice").completed, true);
});

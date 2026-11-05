// ============================================================
// Random Game behaviour, through the Random Game module's interface with
// the fake PinballY host and a no-delay animator: which table ends up
// launched, depending on the wheel selection and the Last Played Table.
// "Never" rules are checked over many launches.
// Run with "node --test" from the project folder.
// ============================================================

import { test } from "node:test";
import assert from "node:assert/strict";
import { createFakePinballYHost } from "../support/fake_pinbally_host.js";
import { createProfileStore } from "../../common/profiles/profile_store.js";
import { createRandomGame } from "../../common/tables/random_game.js";

const LAUNCH_COUNT = 200;
const PROFILES_FOLDER = "C:\\PinballY\\Scripts\\ExpansionPack\\profiles";

// PinballY's own last plays point at Medieval Madness: the Random Game must
// ignore them and follow the active Profile's play record.
const MEDIEVAL_MADNESS = { id: 1, configId: "Medieval Madness (Williams 1997)", title: "Medieval Madness", lastPlayed: new Date(2026, 8, 20) };
const ATTACK_FROM_MARS = { id: 2, configId: "Attack from Mars (Bally 1995)", title: "Attack from Mars" };
const THEATRE_OF_MAGIC = { id: 3, configId: "Theatre of Magic (Bally 1995)", title: "Theatre of Magic" };
const HOMEBREW_TABLE = { id: 4, configId: "Homebrew Table", title: "Homebrew Table" };

const TABLES = [MEDIEVAL_MADNESS, ATTACK_FROM_MARS, THEATRE_OF_MAGIC, HOMEBREW_TABLE];

// Guest's play record: Theatre of Magic has the most recent play, so it is
// Guest's Last Played Table.
const GUEST_PLAYS = {
    [MEDIEVAL_MADNESS.configId]: { count: 1, seconds: 60, lastPlayed: "2025-01-01T20:00:00" },
    [ATTACK_FROM_MARS.configId]: { count: 1, seconds: 60, lastPlayed: "2026-06-01T20:00:00" },
    [THEATRE_OF_MAGIC.configId]: { count: 1, seconds: 60, lastPlayed: "2026-08-01T20:00:00" },
};

// Goes straight to the requested index, like the real animation without its delays.
const noDelayAnimator = { animateTo: async () => {} };

const profileFile = name => `${PROFILES_FOLDER}\\${name}\\profile.json`;

function seedProfile(fake, name, data) {
    fake.addFile(profileFile(name), JSON.stringify({ version: 1, ...data }));
}

function createRandomGameOn({ wheel, tables = TABLES, skipAnimation = false, plays = GUEST_PLAYS, animator = noDelayAnimator, seed = () => {} }) {
    const fake = createFakePinballYHost({ tables });
    fake.setWheelTables(wheel.map(table => table.configId));
    seedProfile(fake, "guest", { plays });
    seed(fake);
    const profileStore = createProfileStore(fake);
    return { fake, profileStore, randomGame: createRandomGame(fake, profileStore, { ...animator, skipAnimation }) };
}

async function launchedConfigIds(fake, randomGame, times = LAUNCH_COUNT) {
    for (let i = 0; i < times; i++) await randomGame.launch();
    return new Set(fake.launches().map(game => game.configId));
}

test("never launches the Last Played Table when it is the current table", async () => {
    const { fake, randomGame } = createRandomGameOn({
        wheel: [THEATRE_OF_MAGIC, MEDIEVAL_MADNESS, ATTACK_FROM_MARS],
    });

    const launched = await launchedConfigIds(fake, randomGame);

    assert.equal(fake.launches().length, LAUNCH_COUNT);
    assert.ok(!launched.has(THEATRE_OF_MAGIC.configId), [...launched].join(", "));
});

test("never launches the Last Played Table when it sits just before other tables", async () => {
    const { fake, randomGame } = createRandomGameOn({
        wheel: [MEDIEVAL_MADNESS, THEATRE_OF_MAGIC, ATTACK_FROM_MARS, HOMEBREW_TABLE],
    });

    const launched = await launchedConfigIds(fake, randomGame);

    assert.equal(fake.launches().length, LAUNCH_COUNT);
    assert.ok(!launched.has(THEATRE_OF_MAGIC.configId), [...launched].join(", "));
});

test("never gives the same table twice in a row", async () => {
    const { fake, randomGame } = createRandomGameOn({ wheel: TABLES });

    for (let i = 0; i < LAUNCH_COUNT; i++) {
        await randomGame.launch();
        // The play is recorded for Guest: the launched table becomes its Last Played Table.
        const launched = fake.launches()[i];
        fake.gameStarted(launched);
        fake.advanceTime(60 * 1000);
        fake.gameOver(launched);
    }

    const launchedConfigIds = fake.launches().map(game => game.configId);
    for (let i = 1; i < launchedConfigIds.length; i++) {
        assert.notEqual(launchedConfigIds[i], launchedConfigIds[i - 1], `launch ${i}`);
    }
});

test("launches the Last Played Table when it is the only table of the selection", async () => {
    const { fake, randomGame } = createRandomGameOn({ wheel: [THEATRE_OF_MAGIC] });

    await randomGame.launch();

    assert.deepEqual(fake.launches().map(game => game.configId), [THEATRE_OF_MAGIC.configId]);
});

test("draws over the whole selection when the Last Played Table is not in it", async () => {
    const { fake, randomGame } = createRandomGameOn({ wheel: [MEDIEVAL_MADNESS, ATTACK_FROM_MARS] });

    const launched = await launchedConfigIds(fake, randomGame);

    assert.deepEqual([...launched].sort(), [ATTACK_FROM_MARS.configId, MEDIEVAL_MADNESS.configId]);
});

test("draws over the whole selection when no table was ever played", async () => {
    const { fake, randomGame } = createRandomGameOn({ wheel: [ATTACK_FROM_MARS, THEATRE_OF_MAGIC], plays: {} });

    const launched = await launchedConfigIds(fake, randomGame);

    assert.deepEqual([...launched].sort(), [ATTACK_FROM_MARS.configId, THEATRE_OF_MAGIC.configId]);
});

test("never launches the Last Played Table when it is an unconfigured table on the wheel", async () => {
    const unconfigured = { id: 5, configId: "Backup.Unconfigured", title: "Backup", isConfigured: false };
    const { fake, randomGame } = createRandomGameOn({
        tables: [...TABLES, unconfigured],
        wheel: [unconfigured, THEATRE_OF_MAGIC, ATTACK_FROM_MARS],
        plays: { ...GUEST_PLAYS, [unconfigured.configId]: { count: 1, seconds: 60, lastPlayed: "2026-09-01T20:00:00" } },
    });

    const launched = await launchedConfigIds(fake, randomGame);

    assert.ok(!launched.has(unconfigured.configId));
    assert.ok(launched.has(THEATRE_OF_MAGIC.configId), "the table played before it can be drawn");
});

test("never launches the Last Played Table with the animation turned off", async () => {
    const { fake, randomGame } = createRandomGameOn({
        wheel: [THEATRE_OF_MAGIC, MEDIEVAL_MADNESS],
        skipAnimation: true,
    });

    const launched = await launchedConfigIds(fake, randomGame);

    assert.deepEqual([...launched], [MEDIEVAL_MADNESS.configId]);
});

test("does nothing when the wheel selection is empty", async () => {
    const { fake, randomGame } = createRandomGameOn({ wheel: [] });

    await randomGame.launch();

    assert.deepEqual(fake.launches(), []);
});

test("ignores a Random Game requested while the animation is running", async () => {
    let finishAnimation;
    const { fake, randomGame } = createRandomGameOn({
        wheel: [MEDIEVAL_MADNESS, ATTACK_FROM_MARS],
        animator: { animateTo: () => new Promise(resolve => { finishAnimation = resolve; }) },
    });

    const firstLaunch = randomGame.launch();
    const secondLaunch = randomGame.launch();
    await Promise.resolve();
    finishAnimation();
    await Promise.all([firstLaunch, secondLaunch]);

    assert.equal(fake.launches().length, 1);
});

// The draw then the early stop use Math.random in that order: the first
// value picks the last table of the pool, the second one stops early.
function forceEarlyStop(t) {
    const values = [0.99, 0];
    t.mock.method(Math, "random", () => (values.length > 0 ? values.shift() : 0.99));
}

// Plays the game for the given seconds: a minute or more makes it a Play.
function playFor(fake, game, seconds) {
    fake.gameStarted(game);
    fake.advanceTime(seconds * 1000);
    fake.gameOver(game);
}

test("a Random Game played a minute adds 1 to the Random Games played, once", async () => {
    const { fake, randomGame } = createRandomGameOn({ wheel: [MEDIEVAL_MADNESS, ATTACK_FROM_MARS] });

    await randomGame.launch();
    const [launched] = fake.launches();
    playFor(fake, launched, 60);
    // The same table started again by hand is not a Random Game.
    playFor(fake, launched, 60);

    assert.equal(randomGame.getRandomGamesPlayed(), 1);
});

test("a Random Game quit under a minute adds nothing, though it was started as a Random Game", async () => {
    const { fake, randomGame } = createRandomGameOn({ wheel: [MEDIEVAL_MADNESS, ATTACK_FROM_MARS] });

    await randomGame.launch();
    const [launched] = fake.launches();
    fake.gameStarted(launched);
    assert.equal(randomGame.isStartedGameRandom(), true);
    fake.advanceTime(59 * 1000);
    fake.gameOver(launched);
    // Its next start by hand, played a minute, is not a Random Game either.
    playFor(fake, launched, 60);

    assert.equal(randomGame.getRandomGamesPlayed(), 0);
});

test("a Random Game counts for the Profile active at its start", async () => {
    const { fake, profileStore, randomGame } = createRandomGameOn({
        wheel: [MEDIEVAL_MADNESS, ATTACK_FROM_MARS],
        seed: fake => seedProfile(fake, "Alice", { randomGames: 4 }),
    });

    await randomGame.launch();
    const [launched] = fake.launches();
    fake.gameStarted(launched);
    profileStore.switchTo("Alice");
    fake.advanceTime(60 * 1000);
    fake.gameOver(launched);

    assert.equal(randomGame.getRandomGamesPlayed(), 4, "Alice's count is untouched");
    assert.equal(JSON.parse(fake.readFile(profileFile("guest"))).randomGames, 1);
});

test("the landing table of an early stop counts as a Random Game", async (t) => {
    const { fake, randomGame } = createRandomGameOn({ wheel: [MEDIEVAL_MADNESS, ATTACK_FROM_MARS] });
    forceEarlyStop(t);

    await randomGame.launch();
    const [launched] = fake.launches();
    assert.equal(launched.configId, MEDIEVAL_MADNESS.configId, "stopped one table early");
    playFor(fake, launched, 60);

    assert.equal(randomGame.getRandomGamesPlayed(), 1);
});

test("a Random Game whose launch fails does not count, nor a later start of that table by hand", async () => {
    const { fake, randomGame } = createRandomGameOn({ wheel: [MEDIEVAL_MADNESS, ATTACK_FROM_MARS] });

    await randomGame.launch();
    const [launched] = fake.launches();
    fake.launchError(launched);
    playFor(fake, launched, 60);

    assert.equal(randomGame.getRandomGamesPlayed(), 0);
});

test("a table started by hand does not count as a Random Game", () => {
    const { fake, randomGame } = createRandomGameOn({ wheel: [MEDIEVAL_MADNESS, ATTACK_FROM_MARS] });

    playFor(fake, MEDIEVAL_MADNESS, 60);

    assert.equal(randomGame.getRandomGamesPlayed(), 0);
});

test("the Random Games played continue from the active Profile's saved count", async () => {
    const { fake, randomGame } = createRandomGameOn({
        wheel: [MEDIEVAL_MADNESS, ATTACK_FROM_MARS],
        skipAnimation: true,
        seed: fake => seedProfile(fake, "guest", { plays: GUEST_PLAYS, randomGames: 9 }),
    });

    await randomGame.launch();
    playFor(fake, fake.launches()[0], 60);

    assert.equal(randomGame.getRandomGamesPlayed(), 10);
    assert.equal(JSON.parse(fake.readFile(profileFile("guest"))).randomGames, 10);
    assert.deepEqual([...fake.writtenSettingsKeys()], []);
});

test("each Profile has its own Random Games played", async () => {
    const { fake, profileStore, randomGame } = createRandomGameOn({
        wheel: [MEDIEVAL_MADNESS, ATTACK_FROM_MARS],
        skipAnimation: true,
        seed: fake => seedProfile(fake, "Alice", { randomGames: 4 }),
    });

    await randomGame.launch();
    playFor(fake, fake.launches()[0], 60);
    assert.equal(randomGame.getRandomGamesPlayed(), 1, "Guest's first Random Game");

    profileStore.switchTo("Alice");
    assert.equal(randomGame.getRandomGamesPlayed(), 4, "Alice's own count");
    await randomGame.launch();
    playFor(fake, fake.launches()[1], 60);

    assert.equal(randomGame.getRandomGamesPlayed(), 5);
    assert.equal(JSON.parse(fake.readFile(profileFile("guest"))).randomGames, 1);
});

test("the Random Game avoids the active Profile's Last Played Table, not another Profile's", async () => {
    const { fake, profileStore, randomGame } = createRandomGameOn({
        wheel: [THEATRE_OF_MAGIC, MEDIEVAL_MADNESS, ATTACK_FROM_MARS],
        // Alice last played Attack from Mars, after Guest's last play.
        seed: fake => seedProfile(fake, "Alice", {
            plays: {
                [MEDIEVAL_MADNESS.configId]: { count: 1, seconds: 60, lastPlayed: "2026-01-01T20:00:00" },
                [ATTACK_FROM_MARS.configId]: { count: 1, seconds: 60, lastPlayed: "2026-09-10T20:00:00" },
            },
        }),
    });
    profileStore.switchTo("Alice");

    const launched = await launchedConfigIds(fake, randomGame);

    assert.deepEqual([...launched].sort(), [MEDIEVAL_MADNESS.configId, THEATRE_OF_MAGIC.configId]);
});
